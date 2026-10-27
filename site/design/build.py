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

NAV=[('index','Home'),('cars','Cars'),('team','Team'),('recruitment','Recruitment'),('support','Support'),('contact','Contact')]
SOCIAL=[('Instagram','https://www.instagram.com/force.racing?igsh=MXI6cGRnYjA0cGE='),('LinkedIn','https://www.linkedin.com/company/force-racing/'),('YouTube','https://youtube.com/@forceracing8847?si=3Ki2roWmQvvdFWp-'),('Facebook','https://www.facebook.com/forceracingkitsw/')]

def brand():
 return '<a class="brand" href="index.html" aria-label="Force Racing home"><img src="assets/original/favicon.png" alt="" width="48" height="48"><span class="brand-name">FORCE RACING<small>KITS WARANGAL</small></span></a>'

def header(page):
 return f'''<a class="skip" href="#main">Skip to content</a><header class="site-header{' home-header' if page=='index' else ''}"><div class="wrap header-inner">{brand()}<button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false">Menu +</button><nav class="main-nav" id="main-nav" aria-label="Main navigation">{''.join(f'<a href="{slug}.html"'+(' aria-current="page"' if page==slug else '')+f'>{label}</a>' for slug,label in NAV)}</nav><a data-campaign-promo class="campaign-pill" href="campaign.html"{(' aria-current="page"' if page=='campaign' else '')}>F1 Sim Racing</a></div></header>'''

def footer():
 return f'''<footer class="footer"><div class="wrap"><div class="footer-callout"><div><span class="eyebrow">The next chapter is ours to build.</span><h2>BE PART OF<br>THE FORCE.</h2></div>{btn('support.html','Fuel the journey')}</div><div class="footer-grid"><div>{brand()}<p class="muted" style="margin-top:var(--gp-space-5)">Student built. Race driven.<br>Warangal, India.</p><div class="social-links">{''.join(f'<a href="{u}" target="_blank" rel="noopener noreferrer">{n}</a>' for n,u in SOCIAL)}</div></div><div><span class="footer-label">Find the workshop</span><address>Central Workshop<br>Kakatiya Institute of Technology &amp; Science<br>Warangal – 506015<br>Telangana, India</address><a href="https://www.google.com/maps/search/?api=1&amp;query=Force+Racing+India+KITS+Warangal" target="_blank" rel="noopener noreferrer">Get directions</a></div><div><span class="footer-label">Explore the team</span><nav class="footer-nav" aria-label="Footer navigation">{''.join(f'<a href="{s}.html">{n}</a>' for s,n in NAV)}<a href="campaign.html">Sim Racing</a></nav><a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON}team.force.racing.kitsw@gmail.com</a><br><a href="tel:+918008391525">{PHONE_ICON}+91 80083 91525</a></div></div><div class="footer-baseline"><span>© 2026 Force Racing India. All rights reserved.</span><span><a href="privacy.html">Privacy &amp; Data Notice</a> · Dream. Build. Race.</span></div></div></footer><aside data-campaign-promo class="mobile-campaign" aria-label="F1 Sim Racing campaign"><span><span data-campaign="title">F1 SIM RACING</span><small><span data-campaign="date">31 October 2026</span> · <span data-campaign="fee">₹99 per student</span></small></span>{btn('campaign.html#register','Register')}</aside>'''

def write(slug,title,description,body):
 from datetime import datetime,timezone
 active=CAMPAIGN.get('enabled') is True
 expiry=CAMPAIGN.get('expiresAt')
 if expiry:
  try:active=active and datetime.fromisoformat(expiry.replace('Z','+00:00'))>datetime.now(timezone.utc)
  except ValueError:active=False
 for field,default in [('title','F1 Sim Racing'),('date','31 October 2026'),('venue','Central Workshop'),('fee','₹99 per student'),('programme','SUMSHODHINI ’26')]:
  body=body.replace(default,e(str(CAMPAIGN[field])))
 titlewords=CAMPAIGN['title'].upper().rsplit(' ',1)
 heading=e(titlewords[0])+(' <span>'+e(titlewords[1])+'.</span>' if len(titlewords)>1 else '')
 body=re.sub(r'(<h1[^>]*data-campaign-heading>).*?(</h1>)',lambda m:m[1]+heading+m[2],body)
 body=body.replace('class="home-hero" data-home-hero','class="home-hero" data-home-hero data-campaign-active="'+str(active).lower()+'"')
 if not active:
  body=re.sub(r'(<[a-z][^>]*data-campaign-promo)([^>]*>)',r'\1 hidden\2',body)
  body=body.replace('class="campaign-inactive wrap section" hidden','class="campaign-inactive wrap section"')
  body=body.replace('<p class="inactive-heading">','<p class="inactive-heading" role="heading" aria-level="1">')
  body=body.replace('<div data-campaign-content>','<div data-campaign-content hidden>')
  body=body.replace('href="#event"','href="cars.html"').replace('F1 Sim Racing Event <span class="hero-btn-pill">SUMSHODHINI ’26</span>','Explore Fleet')
 (ROOT/f'{slug}.html').write_text(f'''<!doctype html><html lang="en" data-campaign-active="{str(active).lower()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="{e(description)}"><meta name="theme-color" content="#111212"><title>{title} | Force Racing</title><link rel="icon" href="assets/original/favicon.png"><link rel="preload" href="assets/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="styles.css"><script src="campaign-config.js" defer></script><script src="app.js" defer></script><script src="forms.js" defer></script></head><body>{header(slug) if active else re.sub(r'(<a[^>]*data-campaign-promo[^>]*)(>)',r'\1 hidden\2',header(slug))}<main id="main">{body}</main>{footer() if active else re.sub(r'(<aside[^>]*data-campaign-promo[^>]*)(>)',r'\1 hidden\2',footer()).replace('<a href="campaign.html">Sim Racing</a>','')}</body></html>''', encoding='utf-8')

def intro(label,title,copy,num):
 return f'<section class="page-intro wrap"><span class="eyebrow">{label}</span><h1>{title}</h1><div class="page-intro-bottom"><p class="lead muted">{copy}</p><span class="page-index" aria-hidden="true">/ {num}</span></div></section>'

def google(label='Open Google Form'):
 return btn(URL,label,True,True)

def form(kind):
 reg=kind=='registration';rec=kind=='recruitment';labels={'registration':'Register for F1 Sim Racing','contact':'Send Message','sponsor':'Submit Partnership Proposal','recruitment':'Transmit Candidate Application'}
 def field(name,label,telemetry_code,typ='text',required=True,autocomplete=None):
  ident=f'{kind}-{name}'
  return f'''<div class="field"><div class="field-meta"><span class="field-code">{telemetry_code}</span><label for="{ident}">{label}</label></div><input id="{ident}" name="{name}" type="{typ}" required autocomplete="{autocomplete or name}" maxlength="{100 if name=="name" else 160 if name=="organization" else 200 if name=="email" else 30}" aria-describedby="{ident}-error"><p class="field-error" id="{ident}-error" hidden></p></div>'''

 payment_banner = f'''<div class="registration-payment-banner"><span class="tier-badge popular">REGISTRATION TELEMETRY</span><strong>OFFICIAL ENTRY FEE: ₹99 /-</strong><p>Scan and pay ₹99 via UPI to <code>team.force.racing.kitsw@okaxis</code> or pay trackside at the Central Workshop desk. You can attach your payment screenshot below or upload it later using your pass email.</p></div>''' if reg else ''
 screenshot_field = f'''<div class="field"><div class="field-meta"><span class="field-code">05 // PAYMENT PROOF</span><label for="{kind}-screenshot">Payment Screenshot (Optional now, can upload later)</label></div><input id="{kind}-screenshot" name="screenshot" type="file" accept="image/*" aria-describedby="{kind}-screenshot-hint"><p class="small-note" id="{kind}-screenshot-hint">Attach your UPI payment proof or scan trackside to verify.</p></div>''' if reg else ''
 tier_field = f'''<div class="field"><div class="field-meta"><span class="field-code">05 // SPONSORSHIP TIER</span><label for="sponsor-tier">Preferred Partnership Tier</label></div><select id="sponsor-tier" name="tier" class="field-select" onchange="window.selectSponsorshipTier(this.value)"><option value="Title Partner">Title Partner (Championship Exclusive)</option><option value="Gold Partner" selected>Gold Partner (Most Popular)</option><option value="Silver Partner">Silver Partner</option><option value="Bronze Partner">Bronze Partner</option><option value="Technical / In-Kind Parts">Technical &amp; Parts In-Kind</option><option value="Custom Collaboration">Custom Collaboration</option></select></div>''' if kind=='sponsor' else ''
 subsystem_field = f'''<div class="field"><div class="field-meta"><span class="field-code">05 // SUBSYSTEM PREFERENCE</span><label for="recruitment-subsystem">Preferred Division</label></div><select id="recruitment-subsystem" name="tier" class="field-select"><option value="Chassis &amp; Aerodynamics" selected>Chassis &amp; Aerodynamics (CAD, Carbon Fiber, Spaceframe)</option><option value="Powertrain &amp; Engine">Powertrain &amp; Transmission (KTM 390cc, ECU, Dyno Tuning)</option><option value="Suspension &amp; Dynamics">Suspension &amp; Dynamics (Wishbones, Steering, Uprights)</option><option value="Electronics &amp; DAQ">Electronics &amp; Telemetry (DAQ, Sensors, Wire Harness)</option><option value="Corporate PR &amp; Media">Corporate PR, Sponsorship &amp; Media</option></select></div>''' if rec else ''

 return f'''<form class="public-form telemetry-form" data-form="{kind}" method="post" action="/api/submissions" novalidate>{payment_banner}<div class="error-summary" tabindex="-1" hidden></div><div class="form-grid">{field('name','Your full name','01 // PILOT IDENTIFIER' if reg else '01 // CANDIDATE NAME' if rec else '01 // REPRESENTATIVE',required=True)}{field('organization','College / Institution' if reg else 'Roll No · Branch &amp; Year (e.g. B23ME045 · ME 2nd Yr)' if rec else 'Company / Organization','02 // SQUAD' if reg else '02 // ACADEMIC SQUAD' if rec else '02 // ENTITY',required=True,autocomplete='organization')}{field('email','Email address (Mandatory)','03 // COMM LINK',typ='email',required=True)}{field('phone','Mobile / WhatsApp (Mandatory)','04 // DISPATCH FREQ',typ='tel',required=True,autocomplete='tel')}{tier_field}{subsystem_field}{screenshot_field}</div><div class="field"><div class="field-meta"><span class="field-code">06 // TRANSMISSION</span><label for="{kind}-message">{'Message / Race Slot Preference' if reg else 'Why do you want to join Force Racing? (Skills, tools, past projects)' if rec else 'Partnership Scope &amp; Objectives'}</label></div><textarea id="{kind}-message" name="message" rows="4" maxlength="4000" {'required' if not reg else ''} aria-describedby="{kind}-message-error" placeholder="{'Any questions, slot preferences or team notes...' if reg else 'Describe your passion for racing, relevant software skills (SolidWorks, ANSYS, Arduino, etc.), or past workshop experience...' if rec else 'Describe your company and the support you have in mind...'}"></textarea><p class="field-error" id="{kind}-message-error" hidden></p></div><div class="honey" aria-hidden="true"><label for="{kind}-website">Leave this field blank</label><input id="{kind}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div><div class="consent-field"><input id="{kind}-consent" name="consent" type="checkbox" required aria-describedby="{kind}-consent-error"><label for="{kind}-consent">I agree to Force Racing processing these details for {'F1 Sim Racing registration' if reg else 'member candidate evaluation and interview scheduling' if rec else 'partnership correspondence'} and sharing with student coordinators via official Telegram bot. <a href="privacy.html">Read data privacy notice</a>.</label></div><p class="field-error" id="{kind}-consent-error" hidden></p><div class="turnstile-slot"></div><p class="form-status" role="status" aria-live="polite" tabindex="-1"></p><button class="btn race-btn" type="submit">{labels[kind]}{ARROW}</button><p class="small-note form-footnote">{'An official pass and scannable QR credential will be emailed to you immediately upon transmission.' if reg else 'Direct dispatch to Subsystem Leads and Captain. You will receive an official welcoming email and interview call.' if rec else 'Direct dispatch to Force Racing management. We review proposals within 24 hours.'}</p><noscript><p class="small-note">Online forms need JavaScript. You can <a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON}email the team</a> instead.</p></noscript></form>'''

PARTNERS=[('ANSYS','Ansys'),('solidworks','SOLIDWORKS'),('lotus','Lotus'),('ktm','KTM'),('Hoosier','Hoosier Racing Tire'),('wilwood','Wilwood'),('burnout','Burnout'),('ASAP','ASAP'),('fc','FC partner logo'),('sr','SR partner logo'),('rajput','Rajput AutoCorp'),('Composites','Composites partner logo'),('3dfy','3DFY')]

def partners():
 return f'''<section class="section partners"><div class="wrap"><div class="section-top"><div><span class="eyebrow">The people behind the progress</span><h2>THEY BELIEVED<br>IN US.</h2></div><p>Engineering is a team effort. Acknowledging the partners featured in our team's story.</p></div><div class="partner-grid">{''.join('<div class="partner">'+image(n,alt,size=400)+'</div>' for n,alt in PARTNERS)}</div><p class="partner-caption">Partner archive from the original Force Racing website.</p></div></section>'''

BOLT_ICON = '<svg class="icon-bolt" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px;margin-right:6px;" aria-hidden="true"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.08-.14C8.56 10.9 11.5 5.5 13 2h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C14.86 13.9 12 19.5 11 21z"/></svg>'

def hero_section():
 return f'''<section class="home-hero" data-home-hero>
  <picture class="home-hero-bg" data-home-picture>
    <source media="(max-width:760px)" srcset="assets/images/supra26-bic-2000.webp">
    <img data-home-artwork src="assets/images/supra26-bic-wide.webp" alt="Force Racing Formula Student car FR 26 at Buddh International Circuit" fetchpriority="high" decoding="async">
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
      <a class="btn race-btn" data-home-cta href="#event">{BOLT_ICON} F1 Sim Racing Event <span class="hero-btn-pill">SUMSHODHINI ’26</span></a>
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

def event_featured_section():
 return f'''<section class="wrap section event-featured-section" id="event" data-campaign-promo aria-label="F1 Sim Racing Challenge at Sumshodhini ’26">
  <div class="event-featured-card">
    <div class="event-featured-content">
      <div class="badge-strip">
        <span class="badge badge-gold"><span data-campaign="programme">SUMSHODHINI ’26</span></span>
        <span class="badge badge-live"><span data-campaign="date">31 October 2026</span> · <span data-campaign="venue">Central Workshop</span></span>
        <span class="badge badge-fee"><span data-campaign="fee">₹99 per student</span></span>
      </div>
      <span class="eyebrow">Campus Sim Racing Event · Mechanical Engineering</span>
      <h2>F1 SIM RACING <span class="accent">CHALLENGE.</span></h2>
      <p class="lead">Presented by Department of Mechanical Engineering, KITS Warangal. Step into our high-torque direct-drive formula cockpit on <strong>31 October 2026</strong> at the Central Workshop. Compete for podium lap times, cash awards, and Force Racing honours.</p>
      
      <div class="event-telemetry-list">
        <div class="telemetry-row"><span>COCKPIT HARDWARE</span><strong>Direct-drive wheel &amp; formula pedals</strong></div>
        <div class="telemetry-row"><span>TRACK TIME ATTACK</span><strong>Buddh International Circuit hot lap</strong></div>
        <div class="telemetry-row"><span>PILOT CREDENTIAL</span><strong>Instant QR pass dispatched to email</strong></div>
        <div class="telemetry-row"><span>OFFICIAL ENTRY FEE</span><strong>₹99 per student (UPI / Central Workshop desk)</strong></div>
      </div>
      
      <div class="event-actions">
        <a class="btn race-btn" href="campaign.html#register">Book Hot Lap Slot (₹99) {ARROW}</a>
        <a class="btn secondary" href="{URL}" target="_blank" rel="noopener noreferrer">Google Form Alternative {ARROW}</a>
        <a class="btn secondary" href="campaign.html">Event Guide &amp; Contacts {ARROW}</a>
      </div>
      
      <div class="organizer-strip">
        <span>Trackside Help: </span>
        Md. Shoaib (<a href="tel:+919951835213">{PHONE_ICON} 99518 35213</a>) · 
        Md. Sohail (<a href="tel:+918008391525">{PHONE_ICON} 80083 91525</a>) · 
        S. Arun (<a href="tel:+918328012134">{PHONE_ICON} 83280 12134</a>) · 
        S. Karthik (<a href="tel:+919392382245">{PHONE_ICON} 93923 82245</a>) · 
        D. Mahidhar (<a href="tel:+919030521196">{PHONE_ICON} 90305 21196</a>)
      </div>
    </div>
    
    <div class="event-poster-card">
      <a href="campaign.html" title="Explore F1 Sim Racing event details">
        <img src="assets/images/campaign-poster.webp" alt="F1 Sim Racing Challenge Official Poster - Sumshodhini ’26, KITS Warangal" class="event-poster-img" loading="lazy" decoding="async">
      </a>
      <div class="event-poster-meta">
        <span>Official Sumshodhini ’26 Poster</span>
        <a href="assets/original/campaign-poster.png" target="_blank" rel="noopener noreferrer">Open full poster ↗</a>
      </div>
    </div>
  </div>
</section>'''

def eventstrip():
 return f'''<section class="event-strip" data-campaign-promo aria-label="F1 Sim Racing event"><div class="wrap event-strip-inner"><div><span class="eyebrow">SUMSHODHINI ’26 · Campus event</span><h2>YOUR TURN AT THE WHEEL.</h2><p><span data-campaign="name">F1 Sim Racing</span> · <span data-campaign="date">31 October 2026</span> · <span data-campaign="venue">Central Workshop</span> · <span data-campaign="fee">₹99 per student</span></p></div>{btn('campaign.html','Explore the event')}</div></section>'''

def simulator_section():
 return f'''<section class="simulator-section wrap reveal" data-campaign-promo><div class="simulator-card"><picture><source media="(max-width:760px)" srcset="assets/images/simulator-wheel-800.webp"><img src="assets/images/simulator-wheel-1440.webp" width="1440" height="811" alt="Carbon racing simulator wheel in a dark studio. Campaign concept artwork; actual event equipment is not verified." loading="lazy" decoding="async"></picture><div class="simulator-card-copy"><span class="eyebrow">The sim racing experience</span><h2>ALL THE<br>FOCUS.<br>YOUR TURN.</h2><p>Step into the racing spirit at <span data-campaign="programme">SUMSHODHINI ’26</span>.</p></div><div class="simulator-card-bottom">{btn('campaign.html#register','Explore the event')}<span class="artwork-note">Campaign concept artwork · Event equipment may differ</span></div></div></section>'''

HOME=f'''{hero_section()}{event_featured_section()}<section class="section wrap reveal"><span class="eyebrow">01 / This is Force Racing</span><div class="intro-grid"><h2>WE DON’T JUST<br>STUDY IT.<br>WE BUILD IT.</h2><div class="intro-copy"><p class="lead">We are the Formula Student team of Kakatiya Institute of Technology &amp; Science, Warangal.</p><p class="muted">Established in 2009, Force Racing brings students from the classroom to the workshop. We design, manufacture and compete with formula-style race cars in national and international Formula Student competitions.</p><a class="text-link" href="team.html">Meet the force {ARROW}</a><div class="stats"><div class="stat"><strong>2009</strong><span>Our story began</span></div><div class="stat"><strong>60</strong><span>Members in our team story</span></div><div class="stat"><strong>01</strong><span>Shared pursuit</span></div></div></div></div></section><section class="wrap section reveal" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">02 / Built to compete</span><h2>IDEAS BECOME<br>MACHINES.</h2></div><p class="muted">Every chassis carries the thinking, making and persistence of the students behind it.</p></div><div class="feature-car"><picture><source media="(max-width:760px)" srcset="assets/images/supra26-bic-phone.webp"><img src="assets/images/supra26-bic-wide.webp" width="1200" height="750" alt="FR 26, the team’s red Formula Student car in the pit lane" loading="lazy" decoding="async"></picture><div class="feature-car-copy"><span class="eyebrow">The 2026 chapter</span><h3>FR 26</h3><p>SUPRA SAE India 2026</p></div><div class="feature-bottom">{btn('cars.html','Explore our car history',True)}</div></div><div class="photo-caption"><span>FR 26 · Original team photography</span><span>ENGINEERING, MADE REAL.</span></div></section><section class="section wrap team-story reveal">{image('heroimg','Force Racing students gathered behind their blue and white race car')}<div><span class="eyebrow">03 / More than the machine</span><h2>ONE TEAM.<br>EVERY DETAIL.</h2><p class="muted">Our mission is to develop industry-ready engineers through rigorous technical execution, business practice and project management. Primarily from Mechanical Engineering, our team learns by taking responsibility for the whole car.</p><p class="muted">Our alumni have progressed into high-performance motorsport, including Formula 1, engineering consultancy and other engineering sectors.</p><a class="text-link" href="team.html">Get to know the team {ARROW}</a></div></section>{partners()}<section class="section wrap campaign-teaser reveal" data-campaign-promo><div><span class="eyebrow">04 / See you on campus</span><h2>THE NEXT DRIVER<br>COULD BE YOU.</h2><p class="lead">F1 Sim Racing at SUMSHODHINI ’26.</p><p class="muted">The Department of Mechanical Engineering presents a campus sim racing event at KITS Warangal.</p><div class="event-inline"><span>31 OCTOBER 2026</span><span>CENTRAL WORKSHOP</span><span>₹99 / STUDENT</span></div>{btn('campaign.html','Explore &amp; register')}</div><a href="campaign.html" aria-label="Explore the F1 Sim Racing event">{rawimage(cfg('poster'),'F1 Sim Racing event poster. 31 October 2026, Central Workshop, ₹99 per student.')}</a></section>'''

write('index','Dream. Build. Race.','Force Racing, the Formula Student team from KITS Warangal. Meet our cars, our team and F1 Sim Racing at SUMSHODHINI ’26.',HOME)

def car_picture(photo,name,high=False):
 return f'''<picture class="car-photo-frame"><source media="(max-width:760px)" srcset="assets/images/{photo}-phone.webp"><img src="assets/images/{photo}-wide.webp" alt="{e(name)} — archived Force Racing vehicle photograph" width="1200" height="750" class="car-img" {'fetchpriority="high"' if high else 'loading="lazy"'} decoding="async"></picture>'''

CATEGORIES=[
 ('formula','Formula Student','01 / Formula Student','THE FORMULA ARCHIVE.','Single-seater, open-wheel competition race cars designed, manufactured, and campaigned by Force Racing across national and international circuits.',[('FR 26','supra26-bic',['SUPRA SAE INDIA 2026']),('FR 19','fr19',['FORMULA BHARAT 2020','SUPRA SAE INDIA 2019','FFS FMAE 2019']),('FR 18','ffs18',['FFS FMAE 2018']),('FR 17','fr17',['FORMULA BHARAT 2017','SAE SUPRA INDIA 2017','FFS FMAE 2017']),('FR 16','fr16',['SUPRA SAE INDIA 2016']),("LEGIONS’ F1",'legions12',['SAE SUPRA INDIA 2012'])]),
 ('karting','Karting','02 / Sprint Karting','PRECISION & SPEED.','High-agility sprint karts engineered for national karting championships, honing chassis dynamics and rapid track iteration.',[('KART 3','ikr',['INDIAN KARTING RACE 2024']),('KART 2','kart2',['NEKC 2020']),('KART 1','kart1',['NEKC 2018','NEKC 2019'])]),
 ('exploration','Beyond formula','03 / Pioneering & BAJA','WHERE WE BEGAN.','From rugged all-terrain BAJA buggies to high-efficiency human-electric endurance vehicles, the pioneering machines that laid our team foundation.',[('RATHAM','ratham',['EFFI-CARS 2015']),('EFFICYCLE','efficycle',['SAE NIS EFFICYCLE 2017']),('PHOENIX RACING','phoenix',['SAE NIS EFFICYCLE 2015']),('ASHWASENA','ashwasena',['SAE NIS EFFICYCLE 2013']),('TERRANAUT','baja11',['SAE BAJA INDIA 2011']),('MAIDEN MOB','baja10',['SAE BAJA INDIA 2010'])])
]

car_idx=1
category_sections=[]
for cat_id,cat_short,cat_num,cat_title,cat_lead,cars in CATEGORIES:
 car_rows=[]
 for name,photo,events in cars:
  car_rows.append(f'<article class="car-row" id="car-{car_idx}"><span class="car-number">{car_idx:02}</span>{car_picture(photo,name,high=car_idx==1)}<div class="car-info"><span class="eyebrow">{e(cat_short)}</span><h2>{e(name)}</h2><ul class="car-events">'+''.join(f'<li>{e(ev)}</li>' for ev in events)+'</ul></div></article>')
  car_idx+=1
 category_sections.append(f'<section class="car-category-section" id="{cat_id}"><div class="category-header"><span class="eyebrow">{cat_num}</span><h2>{cat_title}</h2><p class="lead muted">{cat_lead}</p></div><div class="car-archive">{"".join(car_rows)}</div></section>')

write('cars','Our machines','Explore every vehicle in the Force Racing archive, from FR 26 to the team’s earliest BAJA and Efficycle projects.',intro('The machine archive','BUILT. TESTED.<br>REMEMBERED.','Every car is a chapter. Explore the vehicles and competition entries published in our team archive.','01')+f'<div class="wrap"><nav class="subnav" aria-label="Vehicle categories"><a href="#formula">Formula Student {ARROW_DOWN}</a><a href="#karting">Karting {ARROW_DOWN}</a><a href="#exploration">Beyond formula {ARROW_DOWN}</a></nav>{"".join(category_sections)}<p class="small-note">Competition participation is reproduced from the original team website. Technical specifications and rankings have not been published here.</p></div>')

TEAM=[('Dhanush','Captain','Steering & Wheels'),('Arun','Vice-captain','Power-train'),('Sohail','Team manager','Chassis'),('Hanumanth','','Chassis'),('Jeevan','','Chassis · Logistics'),('Navya','','Chassis'),('J Harsha','','Suspension'),('Prashanth','','Suspension'),('Karthik','','Power-train'),('Rakesh','','Power-train'),('Dhanya','','Public relations · Power-train'),('Mahidhar','','Brakes · Finance'),('P Harsha','','Brakes'),('Ruthvik','','Steering & Wheels'),('Ashish','','Social media')]
roster=''.join(f'<article class="roster-row"><span class="num">{i+1:02}</span><h3>{name}</h3><p class="role">{role}</p><p class="discipline">{d}</p></article>' for i,(name,role,d) in enumerate(TEAM))
write('team','The people behind the machine','Meet the students behind Force Racing at KITS Warangal: engineering, teamwork and a shared drive to build.',intro('The people behind the machine','MANY MINDS.<br>ONE FORCE.','Students. Engineers. Teammates. We turn shared ambition into something we can take to the track.','02')+image('heroimg','Force Racing students with their blue and white race car','wide-photo',True)+f'<section class="section wrap reveal"><div class="intro-grid"><div><span class="eyebrow">A workshop. A proving ground.</span><h2>THE CAR IS<br>ONLY THE<br>BEGINNING.</h2></div><div class="intro-copy"><p class="lead">Established in 2009, our team story describes 60 students, primarily from Mechanical Engineering.</p><p class="muted">Each year, we design, manufacture and compete with a formula-style race car. Along the way we learn to connect technical execution with structured business and project management.</p><p class="muted">Our mission is to develop industry-ready engineers. Alumni have progressed into high-performance motorsport, including Formula 1, engineering consultancy and diverse engineering sectors.</p></div></div></section><section class="wrap section" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">The published team roster</span><h2>MEET THE<br>BUILDERS.</h2></div><p class="muted">The 15 named team members featured on our original team page. This is the published roster, rather than a full list of every team member.</p></div><div class="roster">{roster}</div></section>'+eventstrip())

def tiers():
 return f'''<section class="section wrap" id="tiers" style="padding-top:0"><div class="section-top"><div><span class="eyebrow">Championship Partnerships</span><h2>PARTNERSHIP<br>TIERS.</h2></div><p class="muted">High-impact brand integration across SUPRA SAE INDIA and Formula Bharat national competitions. Click any tier below to inspect telemetry allocation and engage that tier’s dedicated partner protocol.</p></div><div class="tier-grid">
<div class="tier-card title-tier"><div class="tier-badge">EXCLUSIVE // 1 SLOT</div><h3>TITLE PARTNER</h3><p class="tier-desc">Primary championship naming partner and dominant vehicle livery placement.</p>
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

<div class="tier-card featured-tier"><div class="tier-badge popular">MOST POPULAR</div><h3>GOLD PARTNER</h3><p class="tier-desc">Prominent aerodynamic fairing and official team race suit branding.</p>
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

<div class="tier-card"><div class="tier-badge">AERODYNAMICS</div><h3>SILVER PARTNER</h3><p class="tier-desc">Chassis sidepod branding and digital media coverage.</p>
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
<ul class="tier-perks"><li>Lower Sidepod &amp; Chassis Livery Branding</li><li>Team Apparel Sleeve Placement</li><li>Website &amp; Event Media Recognition</li><li>2 All-Access Paddock Passes</li></ul><a href="#sponsor" class="btn secondary tier-btn" onclick="window.selectSponsorshipTier('Silver Partner');">Select Silver Tier {ARROW}</a></div>

<div class="tier-card"><div class="tier-badge">GRASSROOTS</div><h3>BRONZE PARTNER</h3><p class="tier-desc">Entry-level patron tier supporting young engineering talent.</p>
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
<ul class="tier-perks"><li>Chassis Livery Supporting Badge</li><li>Digital Logo on Official Website &amp; Reports</li><li>Official Force Racing Citation &amp; Team Merch</li></ul><a href="#sponsor" class="btn secondary tier-btn" onclick="window.selectSponsorshipTier('Bronze Partner');">Select Bronze Tier {ARROW}</a></div>
</div></section>'''

def technical_partners():
 return f'''<section class="section wrap" style="padding-top:0"><div class="contribution"><div><span class="eyebrow">Technical &amp; In-Kind Collaboration</span><h2>ENGINEER<br>WITH US.</h2></div><div><p class="lead">We partner with manufacturing, tooling, and materials leaders to push Formula Student boundaries.</p><p class="muted">From raw aerospace alloys, carbon fiber supplies, 5-axis CNC machining, dynamometer tuning, to CAE simulation licenses (Ansys, SolidWorks), in-kind technical partnerships power our cars onto the national podium.</p><div class="actions"><a class="btn" href="#sponsor" onclick="document.getElementById('sponsor-tier').value='Technical / In-Kind Parts'">Propose In-Kind Collaboration {ARROW}</a></div></div></div></section>'''

write('support','Championship Partnerships','Support Force Racing’s engineering journey through partnerships, components and sponsorship proposals.',intro('Championship Partnerships','FUEL THE<br>NEXT LAP.','Your brand on the national grid. Back student engineers competing at Formula Bharat and SUPRA SAE India.','03')+f'<div class="wrap support-quicknav"><a class="btn" href="#tiers">Explore sponsorship tiers {ARROW}</a><a class="btn secondary" href="#sponsor">Submit partnership proposal {ARROW}</a></div><div class="wrap support-photo">{image("heroimg","Force Racing team and their student-built car","wide-photo",True)}</div><section class="section wrap reveal"><span class="eyebrow">How sponsorship accelerates the car</span><h2>WHERE YOUR<br>SUPPORT GOES.</h2><div class="support-lines"><article class="support-line"><span>01</span><h3>POWERTRAIN &amp;<br>COMPONENTS</h3><p>Procuring specialized racing bearings, KTM engine parts, custom ECU wiring, and high-performance fasteners.</p></article><article class="support-line"><span>02</span><h3>CHASSIS &amp;<br>COMPOSITES</h3><p>Fabrication of 4130 chromoly spaceframe chassis, carbon fiber prepreg aerodynamic wings, and impact attenuators.</p></article><article class="support-line"><span>03</span><h3>TESTING &amp;<br>TRACK TELEMETRY</h3><p>Tire sets (Hoosier), suspension calibration, dynamometer validation, and national competition logistics.</p></article></div></section>{tiers()}{technical_partners()}{partners()}<section class="section wrap form-section" id="sponsor"><div class="form-heading"><span class="eyebrow">Partnership Proposal</span><h2>PARTNER<br>WITH FORCE.</h2><p class="muted">Tell us about your organization and how you want to join our Formula Student championship campaign.</p><div class="direct-contact-note"><p>Direct line to team manager:</p><a class="text-link" href="tel:+918008391525">{PHONE_ICON} +91 80083 91525</a></div></div>{form("sponsor")}</section>')

write('contact','Get in touch','Contact Force Racing at the Central Workshop, KITS Warangal, by email, phone or on-site enquiry.',intro('From a conversation to the workshop','LET’S TALK<br>RACING.','Have a question, an idea or a way to help? Start a conversation with Force Racing.','04')+f'<section class="section wrap contact-grid" style="padding-top:0"><div><div class="contact-item"><span class="eyebrow">01 / Visit the workshop</span><h2>KITS WARANGAL</h2><address>Central Workshop<br>Kakatiya Institute of Technology &amp; Science<br>Warangal – 506015, Telangana, India</address><p class="small-note">Hanamkonda, Telangana</p><a href="https://www.google.com/maps/search/?api=1&amp;query=Force+Racing+India+KITS+Warangal" target="_blank" rel="noopener noreferrer">Get directions</a></div><div class="contact-item"><span class="eyebrow">02 / Team manager</span><a href="tel:+918008391525">{PHONE_ICON} +91 80083 91525</a></div><div class="contact-item"><span class="eyebrow">03 / Email the team</span><a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON} team.force.racing.kitsw@gmail.com</a></div><div class="contact-item"><span class="eyebrow">04 / Follow the journey</span><div class="social-links">'+''.join(f'<a href="{u}" target="_blank" rel="noopener noreferrer">{n}</a>' for n,u in SOCIAL)+f'</div></div></div>{image("supra26-bic","FR 26 in the pit lane at Buddh International Circuit","contact-photo",True,size=2000)}</section><section class="section wrap form-section" id="contact-form"><div class="form-heading"><span class="eyebrow">Send an enquiry</span><h2>START A<br>CONVERSATION.</h2><p class="muted">A message for the people behind the machine.</p></div>{form("contact")}</section>')

FAQ=[('When and where is the event?','F1 Sim Racing is on 31 October 2026 at the Central Workshop, Kakatiya Institute of Technology & Science, Warangal. Contact the organizers before planning your visit.'),('How much does registration cost?','The official registration fee is ₹99 per participant. You can pay via UPI or at the Central Workshop desk. A digital scannable QR Pilot Credential will be dispatched to your email immediately upon submission.'),('How do I register?','Complete the on-site registration form above to get your official Pilot Pass ID and QR code, or use the alternative Google Form linked from the event poster.'),('Does the Google Form require sign-in?','Yes. The registration link from the poster redirects signed-out visitors to Google sign-in. Open it in your browser and sign in to continue.'),('Are game details, timings or prizes confirmed?','Contact student organizer Md. Sohail on +91 80083 91525 for specific simulation slot schedules, hardware telemetry, and track regulations.'),('Who is presenting the event?','The Department of Mechanical Engineering at Kakatiya Institute of Technology & Science, Warangal, presents the event under SUMSHODHINI ’26.')]
faq=''.join(f'<details><summary>{q}</summary><p>{e(a)}</p></details>' for q,a in FAQ)

write('campaign','F1 Sim Racing · 31 October 2026','F1 Sim Racing at SUMSHODHINI ’26, KITS Warangal. 31 October 2026, Central Workshop. ₹99 per student. Registration details and organizer contacts.',f'''<div class="campaign-inactive wrap section" hidden><span class="eyebrow">Force Racing</span><p class="inactive-heading">OFF THE GRID.<br>STAY IN THE LOOP.</p><p class="lead muted">This campaign is no longer active. Registration requests are closed. Contact the team for the latest events.</p><div class="actions">{btn('index.html','Explore Force Racing')}{btn('contact.html','Contact the team',True)}</div></div><div data-campaign-content><section class="campaign-hero wrap"><span class="eyebrow">SUMSHODHINI ’26 · KITS Warangal</span><h1 data-campaign-heading>F1 SIM<span>RACING.</span></h1><p class="lead">Your turn at the wheel.<br>The Department of Mechanical Engineering presents F1 Sim Racing at SUMSHODHINI ’26.</p><div class="actions">{btn('#register','<span data-campaign-cta>Register for sim racing</span>')}{google('Open Google registration')}</div><p id="google-note" class="registration-note">Google Form alternative · Google sign-in required · Opens a new tab</p><dl class="event-facts"><div><dt>THE DATE</dt><dd data-campaign="date">31 October 2026</dd></div><div><dt>THE VENUE</dt><dd data-campaign="venue">Central Workshop</dd></div><div><dt>REGISTRATION FEE</dt><dd data-campaign="fee">₹99 per student</dd></div><div><dt>PRESENTED BY</dt><dd>Mechanical<br>Engineering</dd></div></dl></section><section class="section wrap poster-section" data-campaign-poster><figure>{rawimage(cfg('poster'),'Original F1 Sim Racing poster: SUMSHODHINI ’26, Department of Mechanical Engineering, KITS Warangal. 31 October 2026. Central Workshop. ₹99 per student. Organizer contacts are listed below.',high=True)}<figcaption><span>Event poster supplied by the organizers.</span><a href="{cfg('posterOriginal')}" target="_blank" rel="noopener noreferrer">Open full-size poster</a></figcaption></figure></section>{simulator_section()}<section class="section wrap form-section" id="register"><div class="form-heading"><span class="eyebrow">F1 Sim Racing · Registration</span><h2>TAKE THE<br>FIRST STEP.</h2><p class="muted">Register for 31 October at the Central Workshop. Enter your details to receive your official Pilot Pass ID and QR Credential.</p><div class="contact-item"><span class="eyebrow">Need help?</span><p>Md. Sohail · Student organizer</p><a href="tel:+918008391525">{PHONE_ICON} +91 80083 91525</a></div></div><div>{form('registration')}<div class="google-alternative"><h3>Prefer the poster’s form?</h3><p class="small-note">Google sign-in is required. Please use one registration route.</p>{google()}</div></div></section><section class="section wrap faq-layout reveal"><div><span class="eyebrow">Before you join us</span><h2>A FEW<br>ANSWERS.</h2></div><div class="faq-list">{faq}</div></section><section class="section wrap" style="padding-top:0"><span class="eyebrow">The organizing team</span><h2>SEE YOU AT<br>THE WORKSHOP.</h2><div class="organizer-grid"><div><h3>STUDENT ORGANIZERS</h3><ul><li>Md. Shoaib · <a href="tel:+919951835213">{PHONE_ICON} 99518 35213</a></li><li>Md. Sohail · <a href="tel:+918008391525">{PHONE_ICON} 80083 91525</a></li><li>S. Arun · <a href="tel:+918328012134">{PHONE_ICON} 83280 12134</a></li><li>S. Karthik · <a href="tel:+919392382245">{PHONE_ICON} 93923 82245</a></li><li>D. Mahidhar · <a href="tel:+919030521196">{PHONE_ICON} 90305 21196</a></li></ul></div><div><h3>STUDENT COORDINATOR</h3><p class="muted">Bairi Divya Reddy<br>President, MESA<br><a href="tel:+918919184467">{PHONE_ICON} 89191 84467</a></p><h3>HEAD OF DEPARTMENT</h3><p class="muted">Dr. P. Srikanth<br>Head &amp; Professor of ME</p></div><div><h3>FACULTY COORDINATORS</h3><p class="muted">Dr. S. Chandramouli<br>Dr. A. HariKumar<br>Dr. Md. Sameer<br>Assistant Professors of ME</p></div><div><h3>MESA FACULTY COORDINATORS</h3><p class="muted">Dr. A. Devaraju · Associate Professor of ME<br>Dr. V. Pradeep · Assistant Professor of ME</p></div></div></section></div>''')

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

<section class="section wrap form-section" id="recruitment-form">
  <div class="form-heading">
    <span class="eyebrow">Candidate Application Protocol</span>
    <h2>JOIN THE<br>SQUAD.</h2>
    <p class="muted">Fill in your academic and technical details. All applications are reviewed by team captains and subsystem leads.</p>
    <div class="direct-contact-note">
      <p>Questions about joining?</p>
      <a class="text-link" href="tel:+918008391525">{PHONE_ICON} Md. Sohail (+91 80083 91525)</a>
    </div>
  </div>
  {form("recruitment")}
</section>'''

write('recruitment','Team Recruitment · Force Racing','Join Force Racing at KITS Warangal. Student recruitment for Chassis, Powertrain, Suspension, Electronics, and Media subsystems.',intro('Join Force Racing','BECOME THE<br>NEXT BUILDER.','Step out of the classroom and onto the grid. Join the Formula Student engineering squad.','05')+RECRUITMENT_CONTENT)

PRIVACY_CONTENT = f'''<section class="section wrap privacy-copy" style="padding-top:0">
<h2>Data Transparency on Pit Lane</h2>
<p class="lead">Force Racing is a student-run Formula Student engineering team at Kakatiya Institute of Technology &amp; Science, Warangal. We stand for technical integrity, direct accountability, and genuine respect for your personal information. Here is our straightforward, honest data commitment.</p>

<h2>1. What We Collect</h2>
<p>When you register for F1 Sim Racing or submit a sponsorship proposal, we collect only the necessary details you explicitly enter:</p>
<ul class="tier-perks" style="margin-bottom: var(--gp-space-5);">
  <li><strong>Your Name &amp; Email Address</strong>: To generate your official Pilot Pass ID and dispatch your scannable QR credential.</li>
  <li><strong>Mobile Number</strong>: For immediate trackside SMS/WhatsApp check-in at the Central Workshop pit lane.</li>
  <li><strong>College / Institution or Organization</strong>: To verify student admission or corporate partnership status.</li>
  <li><strong>Payment Screenshot</strong>: To verify your ₹99 entry fee trackside so you can enter the racing simulator cockpit without delay.</li>
</ul>

<h2>2. No Trackers, No Cookies, No Data Selling</h2>
<p>We do not use tracking pixels, invasive analytics, third-party advertising cookies, or behavioral trackers. We will <strong>NEVER</strong> sell, rent, monetize, or disclose your contact details to third-party marketing companies.</p>

<h2>3. Where Your Information is Stored</h2>
<p>Your details are stored securely in:</p>
<ul class="tier-perks" style="margin-bottom: var(--gp-space-5);">
  <li>Our team's private, encrypted Cloudflare database (D1).</li>
  <li>Our master event Google Sheet on our official KITS Warangal Google Drive workspace.</li>
  <li>Payment screenshots are stored in a dedicated, restricted Google Drive folder ("Force Racing Payment Proofs") accessible only to authorized student organizers (Md. Sohail, S. Arun, Dhanush).</li>
</ul>

<h2>4. Immediate Deletion Upon Request</h2>
<p>You have full ownership of your data. If you want your registration record or payment proof permanently erased from our records, email us at <a href="mailto:team.force.racing.kitsw@gmail.com">{MAIL_ICON} team.force.racing.kitsw@gmail.com</a> with your Pass ID, and we will purge your row within 24 hours.</p>
</section>'''

write('privacy','Data Privacy & Transparency','Data transparency notice for Force Racing: straightforward, student-run accountability with zero tracking or data selling.',intro('Pit Lane Transparency','YOUR DATA.<br>OUR RESPECT.','Straightforward, student-run accountability. Zero ad trackers, zero data selling.','06')+PRIVACY_CONTENT)

print('Built 8 static pages.')
