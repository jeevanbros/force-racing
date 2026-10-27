#!/usr/bin/env python3
"""Read-only public-site archiver. Run: python3 source/crawl.py [--verify-only].

Uses the standard library; Pillow is optional for image dimensions. All writes
are confined to source/ and the two explicitly owned docs files. Originals are
never rewritten. GET only: no forms, browser actions, uploads, or deployment.
"""
from __future__ import annotations

import argparse
from collections import Counter, deque
from datetime import datetime, timezone
import hashlib
import html
from html.parser import HTMLParser
import io
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urldefrag, urljoin, urlsplit, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
DOCS = ROOT.parent / 'docs'
START = 'https://www.forceracing.in/'
HOSTS = {'www.forceracing.in', 'forceracing.in'}
ASSET_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif',
             '.css', '.js', '.mjs', '.pdf', '.woff', '.woff2', '.ttf', '.otf',
             '.eot', '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.json'}
URL_ATTR = re.compile(r'''(\b(?:href|src|poster|data|action|background|xlink:href)\s*=\s*)(["'])(.*?)\2''', re.I | re.S)
CSS_URL = re.compile(r'''url\(\s*(["']?)(.*?)\1\s*\)|@import\s+(["'])(.*?)\3''', re.I | re.S)
BLOCKS = {'p', 'div', 'section', 'article', 'main', 'header', 'footer', 'nav',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'tr', 'table',
          'br', 'hr', 'address', 'blockquote', 'dt', 'dd', 'figure', 'figcaption'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def normalize(value, base=START):
    value = html.unescape(value).strip()
    if not value or value.startswith(('#', 'data:', 'javascript:', 'blob:')):
        return None
    u = urlsplit(urljoin(base, value))
    if u.scheme not in ('https', 'http'):
        return None
    return urlunsplit((u.scheme.lower(), u.netloc.lower(), quote(u.path or '/', safe="/%:@!$&'()*+,;=-._~"), u.query, ''))


def internal(url):
    return urlsplit(url).hostname in HOSTS


def safe_part(part):
    return re.sub(r'[^\w.()@+ -]', '_', unquote(part)) or '_'


def paths(url, mime=''):
    u = urlsplit(url)
    parts = [safe_part(p) for p in u.path.split('/') if p and unquote(p) not in ('.', '..')]
    if not parts or u.path.endswith('/'):
        parts.append('index.html')
    path = Path(*parts)
    if not path.suffix and mime:
        path = path.with_suffix('.html' if 'html' in mime else (mimetypes.guess_extension(mime) or ''))
    if u.query:
        path = path.with_name(path.stem + '__q_' + digest(u.query.encode())[:12] + path.suffix)
    original = ROOT / 'originals' / safe_part(u.netloc) / path
    # Keep root and /index.html byte captures separate even though both preview as index.html.
    if u.path == '/':
        original = original.with_name('__root__' + original.suffix)
    mirror = ROOT / path if internal(url) else ROOT / '_external' / safe_part(u.netloc) / path
    if internal(url) and parts[0] in {'originals', '_archive', '_external', 'crawl.py', 'manifest.json', 'content.json', 'verification.json'}:
        mirror = ROOT / '_remote' / path
    return original, mirror


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs, self.links, self.images, self.metas, self.headings, self.tables = [], [], [], [], [], []
        self.title, self.base, self.lang = '', None, None
        self.text, self.hidden = [], []
        self.in_title = False
        self.heading = None
        self.anchor = None
        self.table = None
        self.row = None
        self.cell = None
        self.forms = []
        self.form = None

    def ref(self, value, kind, tag, attr):
        if value:
            self.refs.append({'raw': value, 'kind': kind, 'tag': tag, 'attribute': attr})

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag == 'base' and a.get('href'):
            self.base = a['href']
        if tag == 'meta':
            self.metas.append(a)
        if tag == 'title':
            self.in_title = True
        if tag in ('head', 'script', 'style', 'template'):
            self.hidden.append(tag)
        if not self.hidden:
            if tag in BLOCKS:
                self.text.append('\n')
            if tag in ('td', 'th'):
                self.text.append(' | ')
            if re.fullmatch('h[1-6]', tag):
                self.heading = {'level': int(tag[1]), 'text': ''}
            if tag == 'table':
                self.table = []
            if tag == 'tr':
                self.row = []
            if tag in ('td', 'th'):
                self.cell = ''
        if tag == 'a':
            self.anchor = {'href': a.get('href', ''), 'text': '', 'attributes': a}
            self.links.append(self.anchor)
            self.ref(a.get('href'), 'navigation', tag, 'href')
        if tag == 'form':
            self.links.append({'href': a.get('action', ''), 'text': '[form action; not submitted]', 'attributes': a})
            self.form = {'attributes': a, 'fields': []}
            self.forms.append(self.form)
        if self.form is not None and tag in ('input', 'textarea', 'select', 'button'):
            self.form['fields'].append(dict(tag=tag, **a))
        if tag == 'link':
            rel = a.get('rel', '').lower().split()
            kind = 'asset' if set(rel) & {'stylesheet', 'icon', 'apple-touch-icon', 'preload', 'modulepreload', 'manifest', 'shortcut'} else 'reference'
            if a.get('as') in ('document',):
                kind = 'reference'
            self.ref(a.get('href'), kind, tag, 'href')
        if tag in ('img', 'script', 'source', 'video', 'audio', 'track', 'embed', 'input'):
            self.ref(a.get('src'), 'asset', tag, 'src')
        if tag == 'object':
            self.ref(a.get('data'), 'asset', tag, 'data')
        if tag in ('image', 'use'):
            self.ref(a.get('href') or a.get('xlink:href'), 'asset', tag, 'href')
        if tag == 'iframe':
            self.ref(a.get('src'), 'embed', tag, 'src')
        self.ref(a.get('poster'), 'asset', tag, 'poster')
        for attr in ('srcset', 'imagesrcset'):
            for item in a.get(attr, '').split(','):
                bits = item.strip().split()
                if bits:
                    self.ref(bits[0], 'asset', tag, attr)
        if a.get('style'):
            self.refs.extend(css_refs(a['style']))
        if tag == 'img':
            self.images.append(a)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if self.hidden:
            if tag == self.hidden[-1]:
                self.hidden.pop()
            return
        if self.heading and re.fullmatch('h[1-6]', tag):
            self.heading['text'] = ' '.join(self.heading['text'].split())
            self.headings.append(self.heading)
            self.heading = None
        if tag == 'a':
            self.anchor = None
        if tag == 'form':
            self.form = None
        if tag in ('td', 'th') and self.cell is not None:
            if self.row is not None:
                self.row.append(' '.join(self.cell.split()))
            self.cell = None
        if tag == 'tr' and self.row is not None:
            if self.table is not None:
                self.table.append(self.row)
            self.row = None
        if tag == 'table' and self.table is not None:
            self.tables.append(self.table)
            self.table = None
        if tag in BLOCKS:
            self.text.append('\n')

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.hidden:
            return
        self.text.append(data)
        if self.heading is not None:
            self.heading['text'] += data
        if self.anchor is not None:
            self.anchor['text'] += data
        if self.cell is not None:
            self.cell += data

    def handle_comment(self, data):
        pass

    def readable(self):
        return '\n'.join(line for raw in ''.join(self.text).splitlines() if (line := ' '.join(raw.split())))


def css_refs(text):
    # Comments are not active dependencies.
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return [{'raw': (m.group(2) if m.group(2) is not None else m.group(4)).strip(),
             'kind': 'asset', 'tag': 'css', 'attribute': 'url'} for m in CSS_URL.finditer(text)]


def discover(data, url, mime, charset='utf-8'):
    text = data.decode(charset, errors='replace')
    refs, page = [], None
    suffix = Path(urlsplit(url).path).suffix.lower()
    if 'html' in mime or suffix in ('.html', '.htm'):
        page = Page()
        page.feed(text)
        page.close()
        refs.extend(page.refs)
        # Inline style blocks and static inline script dependencies.
        for style in re.findall(r'<style\b[^>]*>(.*?)</style\s*>', text, re.I | re.S):
            refs.extend(css_refs(style))
        for script in re.findall(r'<script\b[^>]*>(.*?)</script\s*>', text, re.I | re.S):
            refs.extend(js_refs(script))
    elif 'css' in mime or suffix == '.css':
        refs = css_refs(text)
    elif 'javascript' in mime or suffix in ('.js', '.mjs'):
        refs = js_refs(text)
    elif 'xml' in mime or suffix in ('.xml', '.svg'):
        try:
            tree = ET.fromstring(data)
            for node in tree.iter():
                name = node.tag.split('}')[-1]
                if name in ('loc', 'link') and node.text and node.text.strip().startswith(('http:', 'https:')):
                    refs.append({'raw': node.text.strip(), 'kind': 'navigation', 'tag': 'sitemap', 'attribute': 'loc'})
                for key, value in node.attrib.items():
                    if key.split('}')[-1] in ('href', 'src'):
                        refs.append({'raw': value, 'kind': 'asset', 'tag': name, 'attribute': key})
        except ET.ParseError:
            pass
    return refs, page


def js_refs(text):
    values = re.findall(r'''(?:import\s*(?:[^;]*?\sfrom\s*)?|export\s+[^;]*?\sfrom\s*|(?:import|require|new\s+URL)\s*\(\s*)["']([^"']+)["']''', text)
    # Static path literals only; never execute downloaded JavaScript.
    values += re.findall(r'''["']([^"'\s]+\.(?:png|jpe?g|webp|svg|gif|css|js|mjs|pdf|woff2?|ttf|mp4)(?:\?[^"']*)?)["']''', text, re.I)
    return [{'raw': v, 'kind': 'asset', 'tag': 'script', 'attribute': 'static dependency'} for v in values]


def image_info(data, mime):
    if not mime.startswith('image/'):
        return None
    try:
        from PIL import Image
        with Image.open(io.BytesIO(data)) as img:
            return {'width': img.width, 'height': img.height, 'format': img.format, 'mode': img.mode}
    except ImportError:
        return {'note': 'Pillow unavailable; dimensions not measured'}
    except Exception as exc:
        if mime == 'image/svg+xml':
            try:
                svg = ET.fromstring(data)
                return {k: svg.get(k) for k in ('width', 'height', 'viewBox') if svg.get(k)}
            except ET.ParseError:
                pass
        return {'note': str(exc)}


class Redirects(HTTPRedirectHandler):
    def __init__(self):
        super().__init__()
        self.chain = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.chain.append({'from': req.full_url, 'status': code, 'to': newurl})
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url):
    redirects = Redirects()
    opener = build_opener(redirects)
    record = {'url': url, 'fetched_at': datetime.now(timezone.utc).isoformat(), 'redirects': redirects.chain}
    for attempt in range(3):
        try:
            with opener.open(Request(url, headers={'User-Agent': 'ForceRacingLocalArchive/1.0 (read-only public archive)', 'Accept-Encoding': 'identity'}), timeout=40) as response:
                data = response.read()
                record.update(status=response.status, final_url=response.url,
                              content_type=response.headers.get_content_type(),
                              charset=response.headers.get_content_charset() or 'utf-8',
                              headers=dict(response.headers.items()), bytes=len(data), sha256=digest(data))
                return record, data
        except HTTPError as exc:
            data = exc.read()
            record.update(status=exc.code, final_url=exc.url, error=str(exc),
                          content_type=exc.headers.get_content_type(),
                          headers=dict(exc.headers.items()), bytes=len(data), sha256=digest(data))
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                return record, data
        except (URLError, TimeoutError, OSError) as exc:
            record.update(status=None, error=str(exc), bytes=0)
            if attempt == 2:
                return record, None
        time.sleep(attempt + 1)
    raise RuntimeError('unreachable')


def eligible(ref, base):
    url = normalize(ref['raw'], base)
    if not url:
        return None
    if internal(url):
        return url
    # Archive rendering dependencies, never external navigation or map documents.
    if ref['kind'] == 'asset' or (ref['kind'] == 'navigation' and Path(urlsplit(url).path).suffix.lower() in ASSET_EXT):
        return url
    return None


def resolved_refs(refs, base):
    return [dict(ref, url=normalize(ref['raw'], base), fetch=eligible(ref, base)) for ref in refs]


def local_reference(raw, base, owner, resources):
    url = normalize(raw, base)
    record = resources.get(url)
    if not record or record.get('status') != 200 or not record.get('mirror_path'):
        return raw
    dest = ROOT / record['mirror_path']
    rel = quote(os.path.relpath(dest, owner.parent).replace(os.sep, '/'), safe='/._-')
    fragment = urlsplit(html.unescape(raw)).fragment
    return rel + ('#' + fragment if fragment else '')


def rewrite_css(text, base, owner, resources):
    def sub(match):
        raw = match.group(2) if match.group(2) is not None else match.group(4)
        new = local_reference(raw.strip(), base, owner, resources)
        return match.group(0).replace(raw, new, 1)
    return CSS_URL.sub(sub, text)


def build_mirrors(resources):
    for url, record in resources.items():
        if record.get('status') != 200 or not record.get('original_path'):
            continue
        data = (ROOT / record['original_path']).read_bytes()
        owner = ROOT / record['mirror_path']
        mime = record['content_type']
        base = record.get('base_url', record['final_url'])
        if any(token in mime for token in ('html', 'css', 'javascript')):
            text = data.decode(record.get('charset', 'utf-8'), 'replace')
            if 'html' in mime:
                def attr(match):
                    raw = html.unescape(match.group(3))
                    new = local_reference(raw, base, owner, resources)
                    return match.group(1) + match.group(2) + html.escape(new, quote=True) + match.group(2)
                text = URL_ATTR.sub(attr, text)
                def srcset(match):
                    items = []
                    for item in html.unescape(match.group(3)).split(','):
                        bits = item.strip().split()
                        if bits:
                            bits[0] = local_reference(bits[0], base, owner, resources)
                            items.append(' '.join(bits))
                    return match.group(1) + match.group(2) + html.escape(', '.join(items), quote=True) + match.group(2)
                text = re.sub(r'''(\b(?:srcset|imagesrcset)\s*=\s*)(["'])(.*?)\2''', srcset, text, flags=re.I | re.S)
                text = re.sub(r'<base\b[^>]*>', '', text, flags=re.I)
            if 'html' in mime or 'css' in mime:
                text = rewrite_css(text, base, owner, resources)
            if 'javascript' in mime:
                for ref in record.get('references', []):
                    text = text.replace(ref['raw'], local_reference(ref['raw'], base, owner, resources))
            data = text.encode('utf-8')
        owner.parent.mkdir(parents=True, exist_ok=True)
        owner.write_bytes(data)
        record['mirror_sha256'] = digest(data)


def cell(value):
    return str(value if value is not None else '—').replace('|', '\\|').replace('\n', ' ')


def write_content(pages):
    lines = ['# Readable source content', '', 'Extracted from archived original HTML. Text preserves source wording, including errors; navigation and footers are retained on each page. Image-only text is not transcribed or inferred.', '']
    for page in pages:
        lines += ['## ' + page['title'], '', 'Source: ' + page['url'], '',
                  'Original: `source/' + page['original_path'] + '`', '', '### Metadata', '',
                  '- Language: ' + str(page['lang']), '- Title: ' + page['title']]
        for meta in page['metadata']:
            lines.append('- ' + json.dumps(meta, ensure_ascii=False))
        lines += ['', '### Readable page text', '', page['text'], '']
        if page['tables']:
            lines += ['### Source tables', '']
            for table in page['tables']:
                for row in table:
                    lines.append(' | '.join(row))
                lines.append('')
        if page.get('forms'):
            lines += ['### Form metadata (not submitted)', '', '```json', json.dumps(page['forms'], indent=2, ensure_ascii=False), '```', '']
        lines += ['### All links and form targets', '']
        for link in page['links']:
            label = ' '.join(link['text'].split()) or '[icon/image link]'
            lines.append('- ' + label + ': ' + link['url'])
        lines += ['', '### Images (source order)', '']
        for img in page['images']:
            lines.append('- ' + img.get('url', '') + ' — alt: ' + repr(img.get('alt', '')))
        lines.append('')
    (DOCS / 'source-content.md').write_text('\n'.join(lines), encoding='utf-8')


def extract_saved_content(manifest):
    pages = []
    for record in manifest['resources']:
        if record.get('status') != 200 or 'html' not in record.get('content_type', ''):
            continue
        original = ROOT / record['original_path']
        if not original.is_file():
            continue
        _, page = discover(original.read_bytes(), record['final_url'], record['content_type'], record.get('charset', 'utf-8'))
        base = record.get('base_url', record['final_url'])
        for link in page.links:
            link['url'] = urljoin(base, link['href'])
        for img in page.images:
            img['url'] = urljoin(base, img.get('src', ''))
        pages.append({'url': record['url'], 'title': ' '.join(page.title.split()), 'lang': page.lang,
                      'metadata': page.metas, 'headings': page.headings, 'tables': page.tables,
                      'text': page.readable(), 'links': page.links, 'images': page.images, 'forms': page.forms,
                      'original_path': record['original_path']})
    (ROOT / 'content.json').write_text(json.dumps(pages, indent=2, ensure_ascii=False) + '\n')
    write_content(pages)
    facts = {'vehicles': [], 'team': [], 'partner_images': [], 'external_links': []}
    # The current site's cards have no nested divs. Preserve all details verbatim.
    for page in pages:
        name = Path(urlsplit(page['url']).path).name
        if name in ('cars.html', 'team.html'):
            text = (ROOT / page['original_path']).read_bytes().decode('utf-8', 'replace')
            klass, key = ('box', 'vehicles') if name == 'cars.html' else ('boxx', 'team')
            for match in re.finditer(r'<div\s+class=["\']' + klass + r'["\']\s*>(.*?)</div\s*>', text, re.I | re.S):
                fragment = Page()
                fragment.feed(match.group(1))
                parts = fragment.readable().splitlines()
                facts[key].append({'name': parts[0], 'details': parts[1:],
                                   'images': [urljoin(page['url'], i.get('src', '')) for i in fragment.images],
                                   'source': page['url']})
        if page['url'] == START:
            text = (ROOT / page['original_path']).read_bytes().decode('utf-8', 'replace')
            partner_section = re.search(r'<section\s+class=["\']partners["\']>(.*?)</section\s*>', text, re.I | re.S)
            if partner_section:
                fragment = Page()
                fragment.feed(partner_section.group(1))
                facts['partner_images'] = [urljoin(page['url'], i['src']) for i in fragment.images]
        for link in page['links']:
            if urlsplit(link['url']).scheme in ('http', 'https') and not internal(link['url']) and link['url'] not in facts['external_links']:
                facts['external_links'].append(link['url'])
    (ROOT / 'facts.json').write_text(json.dumps(facts, indent=2, ensure_ascii=False) + '\n')


def verify(manifest):
    resources = {r['url']: r for r in manifest['resources']}
    missing, mismatches, unvisited, dangling, mirror_missing = [], [], [], [], []
    broken_mirror_refs, remote_mirror_assets = [], []
    local_references_checked = 0
    page_urls, images = [], []
    for url, record in resources.items():
        if record.get('original_path'):
            path = ROOT / record['original_path']
            if not path.is_file():
                missing.append(str(path.relative_to(ROOT)))
                continue
            data = path.read_bytes()
            if digest(data) != record['sha256']:
                mismatches.append(record['original_path'])
        else:
            continue
        if record.get('status') != 200:
            continue
        mirror = ROOT / record['mirror_path']
        if not mirror.is_file():
            mirror_missing.append(record['mirror_path'])
        elif digest(mirror.read_bytes()) != record['mirror_sha256']:
            mismatches.append(record['mirror_path'])
        if mirror.is_file():
            mirror_base = 'http://archive.local/' + quote(record['mirror_path'], safe='/')
            mirror_refs, _ = discover(mirror.read_bytes(), mirror_base, record['content_type'], 'utf-8')
            for ref in mirror_refs:
                if not ref['raw'] or ref['raw'].startswith(('#', 'data:', 'javascript:')):
                    continue
                target = urlsplit(urljoin(mirror_base, html.unescape(ref['raw'])))
                if target.netloc == 'archive.local':
                    local_references_checked += 1
                    target_path = ROOT / unquote(target.path.lstrip('/'))
                    if not target_path.is_file() and not (target_path / 'index.html').is_file():
                        broken_mirror_refs.append({'from': record['mirror_path'], 'to': ref['raw']})
                elif ref['kind'] == 'asset' and target.scheme in ('http', 'https'):
                    remote_mirror_assets.append({'from': record['mirror_path'], 'to': ref['raw']})
        refs, page = discover(data, record['final_url'], record['content_type'], record.get('charset', 'utf-8'))
        base = urljoin(record['final_url'], page.base) if page and page.base else record['final_url']
        for ref in refs:
            target = eligible(ref, base)
            if target and target not in resources:
                unvisited.append({'from': url, 'to': target})
            # Fragment IDs only apply to HTML documents, not SVG view fragments.
            if internal(target or '') and '#' in ref['raw']:
                target_record = resources.get(target, {})
                if target_record.get('status') == 200 and 'html' in target_record.get('content_type', ''):
                    target_text = (ROOT / target_record['original_path']).read_text(errors='replace')
                    fragment = unquote(urlsplit(ref['raw']).fragment)
                    if fragment and not re.search(r'''(?:id|name)\s*=\s*["']''' + re.escape(fragment) + r'''["']''', target_text):
                        dangling.append({'from': url, 'to': target + '#' + fragment})
        if page:
            page_urls.append(url)
        if record.get('image'):
            images.append(url)
    failures = [dict(url=r['url'], status=r.get('status'), error=r.get('error')) for r in resources.values() if r.get('status') != 200]
    result = {'verified_at': datetime.now(timezone.utc).isoformat(), 'original_hashes_checked': sum(bool(r.get('original_path')) for r in resources.values()),
              'missing_original_files': missing, 'hash_mismatches': mismatches,
              'unvisited_eligible_references': unvisited, 'missing_mirror_files': mirror_missing,
              'dangling_fragments': dangling, 'unavailable_resources': failures,
              'local_references_checked': local_references_checked,
              'broken_mirror_references': broken_mirror_refs,
              'remaining_remote_rendering_assets': remote_mirror_assets,
              'html_urls': page_urls, 'image_count': len(images),
              'graph_complete': not unvisited, 'archive_integrity_pass': not (missing or mismatches or mirror_missing or broken_mirror_refs)}
    (ROOT / 'verification.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    return result


def write_inventory(manifest, audit):
    resources = manifest['resources']
    counts = Counter(r.get('content_type', 'unknown') for r in resources if r.get('status') == 200)
    lines = ['# Force Racing source inventory', '', 'Crawl started: ' + manifest['started_at'], 'Crawl finished: ' + manifest['finished_at'], '',
             'Seed: https://www.forceracing.in/ plus robots.txt and sitemap.xml. Same-domain navigation is followed to exhaustion; externally hosted rendering dependencies are archived recursively. External social/profile/map pages and form submissions are recorded but not requested. Only public HTTP GETs were made.', '',
             '## Reproduce and inspect', '', '```sh', 'python3 source/crawl.py', 'python3 source/crawl.py --verify-only', 'python3 -m http.server 8080 --directory source', '```', '',
             'Open http://localhost:8080/ for the local mirror. `source/originals/<host>/` holds unmodified response bodies; `source/index.html` and sibling files form a preview with downloaded dependencies rewritten to local paths. Query variants use deterministic `__q_<hash>` names. `source/_archive/preexisting-index.html` preserves the starting file. External maps and social links still need internet; a local mirror is not a form receiving service.', '',
             '`source/manifest.json` records every requested URL, response status and headers, redirects, original/mirror paths and SHA-256 hashes, referrers and dependencies. `source/content.json` contains per-page metadata, headings, tables, links, images and full readable text. [source-content.md](source-content.md) provides the readable extraction. `source/verification.json` records an independent reparse of saved originals and file-hash checks.', '',
             '## Coverage and integrity', '',
             f"- Requested URLs: {len(resources)}; HTTP 200: {sum(r.get('status') == 200 for r in resources)}; unavailable: {len(audit['unavailable_resources'])}.",
             f"- HTML URLs: {len(audit['html_urls'])}; image resources: {audit['image_count']}.",
             '- Successful response types: ' + ', '.join(f'{k}: {v}' for k, v in sorted(counts.items())),
             f"- Eligible discovered references left unvisited: {len(audit['unvisited_eligible_references'])}.",
             f"- Missing original/mirror files: {len(audit['missing_original_files'])}/{len(audit['missing_mirror_files'])}; hash mismatches: {len(audit['hash_mismatches'])}; dangling HTML fragments: {len(audit['dangling_fragments'])}.",
             f"- Local mirror references checked: {audit['local_references_checked']}; broken: {len(audit['broken_mirror_references'])}; rendering assets still pointing to remote HTTP URLs: {len(audit['remaining_remote_rendering_assets'])}.",
             '- Completeness means reachable links and declared/static asset dependencies, plus the public sitemap; it cannot establish the absence of unlinked server files or JavaScript-generated URLs. Downloaded JavaScript is inspected statically, never executed. Raster dimensions use the existing Pillow package if available. All site claims, dates, specifications, affiliations and names below describe the archived source and are not independently verified.', '',
             '## Unavailable resources', '']
    if audit['unavailable_resources']:
        for item in audit['unavailable_resources']:
            lines.append(f"- {item['url']} — {item['status']}: {item.get('error', '')}")
    else:
        lines.append('None.')
    lines += ['', '## HTML pages', '', '| URL | Title | Original |', '| --- | --- | --- |']
    pages = json.loads((ROOT / 'content.json').read_text())
    for p in pages:
        lines.append('| ' + ' | '.join(map(cell, [p['url'], p['title'], 'source/' + p['original_path']])) + ' |')
    facts = json.loads((ROOT / 'facts.json').read_text())
    lines += ['', '## All vehicle records', '', 'Source: https://www.forceracing.in/cars.html. The page provides names, event/year labels and photographs only. It publishes no engine, power, mass, dimensions, suspension, chassis, drivetrain, acceleration or other technical specification values. No linked specification sheets or PDFs were discovered.', '',
              '| Vehicle | All source event/year labels | Photograph |', '| --- | --- | --- |']
    for item in facts['vehicles']:
        lines.append('| ' + ' | '.join(map(cell, [item['name'], '; '.join(item['details']), '; '.join(item['images'])])) + ' |')
    lines += ['', '## All team records', '', 'Source: https://www.forceracing.in/team.html. Every member uses the same `images/user.jpg` silhouette; there are no individual headshots. The homepage describes a 60-member team while this page lists 15 names.', '',
              '| Name | All source role/subsystem labels |', '| --- | --- |']
    for item in facts['team']:
        lines.append('| ' + ' | '.join(map(cell, [item['name'], '; '.join(item['details'])])) + ' |')
    lines += ['', '## Social links', ''] + ['- ' + url for url in facts['external_links']]
    lines += ['', '## Image dimensions and provenance', '', '| Original URL | Dimensions | Bytes | Local preview asset |', '| --- | --- | --- | --- |']
    for r in resources:
        if r.get('image'):
            img = r['image']
            dims = f"{img.get('width', '?')} × {img.get('height', '?')}"
            lines.append('| ' + ' | '.join(map(cell, [r['url'], dims, r['bytes'], 'source/' + r['mirror_path']])) + ' |')
    lines += ['', '## All requested URLs, status and original SHA-256', '', '| URL | Status | Bytes | SHA-256 |', '| --- | --- | --- | --- |']
    for r in resources:
        lines.append('| ' + ' | '.join(map(cell, [r['url'], r.get('status'), r.get('bytes'), r.get('sha256')])) + ' |')
    findings = ROOT / '_archive' / 'findings.md'
    if findings.exists():
        lines += ['', findings.read_text()]
    (DOCS / 'SOURCE-INVENTORY.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def crawl():
    started = datetime.now(timezone.utc).isoformat()
    DOCS.mkdir(exist_ok=True)
    if (ROOT / 'index.html').exists() and not (ROOT / '_archive' / 'preexisting-index.html').exists():
        (ROOT / '_archive').mkdir(exist_ok=True)
        shutil.copy2(ROOT / 'index.html', ROOT / '_archive' / 'preexisting-index.html')
    pending = deque([START, urljoin(START, 'robots.txt'), urljoin(START, 'sitemap.xml')])
    queued = set(pending)
    resources = {}
    incoming = {}
    while pending:
        url = pending.popleft()
        record, data = fetch(url)
        resources[url] = record
        print(f"{record.get('status')} {url} ({record.get('bytes', 0)} bytes)", flush=True)
        if data is not None:
            original, mirror = paths(url, record['content_type'])
            if record.get('status') != 200:
                original = ROOT / '_archive' / 'errors' / (digest(url.encode())[:16] + '.body')
            original.parent.mkdir(parents=True, exist_ok=True)
            original.write_bytes(data)
            record['original_path'] = str(original.relative_to(ROOT))
        if record.get('status') != 200:
            continue
        record['mirror_path'] = str(mirror.relative_to(ROOT))
        img = image_info(data, record['content_type'])
        if img:
            record['image'] = img
        refs, page = discover(data, record['final_url'], record['content_type'], record.get('charset', 'utf-8'))
        if url.endswith('/robots.txt'):
            refs += [{'raw': m.group(1).strip(), 'kind': 'navigation', 'tag': 'robots', 'attribute': 'Sitemap'} for m in re.finditer(r'^Sitemap:\s*(.+)$', data.decode('utf-8', 'replace'), re.M | re.I)]
        base = urljoin(record['final_url'], page.base) if page and page.base else record['final_url']
        record['base_url'] = base
        record['references'] = resolved_refs(refs, base)
        for ref in record['references']:
            target = ref['fetch']
            if target:
                incoming.setdefault(target, set()).add(url)
                if target not in queued:
                    queued.add(target)
                    pending.append(target)
    for url, record in resources.items():
        record['referrers'] = sorted(incoming.get(url, set()))
    build_mirrors(resources)
    manifest = {'started_at': started, 'finished_at': datetime.now(timezone.utc).isoformat(),
                'seed': START, 'resources': list(resources.values())}
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true', help='reparse saved originals and check hashes without network requests')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'manifest.json').read_text()) if args.verify_only else crawl()
    extract_saved_content(manifest)
    audit = verify(manifest)
    write_inventory(manifest, audit)
    print(json.dumps(audit, indent=2))
    return 0 if audit['archive_integrity_pass'] and audit['graph_complete'] else 1


if __name__ == '__main__':
    sys.exit(main())
