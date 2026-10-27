#!/usr/bin/env python3
"""Galeport demo server: one port per client, serving site/ plus named extra folders.

`python3 -m http.server` ignores Range requests: it answers 200 with the whole
file where a browser expects 206 with a slice. A video still plays, but the
scrubber does nothing, because seeking is exactly what Range is for. The film
gets scrubbed in front of a client, so this handles it.

Everything a demo needs is on the SAME port, so nobody edits the address bar in front of
a client:
  /                  site/                 the website
  /__present.html    tools/present.html    theme + phone frame around the site
  /pitch/            pitch/public/         deck, proposal, pricing (when present)
  /<name>/           any --mount           e.g. /film-player/
Nothing else in the client folder is reachable.

Usage:  python3 serve.py <port> <bind> <site-dir> [--present FILE] [--mount /prefix/=DIR ...]
"""
import functools
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RANGE = re.compile(r"^bytes=(\d*)-(\d*)$")


class _Slice:
    """A file narrowed to one byte range, for shutil.copyfileobj."""

    def __init__(self, fh, length):
        self.fh = fh
        self.left = length

    def read(self, n=-1):
        if self.left <= 0:
            return b""
        if n is None or n < 0:
            n = self.left
        chunk = self.fh.read(min(n, self.left))
        self.left -= len(chunk)
        return chunk

    def close(self):
        self.fh.close()


PRESENT = None
MOUNTS = []          # [("/pitch/", "/abs/pitch/public"), ...]


class RangeHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if PRESENT and clean == "/__present.html":
            return PRESENT
        for prefix, folder in MOUNTS:
            if clean == prefix.rstrip("/") or clean.startswith(prefix):
                site = self.directory
                self.directory = folder
                try:
                    return super().translate_path("/" + path[len(prefix):] if clean.startswith(prefix) else "/")
                finally:
                    self.directory = site
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        header = self.headers.get("Range")
        if not header:
            return super().send_head()
        match = RANGE.match(header.strip())
        path = self.translate_path(self.path)
        if not match or os.path.isdir(path):
            return super().send_head()
        try:
            fh = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        size = os.fstat(fh.fileno()).st_size
        first, last = match.group(1), match.group(2)
        if first == "":                       # bytes=-N, the final N bytes
            n = int(last) if last else 0
            start, end = max(0, size - n), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            fh.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        fh.seek(start)
        return _Slice(fh, end - start + 1)

    def log_message(self, *args):
        pass                                   # the preview runs silent


def main():
    global PRESENT
    args = sys.argv[1:]
    if len(args) < 3:
        sys.exit("usage: serve.py <port> <bind> <site-dir> [--present FILE] [--mount /prefix/=DIR ...]")
    port, bind, directory = int(args[0]), args[1], args[2]
    rest = args[3:]
    while rest:
        flag, value, rest = rest[0], rest[1], rest[2:]
        if flag == "--present" and os.path.isfile(value):
            PRESENT = os.path.abspath(value)
        elif flag == "--mount":
            prefix, folder = value.split("=", 1)
            if os.path.isdir(folder):
                MOUNTS.append(("/" + prefix.strip("/") + "/", os.path.abspath(folder)))
    handler = functools.partial(RangeHandler, directory=directory)
    ThreadingHTTPServer((bind, port), handler).serve_forever()


if __name__ == "__main__":
    main()
