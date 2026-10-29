# Caller Dialer Module (`site/modules/caller-dialer/`)

SpaceX-standard dialer integration eliminating all ugly brackets and raw phone number displays across Force Racing.

## Directives Fulfilled
1. **Zero Cheap Hacks**: Eliminates bracketed phone numbers (e.g. `Md. Sohail (+91 80083 91525)`).
2. **Exact Typography**: Names render in baseline site typography (`var(--gp-font-body)` or `var(--gp-font-head)`).
3. **Dedicated Crisp Caller Icon**: Modern phone handset SVG with crisp micro-interactions:
   - Subtle hover pulse & handset tilt (150ms ease-out)
   - 60fps instant active press scale feedback (scale 0.92)
   - Minimum 48px – 52px touch target on mobile via pseudo-element expander
4. **Native Dialer Integration**: Directly invokes device dialer via `tel:+91...`.
5. **Baseline Design Immutability**: No global `--gp-*` overrides or global CSS pollution. Completely self-contained.

## Usage

### 1. In HTML Head
```html
<link rel="stylesheet" href="modules/caller-dialer/caller-dialer.css">
<script src="modules/caller-dialer/caller-dialer.js" defer></script>
```

### 2. Static HTML Snippet (Inline Variant)
```html
<a href="tel:+918008391525" class="fr-caller-link" aria-label="Call Md. Sohail">
  <span class="fr-caller-name">Md. Sohail</span>
  <span class="fr-caller-icon-badge" aria-hidden="true">
    <svg class="fr-caller-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  </span>
</a>
```

### 3. Card Variant (e.g. Need Help / Recruitment / Contact)
```html
<div class="fr-caller-card">
  <div class="fr-caller-card-info">
    <span class="fr-caller-name">Md. Sohail</span>
    <span class="fr-caller-role muted">Student Organizer</span>
  </div>
  <a href="tel:+918008391525" class="fr-caller-btn" aria-label="Call Md. Sohail">
    <!-- SVG -->
    <span class="fr-caller-btn-text">Call Coordinator</span>
  </a>
</div>
```

### 4. Dynamic JavaScript API
```javascript
// Render HTML string
const html = window.CallerDialer.render('Md. Sohail', '+91 80083 91525', { variant: 'inline' });

// Auto-upgrade declarative elements
// <div data-caller-dialer data-name="Md. Sohail" data-phone="+918008391525"></div>
window.CallerDialer.init();
```
