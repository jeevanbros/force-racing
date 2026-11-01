"""Regenerate the static pages: python3 site/design/build.py. No build step is needed to serve them."""
from pathlib import Path
from html import escape as e
import re,json
ROOT=Path(__file__).resolve().parents[1]
config=(ROOT/'campaign-config.js').read_text(encoding='utf-8')
CAMPAIGN=json.loads(config.split('Object.freeze(',1)[1].rsplit(')',1)[0])
def cfg(key): return CAMPAIGN[key]
URL=cfg('registrationUrl')

ARROW='<svg class="icon-arrow" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"/></svg>'
ARROW_DOWN='<svg class="icon-arrow-down" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v11M3.5 9.5l4.5 4.5 4.5-4.5"/></svg>'
MAIL_ICON='<svg class="icon-mail" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px;margin-right:6px;" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
PHONE_ICON='<svg class="icon-phone" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px;margin-right:6px;" aria-hidden="true"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'
CALLER_ICON_SVG = '<svg class="fr-caller-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'

def caller(name, phone, role='', variant='inline', cls=''):
 digits = re.sub(r'\D', '', phone)
 tel = '+' + digits
 formatted = f'+{digits[:2]} {digits[2:7]} {digits[7:]}' if len(digits) == 12 and digits.startswith('91') else phone
 label = f'Call {name} · {role}' if role else f'Call {name}'
 extra_cls = f' {cls}' if cls else ''
 if variant == 'card':
  role_html = f'<span class="fr-caller-role muted">{e(role)}</span>' if role else ''
  return f'<div class="fr-caller-card{extra_cls}"><div class="fr-caller-card-info"><span class="fr-caller-name">{e(name)}</span>{role_html}</div><a href="tel:{tel}" class="fr-caller-btn" aria-label="{e(label)}" data-phone="{formatted}" data-fr-caller>{CALLER_ICON_SVG}<span class="fr-caller-btn-text">Call Coordinator</span></a></div>'
 return f'<a href="tel:{tel}" class="fr-caller-link{extra_cls}" aria-label="{e(label)}" data-phone="{formatted}" data-fr-caller><span class="fr-caller-name">{e(name)}</span><span class="fr-caller-icon-badge" aria-hidden="true">{CALLER_ICON_SVG}</span></a>'

THEME_META='<meta name="theme-color" content="#111212" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">'
THEME_BOOT='<script>(function(){var t=null;try{t=localStorage.getItem("force_theme")||localStorage.getItem("fr-theme")}catch(e){}var m=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches;if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else if(m){document.documentElement.setAttribute("data-theme","light")}document.documentElement.classList.add("theme-instant")})()</script>'
THEME_SETTLE='<script>addEventListener("DOMContentLoaded",function(){requestAnimationFrame(function(){requestAnimationFrame(function(){document.documentElement.classList.remove("theme-instant")})})})</script>'

def btn(href,label,secondary=False,register=False):
 return f'<a class="btn{" secondary" if secondary else ""}" href="{e(href)}"'+(' data-register target="_blank" rel="noopener noreferrer" aria-describedby="google-note"' if register else '')+f'>{label}{ARROW}</a>'

def image(name,alt,cls='',high=False,size=1440):
 from PIL import Image
 p=ROOT/'assets/images'/f'{name}-{size}.webp'
 if not p.exists():p=sorted((ROOT/'assets/images').glob(name+'-*.webp'),key=lambda x:int(x.stem.rsplit('-',1)[1]))[0]
 w,h=Image.open(p).size
 return f'<img src="assets/images/{p.name}" width="{w}" height="{h}" alt="{e(alt)}" class="{cls}" '+('fetchpriority="high"' if high else 'loading="lazy"')+' decoding="async">'

def rawimage(file,alt,cls='',high=False):
 from PIL import Image
 w,h=Image.open(ROOT/file).size
 return f'<img src="{file}" alt="{e(alt)}" width="{w}" height="{h}" class="{cls}" '+('fetchpriority="high"' if high else 'loading="lazy"')+' decoding="async">'

NAV=[('index','Home'),('cars','Cars'),('team','Team'),('recruitment','Recruitment'),('support','Support'),('contact','Contact'),('trail','Campus Trail')]
SOCIAL=[('Instagram','https://www.instagram.com/force.racing?igsh=MXI6cGRnYjA0cGE='),('LinkedIn','https://www.linkedin.com/company/force-racing/'),('YouTube','https://youtube.com/@forceracing8847?si=3Ki2roWmQvvdFWp-'),('Facebook','https://www.facebook.com/forceracingkitsw/')]

def brand():
 return '<a class="brand" href="index.html" aria-label="Force Racing home"><img src="assets/original/favicon.png" alt="" width="48" height="48"><span class="brand-name">FORCE RACING<small>KITS WARANGAL</small></span></a>'

def header(page):
 return f'''<a class="skip" href="#main">Skip to content</a><header class="site-header{' home-header' if page=='index' else ''}"><div class="wrap header-inner">{brand()}<button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false">Menu +</button><nav class="main-nav" id="main-nav" aria-label="Main navigation">{''.join(f'<a href="{slug}.html"'+(' aria-current="page"' if page==slug else '')+f'>{label}</a>' for slug,label in NAV)}</nav><div class="header-actions"><button class="theme-toggle" type="button" aria-pressed="false" aria-label="Switch to light mode" title="Switch to light mode"><span class="theme-icon" aria-hidden="true">&#9790;</span><span class="theme-text">DARK</span></button></div></div></header>'''

def footer():
 return f'''<footer class="footer"><div class="wrap"><div class="footer-callout"><div><span class="eyebrow">The next chapter is ours to build.</span><h2>BE PART OF<br>THE FORCE.</h2></div>{btn('support.html','Fuel the journey')}</div><div class="footer-grid"><div>{brand()}<p class="muted" style="margin-top:var(--gp-space-5)">Student built. Race driven.<br>Warangal, India.</p><div class="social-links">{''.join(f'<a href="{u}" target="_blank" rel="noopener noreferrer">{n}</a>' for n,u in SOCIAL)}</div></div><div><span class="footer-label">Find the workshop</span><address>Central Workshop<br>Kakatiya Institute of Technology &amp; Science<br>Warangal – 506015<br>Telangana, India</address><a href="https://www.google.com/maps/search/?api=1&amp;query=Force+Racing+India+KITS+Warangal" target="_blank" rel="noopener noreferrer">Get directions</a></div><div><span class="footer-label">Explore the team</span><nav class="footer-nav" aria-label="Footer navigation">{''.join(f'<a href="{s}.html">{n}</a>' for s,n in NAV)}</nav><a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON}team.force.racing.kitsw@gmail.com</a><br>{caller('Md. Sohail', '+918008391525', role='Team Manager')}</div></div><div class="footer-baseline"><span>© 2026 Force Racing India. All rights reserved.</span><span><a href="privacy.html">Privacy &amp; Data Notice</a> · Dream. Build. Race.</span></div></div></footer>'''

MODULES_HEAD = '''<link rel="stylesheet" href="modules/caller-dialer/caller-dialer.css">
<link rel="stylesheet" href="modules/slot-selector/slot-selector.css">
<link rel="stylesheet" href="modules/sponsorship-tiers/sponsorship-tiers.css">
<link rel="stylesheet" href="modules/campus-trail/campus-trail.css">
<script src="modules/caller-dialer/caller-dialer.js" defer></script>
<script src="modules/slot-selector/slot-selector.js" defer></script>
<script src="modules/sponsorship-tiers/sponsorship-tiers.js" defer></script>
<script src="modules/campus-trail/trail-data.js" defer></script>
<script src="modules/campus-trail/campus-trail.js" defer></script>'''

def write(slug,title,description,body,head_extra=''):
 from datetime import datetime,timezone
 active=CAMPAIGN.get('enabled') is True
 expiry=CAMPAIGN.get('expiresAt')
 if expiry:
  try:active=active and datetime.fromisoformat(expiry.replace('Z','+00:00'))>datetime.now(timezone.utc)
  except ValueError:active=False
 for field,default in [('title','F1 Sim Racing'),('date','31 October 2026'),('venue','Central Workshop'),('fee','₹99 per student'),('programme','SUMSHODHINI ’26')]:
  body=body.replace(default,e(str(CAMPAIGN[field])))
 titlewords=CAMPAIGN['title'].upper().rsplit(' ',1)
 t0=e(titlewords[0]);t0='<span class="f-char">F</span>1'+t0[2:] if t0.startswith('F1') else t0;heading=t0+(' <span>'+e(titlewords[1])+'.</span>' if len(titlewords)>1 else '')
 body=re.sub(r'(<h1[^>]*data-campaign-heading>).*?(</h1>)',lambda m:m[1]+heading+m[2],body)
 body=body.replace('class="home-hero" data-home-hero','class="home-hero" data-home-hero data-campaign-active="'+str(active).lower()+'"')
 if not active:
  body=re.sub(r'(<[a-z][^>]*data-campaign-promo)([^>]*>)',r'\1 hidden\2',body)
  body=body.replace('class="campaign-inactive wrap section" hidden','class="campaign-inactive wrap section"')
  body=body.replace('<p class="inactive-heading">','<p class="inactive-heading" role="heading" aria-level="1">')
  body=body.replace('<div data-campaign-content>','<div data-campaign-content hidden>')
  body=body.replace('href="#event"','href="cars.html"').replace('F1 Sim Racing Event <span class="hero-btn-pill">SUMSHODHINI ’26</span>','Explore Fleet')
 (ROOT/f'{slug}.html').write_text(f'''<!doctype html><html lang="en" data-campaign-active="{str(active).lower()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="{e(description)}">{THEME_META}<title>{title} | Force Racing</title><link rel="icon" href="assets/original/favicon.png"><link rel="preload" href="assets/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin>{THEME_BOOT}<link rel="stylesheet" href="styles.css">
{MODULES_HEAD}{head_extra}
<script src="app.js" defer></script><script src="forms.js" defer></script></head><body>{header(slug) if active else re.sub(r'(<a[^>]*data-campaign-promo[^>]*)(>)',r'\1 hidden\2',header(slug))}<main id="main">{body}</main>{footer() if active else re.sub(r'(<aside[^>]*data-campaign-promo[^>]*)(>)',r'\1 hidden\2',footer())}{THEME_SETTLE}</body></html>''', encoding='utf-8')

def intro(label,title,copy,num):
 return f'<section class="page-intro wrap"><span class="eyebrow">{label}</span><h1>{title}</h1><div class="page-intro-bottom"><p class="lead muted">{copy}</p></div></section>'

def google(label='Open Google Form'):
 return btn(URL,label,True,True)

def form(kind):
 reg=kind=='registration';rec=kind=='recruitment';labels={'registration':'On-Spot Registration','contact':'Send Message','sponsor':'Submit Partnership Proposal','recruitment':'Transmit Candidate Application'}
 def field(name,label,typ='text',required=True,autocomplete=None):
  ident=f'{kind}-{name}'
  return f'''<div class="field"><label for="{ident}" class="field-label-white">{label}</label><input id="{ident}" name="{name}" type="{typ}" required autocomplete="{autocomplete or name}" maxlength="{100 if name=="name" else 160 if name=="organization" else 200 if name=="email" else 30}" aria-describedby="{ident}-error"><p class="field-error" id="{ident}-error" hidden></p></div>'''

 slot_field = f'''<div class="field slot-field" style="grid-column: 1 / -1;"><div data-slot-selector></div></div>''' if reg else ''
 screenshot_field = f'''<div class="field"><label for="{kind}-screenshot" class="field-label-white">Payment Screenshot (Upload \u20b999 UPI transfer screenshot)</label><input id="{kind}-screenshot" name="screenshot" type="file" accept="image/*" required aria-describedby="{kind}-screenshot-hint"><p class="small-note" id="{kind}-screenshot-hint">Attach your UPI payment proof screenshot to verify your slot.</p><p class="field-error" id="{kind}-screenshot-error" hidden></p></div>''' if reg else ''
 tier_field = f'''<div class="field"><label for="sponsor-tier" class="field-label-white">Preferred Partnership Tier</label><select id="sponsor-tier" name="tier" class="field-select" onchange="window.selectSponsorshipTier(this.value)"><option value="Title Partner">Title Partner (Championship Exclusive)</option><option value="Gold Partner" selected>Gold Partner (Most Popular)</option><option value="Silver Partner">Silver Partner</option><option value="Bronze Partner">Bronze Partner</option><option value="Technical / In-Kind Parts">Technical &amp; Parts In-Kind</option><option value="Custom Collaboration">Custom Collaboration</option></select><p class="field-error" id="sponsor-tier-error" hidden></p></div>''' if kind=='sponsor' else ''
 subsystem_field = f'''<div class="field"><label for="recruitment-subsystem" class="field-label-white">Preferred Division</label><select id="recruitment-subsystem" name="tier" class="field-select"><option value="Chassis &amp; Aerodynamics" selected>Chassis &amp; Aerodynamics (CAD, Carbon Fiber, Spaceframe)</option><option value="Powertrain &amp; Engine">Powertrain &amp; Transmission (KTM 390cc, ECU, Dyno Tuning)</option><option value="Suspension &amp; Dynamics">Suspension &amp; Dynamics (Wishbones, Steering, Uprights)</option><option value="Electronics &amp; DAQ">Electronics &amp; Telemetry (DAQ, Sensors, Wire Harness)</option><option value="Corporate PR &amp; Media">Corporate PR, Sponsorship &amp; Media</option></select><p class="field-error" id="recruitment-subsystem-error" hidden></p></div>''' if rec else ''
 summary = '<div class="error-summary" tabindex="-1" hidden></div>'
 org_label = 'College / Institution' if reg else 'Roll No \u00b7 Branch &amp; Year (e.g. B24ME087 \u00b7 ME 2nd Yr)' if rec else 'Company / Organization'
 consent_purpose = 'F1 Sim Racing on-spot registration' if reg else 'member candidate evaluation and interview scheduling' if rec else 'partnership correspondence' if kind=='sponsor' else 'enquiry correspondence'
 message_label = 'Message / Slot Preference' if reg else 'Why do you want to join Force Racing? (Skills, tools, past projects)' if rec else 'Partnership Scope &amp; Objectives' if kind=='sponsor' else 'Your message'
 message_help = 'Any questions, slot preferences or team notes...' if reg else 'Describe your passion for racing, relevant software skills (SolidWorks, ANSYS, Arduino, etc.), or past workshop experience...' if rec else 'Describe your company and the support you have in mind...' if kind=='sponsor' else 'Tell us how we can help...'
 message_required = '' if reg else 'required'
 footnote = '<p class="small-note form-footnote">An official pass and scannable QR credential will be emailed to you immediately upon registration.</p>' if reg else ''

 return f'''<form class="public-form telemetry-form" data-form="{kind}" method="post" action="/api/submissions" novalidate>{summary}<div class="form-grid">{field('name','Your full name')}{field('organization',org_label,autocomplete='organization')}{field('email','Email address',typ='email')}{field('phone','Mobile / WhatsApp',typ='tel',autocomplete='tel')}{tier_field}{subsystem_field}{slot_field}{screenshot_field}</div><div class="field"><label for="{kind}-message" class="field-label-white">{message_label}</label><textarea id="{kind}-message" name="message" rows="4" maxlength="4000" {message_required} aria-describedby="{kind}-message-error" placeholder="{message_help}"></textarea><p class="field-error" id="{kind}-message-error" hidden></p></div><div class="honey" aria-hidden="true"><label for="{kind}-website">Leave this field blank</label><input id="{kind}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div><div class="consent-field"><input id="{kind}-consent" name="consent" type="checkbox" required aria-describedby="{kind}-consent-error"><label for="{kind}-consent">I agree to Force Racing processing these details for {consent_purpose} and sharing with student coordinators via email. <a href="privacy.html">Read data privacy notice</a>.</label></div><p class="field-error" id="{kind}-consent-error" hidden></p><div class="turnstile-slot"></div><p class="form-status" role="status" aria-live="polite" tabindex="-1"></p><button class="btn race-btn" type="submit">{labels[kind]}</button>{footnote}<noscript><p class="small-note">Online forms need JavaScript. You can <a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON}email the team</a> instead.</p></noscript></form>'''

PARTNERS=[('ANSYS','Ansys'),('solidworks','SOLIDWORKS'),('lotus','Lotus'),('ktm','KTM'),('Hoosier','Hoosier Racing Tire'),('wilwood','Wilwood'),('burnout','Burnout'),('ASAP','ASAP'),('fc','FC partner logo'),('sr','SR partner logo'),('rajput','Rajput AutoCorp'),('Composites','Composites partner logo'),('3dfy','3DFY')]

def partners():
 return f'''<section class="section partners"><div class="wrap"><div class="section-top"><div><span class="eyebrow">The people behind the progress</span><h2>THEY BELIEVED<br>IN US.</h2></div><p>Engineering is a team effort. Acknowledging the partners featured in our team's story.</p></div><div class="partner-grid">{''.join('<div class="partner">'+image(n,alt,size=400)+'</div>' for n,alt in PARTNERS)}</div><p class="partner-caption">Championship partners and engineering sponsors powering Force Racing.</p></div></section>'''

BOLT_ICON = '<svg class="icon-bolt" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px;margin-right:6px;" aria-hidden="true"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.08-.14C8.56 10.9 11.5 5.5 13 2h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C14.86 13.9 12 19.5 11 21z"/></svg>'

def hero_section():
 return f'''<section class="home-hero" data-home-hero>
  <picture class="home-hero-bg" data-home-picture>
    <source media="(max-width:760px)" srcset="assets/images/supra26-bic-2000.webp">
    <img data-home-artwork src="assets/images/supra26-bic-wide.webp" width="1200" height="750" alt="Force Racing Formula Student car FR 26 at Buddh International Circuit" fetchpriority="high" decoding="async">
  </picture>
  <div class="home-hero-scrim"></div>
  <div class="wrap home-hero-content">
    <div class="hero-tagline">
      <span class="badge badge-gold">Official Formula Student Team</span>
      <span class="badge badge-live">KITS Warangal</span>
    </div>
    <h1 class="hero-title" data-home-title>DREAM. <span class="text-accent">BUILD.</span> <span class="text-outline">RACE.</span></h1>
    <p class="hero-subtitle" data-home-description>Representing <strong>Kakatiya Institute of Technology &amp; Science</strong> on national circuits. Designing, engineering, and manufacturing championship formula racecars since 2009.</p>
    <div class="hero-actions" data-home-actions>
      <a class="btn secondary" href="cars.html">Explore Fleet {ARROW}</a>
      <a class="btn secondary" href="support.html">Partnerships {ARROW}</a>
    </div>
    <div class="hero-stats">
      <div class="stat-item"><span class="stat-num">15+</span><span class="stat-lbl">Years Racing</span></div>
      <div class="stat-item"><span class="stat-num">15+</span><span class="stat-lbl">Vehicles Built</span></div>
      <div class="stat-item"><span class="stat-num">60+</span><span class="stat-lbl">Student Engineers</span></div>
      <div class="stat-item"><span class="stat-num">10+</span><span class="stat-lbl">National Podiums</span></div>
    </div>
  </div>
</section>'''

HOME=f'''{hero_section()}<section class="section wrap reveal"><span class="eyebrow">This is Force Racing</span><div class="intro-grid"><h2>WE DON’T JUST<br>STUDY IT.<br>WE BUILD IT.</h2><div class="intro-copy"><p class="lead">We are the Formula Student team of Kakatiya Institute of Technology &amp; Science, Warangal.</p><p class="muted">Established in 2009, Force Racing brings students from the classroom to the workshop. We design, manufacture and compete with formula-style race cars in national and international Formula Student competitions.</p><a class="text-link" href="team.html">Meet the force {ARROW}</a><div class="stats"><div class="stat"><strong>2009</strong><span>Our story began</span></div><div class="stat"><strong>60</strong><span>Members in our team story</span></div><div class="stat"><strong>01</strong><span>Shared pursuit</span></div></div></div></div></section><section class="wrap section reveal" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">Built to compete</span><h2>IDEAS BECOME<br>MACHINES.</h2></div><p class="muted">Every chassis carries the thinking, making and persistence of the students behind it.</p></div><div class="feature-car"><picture><source media="(max-width:760px)" srcset="assets/images/supra26-bic-phone.webp"><img src="assets/images/supra26-bic-wide.webp" width="1200" height="750" alt="FR 26, the team’s red Formula Student car in the pit lane" loading="lazy" decoding="async"></picture><div class="feature-car-copy"><span class="eyebrow">The 2026 chapter</span><h3>FR 26</h3><p>SUPRA SAE India 2026</p></div><div class="feature-bottom">{btn('cars.html','Explore our car history',True)}</div></div><div class="photo-caption"><span>FR 26 · Original team photography</span><span>ENGINEERING, MADE REAL.</span></div></section><section class="section wrap team-story reveal">{image('heroimg','Force Racing students gathered behind their blue and white race car')}<div><span class="eyebrow">More than the machine</span><h2>ONE TEAM.<br>EVERY DETAIL.</h2><p class="muted">Our mission is to develop industry-ready engineers through rigorous technical execution, business practice and project management. Primarily from Mechanical Engineering, our team learns by taking responsibility for the whole car.</p><p class="muted">Our alumni have progressed into high-performance motorsport, including Formula 1, engineering consultancy and other engineering sectors.</p><a class="text-link" href="team.html">Get to know the team {ARROW}</a></div></section>{partners()}'''

write('index','Dream. Build. Race.','Force Racing, the Formula Student team from KITS Warangal. Meet our cars, our team and our season.',HOME)

def car_picture(photo,name,high=False):
 return f'''<picture class="car-photo-frame"><source media="(max-width:760px)" srcset="assets/images/{photo}-phone.webp"><img src="assets/images/{photo}-wide.webp" alt="{e(name)} — archived Force Racing vehicle photograph" width="1200" height="750" class="car-img" {'fetchpriority="high"' if high else 'loading="lazy"'} decoding="async"></picture>'''

CATEGORIES=[
 ('formula','Formula Student','Formula Student','THE FORMULA ARCHIVE.','Single-seater, open-wheel competition race cars designed, manufactured, and campaigned by Force Racing across national and international circuits.',[('FR 26','supra26-bic',['SUPRA SAE INDIA 2026']),('FR 19','fr19',['FORMULA BHARAT 2020','SUPRA SAE INDIA 2019','FFS FMAE 2019']),('FR 18','ffs18',['FFS FMAE 2018']),('FR 17','fr17',['FORMULA BHARAT 2017','SAE SUPRA INDIA 2017','FFS FMAE 2017']),('FR 16','fr16',['SUPRA SAE INDIA 2016']),("LEGIONS’ F1",'legions12',['SAE SUPRA INDIA 2012'])]),
 ('karting','Karting','Sprint Karting','PRECISION & SPEED.','High-agility sprint karts engineered for national karting championships, honing chassis dynamics and rapid track iteration.',[('KART 3','ikr',['INDIAN KARTING RACE 2024']),('KART 2','kart2',['NEKC 2020']),('KART 1','kart1',['NEKC 2018','NEKC 2019'])]),
 ('exploration','Beyond formula','Pioneering & BAJA','WHERE WE BEGAN.','From rugged all-terrain BAJA buggies to high-efficiency human-electric endurance vehicles, the pioneering machines that laid our team foundation.',[('RATHAM','ratham',['EFFI-CARS 2015']),('EFFICYCLE','efficycle',['SAE NIS EFFICYCLE 2017']),('PHOENIX RACING','phoenix',['SAE NIS EFFICYCLE 2015']),('ASHWASENA','ashwasena',['SAE NIS EFFICYCLE 2013']),('TERRANAUT','baja11',['SAE BAJA INDIA 2011']),('MAIDEN MOB','baja10',['SAE BAJA INDIA 2010'])])
]

car_idx=1
category_sections=[]
for cat_id,cat_short,cat_num,cat_title,cat_lead,cars in CATEGORIES:
 car_rows=[]
 for name,photo,events in cars:
  car_rows.append(f'<article class="car-row" id="car-{car_idx}"><span class="car-number">{car_idx:02}</span>{car_picture(photo,name,high=car_idx==1)}<div class="car-info"><span class="eyebrow">{e(cat_short)}</span><h2>{e(name)}</h2><ul class="car-events">'+''.join(f'<li>{e(ev)}</li>' for ev in events)+'</ul></div></article>')
  car_idx+=1
 category_sections.append(f'<section class="car-category-section" id="{cat_id}"><div class="category-header"><span class="eyebrow">{cat_num}</span><h2>{cat_title}</h2><p class="lead muted">{cat_lead}</p></div><div class="car-archive">{"".join(car_rows)}</div></section>')

write('cars','Our machines','Explore every vehicle in the Force Racing archive, from FR 26 to the team’s earliest BAJA and Efficycle projects.',intro('The machine archive','BUILT. TESTED.<br>REMEMBERED.','Every car is a chapter. Explore the vehicles and competition entries published in our team archive.','01')+f'<div class="wrap"><nav class="subnav" aria-label="Vehicle categories"><a href="#formula">Formula Student {ARROW_DOWN}</a><a href="#karting">Karting {ARROW_DOWN}</a><a href="#exploration">Beyond formula {ARROW_DOWN}</a></nav>{"".join(category_sections)}</div>')

TEAM=[('Dhanush','Captain','Steering & Wheels'),('Arun','Vice-captain','Power-train'),('Sohail','Team manager','Chassis'),('Hanumanth','','Chassis'),('Jeevan','','Chassis · Logistics'),('Navya','','Chassis'),('J Harsha','','Suspension'),('Prashanth','','Suspension'),('Karthik','','Power-train'),('Rakesh','','Power-train'),('Dhanya','','Public relations · Power-train'),('Mahidhar','','Brakes · Finance'),('P Harsha','','Brakes'),('Ruthvik','','Steering & Wheels'),('Ashish','','Social media')]
TEAM_PHONES={'Sohail':'+918008391525','Arun':'+918328012134','Karthik':'+919392382245','Mahidhar':'+919030521196'}
def _initials(name):
 parts=[p for p in name.replace('.',' ').split() if p]
 return ''.join(p[0] for p in parts)[:2].upper()

def _roster_item(name, role, d):
 phone = TEAM_PHONES.get(name)
 heading = f'<h3>{caller(name, phone, role=role)}</h3>' if phone else f'<h3>{name}</h3>'
 return f'<article class="roster-row"><div class="roster-photo" aria-hidden="true"><span>{_initials(name)}</span></div><div class="roster-body">{heading}'+(f'<p class="role">{role}</p>' if role else '')+f'<p class="discipline">{d}</p></div></article>'

roster=''.join(_roster_item(name,role,d) for name,role,d in TEAM)
write('team','The people behind the machine','Meet the students behind Force Racing at KITS Warangal: engineering, teamwork and a shared drive to build.',intro('The people behind the machine','MANY MINDS.<br>ONE FORCE.','Students. Engineers. Teammates. We turn shared ambition into something we can take to the track.','02')+image('heroimg','Force Racing students with their blue and white race car','wide-photo',True)+f'<section class="section wrap reveal"><div class="intro-grid"><div><span class="eyebrow">A workshop. A proving ground.</span><h2>THE CAR IS<br>ONLY THE<br>BEGINNING.</h2></div><div class="intro-copy"><p class="lead">Established in 2009, our team story describes 60 students, primarily from Mechanical Engineering.</p><p class="muted">Each year, we design, manufacture and compete with a formula-style race car. Along the way we learn to connect technical execution with structured business and project management.</p><p class="muted">Our mission is to develop industry-ready engineers. Alumni have progressed into high-performance motorsport, including Formula 1, engineering consultancy and diverse engineering sectors.</p></div></div></section><section class="wrap section" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">The published team roster</span><h2>MEET THE<br>BUILDERS.</h2></div><p class="muted">Student engineers, subsystem captains, and technicians leading design, manufacturing, and trackside operations.</p></div><div class="roster">{roster}</div></section>'+eventstrip())

def tiers():
 return f'''<section class="section wrap" id="tiers" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">Championship Partnerships</span><h2>PARTNERSHIP<br>TIERS.</h2></div><p class="muted">High-impact brand integration across SUPRA SAE INDIA and Formula Bharat national competitions. Click any tier below to inspect telemetry allocation and engage that tier’s dedicated partner protocol.</p></div><div class="tier-grid">
<div class="tier-card title-tier" data-tier="title"><div class="tier-badge">EXCLUSIVE // 1 SLOT</div><h3>TITLE PARTNER</h3><p class="tier-desc">Primary championship naming partner and dominant vehicle livery placement.</p>
<div class="tier-gauge-wrap">
  <svg class="tier-gauge-svg" viewBox="0 0 120 120" role="img" aria-label="100% Championship Value Allocation">
    <circle class="gauge-track" cx="60" cy="60" r="48"></circle>
    <circle class="gauge-seg" cx="60" cy="60" r="48" stroke="#ff1801" stroke-dasharray="301.6 301.6" stroke-dashoffset="0"></circle>
    <text class="gauge-center-text" x="60" y="56">100%</text>
    <text class="gauge-sub-text" x="60" y="70">TITLE VIP</text>
  </svg>
  <div class="tier-breakdown">
    <div class="breakdown-row row-red"><span>Aero &amp; Front Wing</span><strong>45%</strong></div>
    <div class="breakdown-row row-gold"><span>Driver Suits Livery</span><strong>30%</strong></div>
    <div class="breakdown-row row-white"><span>Paddock VIP Access</span><strong>25%</strong></div>
  </div>
</div>
<ul class="tier-perks"><li>Primary Front Wing, Nose Cone &amp; Sidepod Livery</li><li>Front Center Chest &amp; Full Back Placement on Driver Suits</li><li>Official Team Naming ("Force Racing powered by Partner")</li><li>Pit Garage Banners &amp; Trackside Signage</li><li>6 All-Access Paddock Passes to Formula Student</li><li>Campus Tech Day &amp; Priority Graduate Recruitment</li></ul><a href="#sponsor" class="btn tier-btn" onclick="window.selectSponsorshipTier('Title Partner');">Select Title VIP {ARROW}</a></div>

<div class="tier-card featured-tier" data-tier="gold"><div class="tier-badge popular">MOST POPULAR</div><h3>GOLD PARTNER</h3><p class="tier-desc">Prominent aerodynamic fairing and official team race suit branding.</p>
<div class="tier-gauge-wrap">
  <svg class="tier-gauge-svg" viewBox="0 0 120 120" role="img" aria-label="80% Championship Value Allocation">
    <circle class="gauge-track" cx="60" cy="60" r="48"></circle>
    <circle class="gauge-seg" cx="60" cy="60" r="48" stroke="#ffd700" stroke-dasharray="241.3 301.6" stroke-dashoffset="0"></circle>
    <text class="gauge-center-text" x="60" y="56">80%</text>
    <text class="gauge-sub-text" x="60" y="70">GOLD TIER</text>
  </svg>
  <div class="tier-breakdown">
    <div class="breakdown-row row-gold"><span>Rear Wing Endplates</span><strong>40%</strong></div>
    <div class="breakdown-row row-white"><span>Race Suit Sleeves</span><strong>25%</strong></div>
    <div class="breakdown-row row-silver"><span>Digital Media Spotlights</span><strong>15%</strong></div>
  </div>
</div>
<ul class="tier-perks"><li>Cockpit Fairing &amp; Rear Wing Endplate Livery</li><li>Race Suit Sleeve &amp; Workshop Main Banner</li><li>Featured Sponsor Spotlight across Social &amp; Web</li><li>4 All-Access Paddock Passes</li><li>Campus Recruitment &amp; Student Engineering Access</li></ul><a href="#sponsor" class="btn tier-btn" onclick="window.selectSponsorshipTier('Gold Partner');">Select Gold Tier {ARROW}</a></div>

<div class="tier-card" data-tier="silver"><div class="tier-badge">AEROSPACE CHASSIS</div><h3>SILVER PARTNER</h3><p class="tier-desc">Chassis sidepod branding and national championship digital coverage.</p>
<div class="tier-gauge-wrap">
  <svg class="tier-gauge-svg" viewBox="0 0 120 120" role="img" aria-label="60% Championship Value Allocation">
    <circle class="gauge-track" cx="60" cy="60" r="48"></circle>
    <circle class="gauge-seg" cx="60" cy="60" r="48" stroke="#c0c0c0" stroke-dasharray="181.0 301.6" stroke-dashoffset="0"></circle>
    <text class="gauge-center-text" x="60" y="56">60%</text>
    <text class="gauge-sub-text" x="60" y="70">SILVER TIER</text>
  </svg>
  <div class="tier-breakdown">
    <div class="breakdown-row row-silver"><span>Lower Sidepod Livery</span><strong>35%</strong></div>
    <div class="breakdown-row row-white"><span>Team Apparel Badge</span><strong>15%</strong></div>
    <div class="breakdown-row row-silver"><span>Paddock Passes</span><strong>10%</strong></div>
  </div>
</div>
<ul class="tier-perks"><li>Lower Sidepod &amp; Chassis Livery Branding</li><li>Team Apparel Sleeve Placement</li><li>Website &amp; Event Media Recognition</li><li>2 All-Access Paddock Passes</li></ul><a href="#sponsor" class="btn tier-btn" onclick="window.selectSponsorshipTier('Silver Partner');">Select Silver Tier {ARROW}</a></div>

<div class="tier-card" data-tier="bronze"><div class="tier-badge">FOUNDATION // PATRON</div><h3>BRONZE PARTNER</h3><p class="tier-desc">Foundation patron partner powering next-generation Formula Student engineering talent.</p>
<div class="tier-gauge-wrap">
  <svg class="tier-gauge-svg" viewBox="0 0 120 120" role="img" aria-label="40% Championship Value Allocation">
    <circle class="gauge-track" cx="60" cy="60" r="48"></circle>
    <circle class="gauge-seg" cx="60" cy="60" r="48" stroke="#cd7f32" stroke-dasharray="120.6 301.6" stroke-dashoffset="0"></circle>
    <text class="gauge-center-text" x="60" y="56">40%</text>
    <text class="gauge-sub-text" x="60" y="70">BRONZE TIER</text>
  </svg>
  <div class="tier-breakdown">
    <div class="breakdown-row row-bronze"><span>Chassis Patron Decal</span><strong>25%</strong></div>
    <div class="breakdown-row row-white"><span>Web &amp; Media Citation</span><strong>10%</strong></div>
    <div class="breakdown-row row-bronze"><span>Team Merch Kit</span><strong>5%</strong></div>
  </div>
</div>
<ul class="tier-perks"><li>Chassis Livery Supporting Badge</li><li>Digital Logo on Official Website &amp; Reports</li><li>Official Force Racing Citation &amp; Team Merch</li></ul><a href="#sponsor" class="btn tier-btn" onclick="window.selectSponsorshipTier('Bronze Partner');">Select Bronze Tier {ARROW}</a></div>
</div></section>'''

def technical_partners():
 return f'''<section class="section wrap" style="padding-top:0"><div class="contribution"><div><span class="eyebrow">Technical &amp; In-Kind Collaboration</span><h2>ENGINEER<br>WITH US.</h2></div><div><p class="lead">We partner with manufacturing, tooling, and materials leaders to push Formula Student boundaries.</p><p class="muted">From raw aerospace alloys, carbon fiber supplies, 5-axis CNC machining, dynamometer tuning, to CAE simulation licenses (Ansys, SolidWorks), in-kind technical partnerships power our cars onto the national podium.</p><div class="actions"><a class="btn" href="#sponsor" onclick="document.getElementById('sponsor-tier').value='Technical / In-Kind Parts'">Propose In-Kind Collaboration {ARROW}</a></div></div></div></section>'''

write('support','Championship Partnerships','Support Force Racing’s engineering journey through partnerships, components and sponsorship proposals.',intro('Championship Partnerships','FUEL THE<br>NEXT LAP.','Your brand on the national grid. Back student engineers competing at Formula Bharat and SUPRA SAE India.','03')+f'<div class="wrap support-quicknav"><a class="btn" href="#tiers">Explore sponsorship tiers {ARROW}</a></div><div class="wrap support-photo">{image("heroimg","Force Racing team and their student-built car","wide-photo",True)}</div><section class="section wrap reveal"><span class="eyebrow">How sponsorship accelerates the car</span><h2>WHERE YOUR<br>SUPPORT GOES.</h2><div class="support-lines"><article class="support-line"><span>01</span><h3>POWERTRAIN &amp;<br>COMPONENTS</h3><p>Procuring specialized racing bearings, KTM engine parts, custom ECU wiring, and high-performance fasteners.</p></article><article class="support-line"><span>02</span><h3>CHASSIS &amp;<br>COMPOSITES</h3><p>Fabrication of 4130 chromoly spaceframe chassis, carbon fiber prepreg aerodynamic wings, and impact attenuators.</p></article><article class="support-line"><span>03</span><h3>TESTING &amp;<br>TRACK TELEMETRY</h3><p>Tire sets (Hoosier), suspension calibration, dynamometer validation, and national competition logistics.</p></article></div></section>{tiers()}{technical_partners()}{partners()}<section class="section wrap form-section" id="sponsor" style="display:none;" hidden><div class="form-heading"><span class="eyebrow">Partnership Proposal</span><h2>PARTNER<br>WITH FORCE.</h2><p class="muted">Tell us about your organization and how you want to join our Formula Student championship campaign.</p><div class="direct-contact-note"><p>Direct line to team manager:</p>{caller('Md. Sohail', '+918008391525', role='Team Manager')}</div></div>{form("sponsor")}</section>',head_extra='<style>#sponsor[hidden]{display:none!important}</style>')

write('contact','Get in touch','Contact Force Racing at the Central Workshop, KITS Warangal, by email, phone or on-site enquiry.',intro('From a conversation to the workshop','LET’S TALK<br>RACING.','Have a question, an idea or a way to help? Start a conversation with Force Racing.','04')+f'<section class="section wrap contact-grid" style="padding-top:0"><div><div class="contact-item"><span class="eyebrow">Visit the workshop</span><h2>KITS WARANGAL</h2><address>Central Workshop<br>Kakatiya Institute of Technology &amp; Science<br>Warangal – 506015, Telangana, India</address><p class="small-note">Hanamkonda, Telangana</p><a href="https://www.google.com/maps/search/?api=1&amp;query=Force+Racing+India+KITS+Warangal" target="_blank" rel="noopener noreferrer">Get directions</a></div><div class="contact-item"><span class="eyebrow">Team manager</span>{caller('Md. Sohail', '+918008391525', role='Team Manager')}</div><div class="contact-item"><span class="eyebrow">Email the team</span><a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON} team.force.racing.kitsw@gmail.com</a></div><div class="contact-item"><span class="eyebrow">Follow the journey</span><div class="social-links">'+''.join(f'<a href="{u}" target="_blank" rel="noopener noreferrer">{n}</a>' for n,u in SOCIAL)+f'</div></div></div>{image("supra26-bic","FR 26 in the pit lane at Buddh International Circuit","contact-photo",True,size=2000)}</section><section class="section wrap form-section" id="contact-form"><div class="form-heading"><span class="eyebrow">Send an enquiry</span><h2>START A<br>CONVERSATION.</h2><p class="muted">A message for the people behind the machine.</p></div>{form("contact")}</section>')


RECRUITMENT_CONTENT = f'''<section class="section wrap" style="padding-top:0">
  <div class="intro-grid">
    <div>
      <span class="eyebrow">Formula Student Engineering</span>
      <h2>BEYOND THE<br>TEXTBOOK.</h2>
    </div>
    <div class="intro-copy">
      <p class="lead">Force Racing is recruiting motivated engineers, designers, programmers, and communicators for our upcoming SUPRA SAE INDIA and Formula Bharat national championship campaigns.</p>
      <p class="muted">Whether you are in 1st, 2nd, or 3rd year from Mechanical, CSE, EEE, ECE, or Civil, our workshop provides true hands-on vehicle engineering, CAE simulation, CNC fabrication, and team leadership experience.</p>
      <div class="actions">
        <a class="btn race-btn" href="#recruitment-form">Apply for Recruitment {ARROW}</a>
      </div>
    </div>
  </div>
</section>

<section class="section wrap reveal">
  <span class="eyebrow">Candidate Protocol</span>
  <h2>HOW RECRUITMENT<br>WORKS.</h2>
  <div class="support-lines">
    <article class="support-line">
      <span>01</span>
      <h3>TRANSMIT<br>APPLICATION</h3>
      <p>Submit your candidate profile below with your academic branch, skills (CAD, ANSYS, programming, fabrication), and subsystem preference.</p>
    </article>
    <article class="support-line">
      <span>02</span>
      <h3>BOT &amp; EMAIL<br>CONFIRMATION</h3>
      <p>Instant telemetry alert dispatched to Subsystem Leads via Telegram bot. You receive an official welcome confirmation email with your candidate ID.</p>
    </article>
    <article class="support-line">
      <span>03</span>
      <h3>CENTRAL WORKSHOP<br>INTERVIEW</h3>
      <p>Technical walk-through and interview at the Central Workshop. Selected candidates join the build team directly on the factory floor.</p>
    </article>
  </div>
</section>

<section class="section wrap" style="padding-top:0">
  <div class="section-top">
    <div>
      <span class="eyebrow">Engineering Divisions</span>
      <h2>CHOOSE YOUR<br>SUBSYSTEM.</h2>
    </div>
    <p class="muted">Explore the engineering subdivisions that design and construct our racecar.</p>
  </div>
  <div class="tier-grid">
    <div class="tier-card">
      <div class="tier-badge popular">POWERTRAIN</div>
      <h3>ENGINE &amp; DRIVETRAIN</h3>
      <p class="tier-desc">KTM 390cc single-cylinder high-compression engine tuning, intake manifold CFD, exhaust header routing, dyno tuning, and cooling systems.</p>
    </div>
    <div class="tier-card">
      <div class="tier-badge">AERODYNAMICS</div>
      <h3>CHASSIS &amp; AERO</h3>
      <p class="tier-desc">4130 tubular spaceframe welding, structural FEA torsional rigidity tests, carbon fiber composite front/rear wing fabrication, and downforce balance.</p>
    </div>
    <div class="tier-card">
      <div class="tier-badge">DYNAMICS</div>
      <h3>SUSPENSION &amp; BRAKES</h3>
      <p class="tier-desc">Double wishbone kinematics, anti-roll bars, coilover damper tuning, CNC uprights, brake bias calculations, and Hoosier tire contact patch analysis.</p>
    </div>
    <div class="tier-card">
      <div class="tier-badge">TELEMETRY</div>
      <h3>ELECTRONICS &amp; PR</h3>
      <p class="tier-desc">Custom wire harnesses, sensor instrumentation (wheel speed, suspension travel, throttle pot), DAQ telemetry dashboards, plus corporate PR and media.</p>
    </div>
  </div>
</section>

<section class="section wrap form-section" id="recruitment-form" hidden>
  <div class="form-heading">
    <h2>JOIN THE<br>SQUAD.</h2>
    <span class="eyebrow">Candidate Application Protocol</span>
    <p class="muted">Fill in your academic and technical details. All applications are reviewed by team captains and subsystem leads.</p>
    <div class="direct-contact-note">
      <p>Questions about joining?</p>
      {caller('Md. Sohail', '+918008391525', role='Team Manager')}
    </div>
  </div>
  {form("recruitment")}
</section>'''

write('recruitment','Team Recruitment · Force Racing','Join Force Racing at KITS Warangal. Student recruitment for Chassis, Powertrain, Suspension, Electronics, and Media subsystems.',intro('Join Force Racing','BECOME THE<br>NEXT BUILDER.','Step out of the classroom and onto the grid. Join the Formula Student engineering squad.','05')+RECRUITMENT_CONTENT,head_extra='<style>#recruitment-form[hidden]{display:none!important}</style><script>(function(){function el(){return document.getElementById("recruitment-form")}function show(){var e=el();if(!e||!e.hidden)return;e.hidden=false;requestAnimationFrame(function(){e.scrollIntoView({block:"start"})})}function sync(){if(location.hash==="#recruitment-form")show()}document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(\'a[href="#recruitment-form"]\');if(a)setTimeout(sync,0)},!0);addEventListener("hashchange",sync);addEventListener("DOMContentLoaded",sync)}());</script><noscript><style>#recruitment-form[hidden]{display:grid!important}</style></noscript>')

PRIVACY_CONTENT = f'''<section class="section wrap privacy-copy" style="padding-top:0">
<h2>Data Transparency on Pit Lane</h2>
<p class="lead">Force Racing is a student-run Formula Student engineering team at Kakatiya Institute of Technology &amp; Science, Warangal. We stand for technical integrity, direct accountability, and genuine respect for your personal information. Here is our straightforward, honest data commitment.</p>

<h2>1. What We Collect</h2>
<p>When you submit a sponsorship proposal, recruitment application or contact enquiry, we collect only the necessary details you explicitly enter:</p>
<ul class="tier-perks" style="margin-bottom: var(--gp-space-5);">
  <li><strong>Your Name &amp; Email Address</strong>: To respond to your enquiry or application and keep you updated on our progress.</li>
  <li><strong>Mobile Number</strong>: So the team can follow up on your enquiry.</li>
  <li><strong>College / Institution or Organization</strong>: To verify student admission or corporate partnership status.</li>
</ul>

<h2>2. No Trackers, No Cookies, No Data Selling</h2>
<p>We do not use tracking pixels, invasive analytics, third-party advertising cookies, or behavioral trackers. We will <strong>NEVER</strong> sell, rent, monetize, or disclose your contact details to third-party marketing companies.</p>

<h2>3. Where Your Information is Stored</h2>
<p>Your details are stored securely in:</p>
<ul class="tier-perks" style="margin-bottom: var(--gp-space-5);">
  <li>Our team's private, encrypted Cloudflare database (D1).</li>
  <li>Our official KITS Warangal Google Drive workspace.</li>
</ul>

<h2>4. Immediate Deletion Upon Request</h2>
<p>You have full ownership of your data. If you want your enquiry or application record permanently erased from our records, email us at <a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON} team.force.racing.kitsw@gmail.com</a> with your team email address, and we will purge your row within 24 hours.</p>
</section>'''

write('privacy','Data Privacy & Transparency','Data transparency notice for Force Racing: straightforward, student-run accountability with zero tracking or data selling.',intro('Pit Lane Transparency','YOUR DATA.<br>OUR RESPECT.','Straightforward, student-run accountability. Zero ad trackers, zero data selling.','06')+PRIVACY_CONTENT)

TRAIL_CONTENT = '''<section class="page-intro wrap">
  <span class="eyebrow">SUMSHODHINI ’26 · Campus Navigation &amp; QR Trail</span>
  <h1>THE CIRCUIT<br><span>WALKWAY.</span></h1>
  <div class="page-intro-bottom">
    <p class="lead muted">15 Checkpoints across the KITS Warangal campus. Scan each sector code, read the telemetry notes, follow the walking steps, and arrive at the Central Workshop for your simulator stint.</p>
    
  </div>
</section>
<section class="section wrap" style="padding-top:0">
  <div id="campus-trail-root"></div>
</section>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    if (window.CampusTrail) {
      window.CampusTrail.init("campus-trail-root");
    }
  });
</script>'''

write('trail','Campus Navigation & QR Trail · 15 Stops','Official 15-stop Campus Navigation & QR Trail for SUMSHODHINI ’26 F1 Sim Racing by Force Racing, KITS Warangal. Interactive schematic map, step-by-step walking directions, exact spot hints and Google Maps navigation.',TRAIL_CONTENT)

print('Built 9 static pages.')
