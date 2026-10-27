---
name: gale-presenter
description: The Galeport demo kit and presenter, and the pitch clip — start/stop/phone launchers, one local port per client, and /__present.html with Light/Dark/Auto theme glide, a phone frame with corner awareness, and keyboard control (L D A P H) — plus the check that proves a demo works before Krishna walks into a meeting. Use whenever a client demo is set up, started, shown, presented, pitched, rehearsed, "made ready for the meeting", shown on a phone, or when the presenter, launchers, phone frame or theme buttons misbehave; also after any change to a demo site before it is presented. Every Galeport client with a site/ gets this presenter. Not for deploying live sites or for galeport.com.
---

# Gale presenter

Krishna presents alone, in a shop or a clinic, often on a laptop with patchy Wi-Fi. The demo
must start with a double-click, run offline, look its best at first glance, and let him switch
theme and phone view with one key while the owner watches, with no AI agent in the room.
This skill owns everything that makes that happen. The **gale** skill decides when a demo
exists. **gale-design** decides how the site itself looks.

## Install (every client with a `site/`)

```sh
AI/skills/gale-presenter/scripts/install-demo-kit.sh <client-dir> "<Display Name>" <port>
```

- Pick a port no other client uses: `grep -h PORT clients/*/*/tools/demo.conf`.
- This writes `start.command`, `stop.command` and `start-on-phone.command` at the client root, and
  `tools/serve.py`, `tools/demo.conf` and `tools/present.html` (only when the client has no
  presenter yet; the installer never overwrites a client's copy).
- One port serves everything: `/` is `site/`, `/__present.html` is the presenter,
  `/pitch/` is `pitch/public/`, and `/film-player/` is shown when present. Link between them with
  same-server paths, never `:port` URLs. Nothing else in the client folder is ever served.
- The presenter lives in `tools/`, never in `site/`, so it can never be deployed.

## What the presenter does

| Key / button | Effect |
|---|---|
| **L** / **D** / **A** | Light, Dark, Auto (follow the device). The site's theme **glides** (900ms), only on this choice |
| **P** | Phone frame (402×874 by default), with the site's fixed bars kept clear of the rounded corners |
| **H** | Hide or show the bar, for a clean screen in front of the owner |

Every key press shows on its button, so the owner sees what changed. The theme and phone
choices are remembered. The frame's ground reads the site's own background, so resizing never
flashes white. The theme buttons hide on a site with no dark mode. On a reload with Dark
remembered, nothing fades in: the site's theme CSS must follow
`gale-design/references/theme-transition.md`.

## Tune for a client (only when it helps the pitch)

Copy the kit's `present.html` as the client's `tools/present.html` and change only the
`:root` colours (tint the stage towards the brand's darkest tone), the `<title>`, the
iframe title and, if the site uses a phone-first width, the frame size. Keep the script as it is:
the generic behaviour is what the check proves. Examples: Baked in Goa (warm stage, DM Sans,
414px) and Greenland Bistro (green stage, page buttons).
Optional page buttons: add `<button type="button" data-page="/menu/">Menu</button>` in the bar.

## Prove it before the meeting

```sh
node AI/skills/gale-presenter/scripts/check-demo.mjs <client-dir>          # add --keep to leave it running
```

It runs the client's own `start.command` twice (a repeat start must be clean) and checks that `/` and
`/__present.html` answer while `CLIENT.md`, `tools/`, `brief/`, `.git/`, `pitch/self-PRIVATE.html`
and `..` paths do not. It drives the presenter in Chromium: D turns the site dark and **glides**
(measured frame by frame), a remembered Dark does **not** fade in on load, reduced motion is one step,
P opens the phone frame with no sideways scroll, and H hides and shows the bar. Then it runs
`stop.command` and confirms the port is free. It writes screenshots and `report.md` to
`<client>/review/check-demo/` and ends in **Block** or **Approve**. It never opens a browser tab
on the Mac.

It does not verify two things; do them by hand:
- **Phone over Wi-Fi:** `start-on-phone.command`, then open the printed address on a real
  phone, on a trusted network only (anyone on the Wi-Fi can reach it while it runs).
- **Safari:** check the glide once there.

Also run `gale-design`'s `check-site.mjs` on the site itself. The presenter can only present
what the site gets right.

Record in the client's `CLIENT.md`: the port, the commands, the date of the last
`check-demo` Approve, and anything tuned in its presenter.

## Pitch clip (optional)

A 15–30 second clip of a finished demo lets Krishna show the site on WhatsApp before or after a
meeting. Make it only after `check-demo` and `check-site` Approve, from the local demo or a
temporary public URL that is shut off afterwards (gale, Boundaries).

- `website-to-video` for a site tour from the demo's own screenshots; `brag` when the source
  code should drive the story. Both render with HyperFrames.
- 9:16 at 1080×1920 for WhatsApp status and phones; 16:9 only if asked. No voiceover by
  default, captions instead. Music only from the bundled licensed tracks.
- Every word and number on screen comes from the demo or `CLIENT.md`. The "connects at launch"
  and "Sample" labels stay visible if they are on the page.
- Save the clip in the client's `pitch/` folder (never in `site/`), note it in `CLIENT.md`, and
  watch the whole render before sending: a clip is shown without us in the room.
