# Components and states

## Native elements, always

| Need | Element | Not |
|---|---|---|
| Go somewhere (a page, `wa.me`, `tel:`, Maps) | `<a href>` | a `button` with a click handler |
| Do something on this page | `<button type="button">` | a clickable `div` or `span` |
| Show/hide a block (FAQ, menu section) | `<details><summary>` | a hand-made accordion |
| A modal (a gallery, an order sheet) | `<dialog>` + `showModal()` | a fixed `div` |
| A menu that opens | `<button aria-expanded aria-controls>` + a list, or the Popover API | hover-only menus |

Why: native elements give keyboard support, focus handling and screen-reader meaning for free,
and they keep working when our script fails. State lives in ARIA attributes and CSS reads it:
`[aria-expanded="true"]`, `[aria-current="page"]`, `[aria-pressed="true"]`, `[aria-invalid="true"]`.
Do not add `.is-open` classes that duplicate these.

## Every control has every state

| State | Rule |
|---|---|
| Rest | meets contrast (colour.md); its border is ≥ 3:1 if the border is what shows it is a control |
| Hover | only under `@media (hover: hover)`, so touch screens don't keep a sticky hover. A colour or shadow change in ≤ `--gp-dur-quick` |
| Focus | `:focus-visible { outline: 2px solid var(--gp-focus); outline-offset: 2px; }`, ≥ 3:1 against the ground. Never `outline: none` without a replacement (WCAG 2.4.7) |
| Press | `transform: scale(.96)` on `:active` (never below .95); transition `transform var(--gp-dur-quick) var(--gp-ease-out)` |
| Disabled | avoid it. Explain instead. If unavoidable: `aria-disabled="true"`, keep it focusable, and keep the text ≥ 4.5:1 |
| Loading | the label changes ("Sending…") and the width stays fixed (`min-inline-size`), plus `aria-busy="true"` |
| Error | see forms |
| Selected / current | colour **and** one more cue: weight, an underline, a check icon, a fill |

Tap targets: 44×44 CSS px or more for buttons, icon links, nav links and form controls (Apple
HIG; WCAG 2.5.8's floor is 24). Links inside a sentence are exempt. Grow a small icon's hit
area with padding or `::after { inset: -8px }`, not by enlarging the icon. Keep at least 8px
between two targets.

## Buttons

- One primary style (accent fill), one secondary (outline or tint), one text style. Never more.
- Label = verb + object: "WhatsApp us", "Call 98xxx", "Get directions", "See the menu". Never
  "Submit", "Click here" or "Learn more" alone.
- At least 44px tall, horizontal padding `--gp-space-4`, text 15px or more, weight 500–600.
- An icon sits beside the label, not instead of it, except in a toolbar where every icon has an
  `aria-label` and a tooltip.

## Forms (GOV.UK patterns: the most-tested form rules there are)

- The label sits above the field and is always visible. A placeholder is never the label; use it
  only for an example format ("e.g. 98765 43210").
- Input text 16px or more, 44px or more tall, border ≥ 3:1 (`--gp-ink-3`, not the library `--gp-line-2`).
- Right keyboard: `type="tel" inputmode="tel" autocomplete="tel"`, `type="email"`,
  `autocomplete="name"`, `inputmode="numeric"` for counts. Why: fewer taps, and fewer mistakes.
- Ask for the fewest fields: name, phone, one message or a choice. Every extra field loses people.
- Mark optional fields "(optional)". Do not scatter asterisks.
- Validate on submit, not while the person is typing. On error:
  - the field gets `aria-invalid="true"` and `aria-describedby` pointing at a visible message;
  - the message names the fix ("Enter a 10-digit mobile number"), not "Invalid input";
  - the message shows an icon or the word "Error" as well as the colour `--gp-danger` (WCAG 1.4.1);
  - with two or more errors, show a summary at the top that links to each field, and move focus to it.
- Never show "Message sent" for something that was not sent. A WhatsApp form hands off to WhatsApp;
  say "Opens WhatsApp with your message ready to send."
- Consent (DPDP Act 2023) is an **unticked** checkbox that names the business and the purpose.

## Cards, lists, menus

- A card that links somewhere is one link: make the heading the `<a>` and stretch it with
  `::after { position: absolute; inset: 0 }`. Never nest buttons inside a card link.
- Prices: right-aligned, tabular numbers, with the currency written once per list ("₹" beside each price is fine).
- Veg / non-veg / allergens: use the standard symbols as SVG, with a text alternative.

## Dialogs and sheets

- `<dialog>` opened with `showModal()`: focus moves inside, Esc closes it, and the background is inert.
  On close, focus returns to the trigger.
- It enters with `--gp-dur-fast` (scale .96 → 1 plus opacity) and exits with `--gp-dur-quick`. Never a
  bounce on close.
