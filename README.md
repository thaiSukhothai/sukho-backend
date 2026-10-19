# 360 Realty — website

A single-page real-estate agency site built with **HTML + Tailwind CSS + Three.js**.
No build step: open `index.html` in a browser, or upload the folder to any web host.
All copy follows the brand document *360 Realty — Website Content* (October 2026), section by section.

```
360 reality/
├── index.html              ← all page content (edit text, areas, FAQ here)
├── _headers                ← Netlify response headers (security + image caching)
├── README.md
└── assets/
    ├── css/styles.css      ← custom styles (uses the colour variables — no hard-coded colours)
    ├── img/
    │   ├── logo-mark*.png        logo mark: original, flat white, flat dark
    │   ├── wordmark-*.png        "360 Realty" wordmark, white / dark
    │   ├── favicon.svg           favicon (logo only) — picks white or dark mark automatically
    │   ├── favicon-dark.svg / favicon-light.svg / favicon-*-64.png
    │   ├── apple-touch-icon.png / icon-512.png
    │   └── dubai-skyline.webp / .jpg   footer image band
    └── js/
        ├── theme.js        ← ★ COLOURS (dark + light) + CONTACT EMAIL + DIAL SETTINGS (the only file you must edit)
        ├── dial3d.js       ← the 3D 360° dial (Three.js)
        └── main.js         ← dark/light toggle, preloader, nav, quick search, forms
```

---

## 1. Dark and light mode

The site ships with both. The visitor's choice is made with the sun / moon button in the header and remembered in
`localStorage`; first-time visitors get their operating-system preference. The favicon, the address-bar colour and the
3D dial all follow the switch.

To change the colours open `assets/js/theme.js`:

```js
var ACTIVE_PALETTE = 'dubaiDusk';   // ← or 'midnightSapphire', 'emeraldLuxe', or your own
```

Each palette has a `brand` scale (50–950), a `dark` set and a `light` set:

| key        | used for                                                   |
|------------|------------------------------------------------------------|
| `bg`       | page background                                            |
| `surface`  | cards and panels                                           |
| `ink`      | main text                                                  |
| `muted`    | secondary text                                             |
| `accent`   | teal highlights, buttons, the Downtown dot on the dial     |
| `accent2`  | second colour of the button gradient                       |
| `gold`     | eyebrows, separators, the other five dots on the dial      |
| `onAccent` | text on accent-coloured buttons                            |
| `line`     | borders / hairlines (white in dark mode, ink in light)     |

Everything follows automatically — Tailwind classes (`bg-accent/15`, `text-muted`, `border-line/10` …),
the custom CSS (`var(--accent)` …) **and** the 3D dial.

## 2. Logo and favicon

- Header, preloader and footer use the logo mark + wordmark from `assets/img/` (white versions in dark mode,
  dark versions in light mode — the `only-dark` / `only-light` classes handle the swap).
- The favicon is the logo mark only. `favicon.svg` contains both versions and picks one from the browser's colour
  scheme; `main.js` also swaps to `favicon-dark.svg` / `favicon-light.svg` when the visitor uses the site's toggle.
  `apple-touch-icon.png` (iOS home screen) sits on the brand background because iOS does not allow transparency.

To replace the logo, export a transparent PNG of the mark and regenerate the files in `assets/img/`
(any image tool works; keep the same file names).

## 3. Enquiries go straight to hello@360.realty

The contact form and the newsletter sign-up are emailed **directly to `SITE.contact.email`** by
[FormSubmit](https://formsubmit.co) — no account, no server, and it works on Netlify or any other host.
`main.js` submits by AJAX and shows the success / error messages from the content document; each email arrives as a
table with the visitor's address as reply-to, so an advisor can answer straight from the inbox. FormSubmit's own auto-reply does not work with AJAX submissions or with the captcha switched off, so visitors see the on-page confirmation instead.

**One-time activation (do this once, before launch or right after):**

1. Open the live site, fill in the contact form and send one test enquiry.
2. FormSubmit emails **hello@360.realty** an activation link. Open that email and click **Activate**.
3. From now on every enquiry and newsletter sign-up lands in the inbox within seconds.

Optional: if the activation email shows a random form ID, paste it into `email:` in `theme.js` instead of the
address to keep the address out of the page source.

**Also want a copy in the Netlify dashboard?** The forms carry `data-netlify="true"`, so Netlify can store submissions
too. In `assets/js/theme.js` set `provider: 'both'` (or `'netlify'` for Netlify only), then in the Netlify dashboard
turn on **Site configuration → Forms → Enable form detection**, redeploy, and add an email notification under
**Forms → Form notifications** if you want Netlify to email as well. Netlify's endpoint only exists on the deployed
site, so on a local preview the Netlify path shows a notice instead of sending.

## 4. Phone, WhatsApp, address, socials

Also in `theme.js` → `SITE.contact`. Anything left as `''` is hidden automatically (the content document only
provides the email address, so these are empty by default).

- `whatsapp` must be digits only with country code, e.g. `971501234567`. When set, the WhatsApp button appears
  in the contact section and as a floating button.

## 5. Edit the content

All copy lives in `index.html`, section by section (each has a comment banner), in the order of the content document:

1. Hero + quick search  2. Developer strip  3. Numbers  4. About  5. What we deal in  6. Services
7. Why Dubai  8. Areas  9. How we work  10. FAQ  11. Contact  12. Footer with the Dubai image

- **Numbers** — the figures are the samples from the content document; change the `data-count` values before launch.
- **Why Dubai** — figures are as of mid-2026 and should be refreshed regularly.
- **Areas** — photos are Unsplash placeholders. Replace each `<img src="…">` with your own (put files in
  `assets/img/` and reference them as `assets/img/photo.jpg`). If an image fails to load the card keeps its gradient.
- **Quick search** — the tabs, ranges and button labels are in `main.js` (`QS_TABS`, `QS_RANGES`). The button scrolls
  to the contact form with the visitor's choice already filled in.
- **Scroll animations** — [AOS](https://michalsnik.github.io/aos/) from a CDN. Give any element
  `data-aos="fade-up"` (plus `data-aos-delay="120"` for a stagger); other effects such as `zoom-in` or `fade-left` work
  too. Settings are in `main.js` (`startAnimations`).
- **Form validation** — fields carry `data-validate="name|email|phone|message|select"`; the rules and messages are in
  `main.js` (`RULES`). Errors appear under the field and the first problem gets focus.
- **FAQ** — only one answer is open at a time (`<details name="faq">`, with a script fallback for older browsers).
- **Motion** — Windows ("Animation effects" off) and macOS ("Reduce motion") make browsers report
  `prefers-reduced-motion`. The site animates regardless, so the marquee, AOS entrances and the dial always move.
  Set `SITE.motion.respectReducedMotion = true` in `theme.js` to switch them off for those visitors.
- **Footer image** — `assets/img/dubai-skyline.webp` (and `.jpg` fallback). Swap for a licensed photograph if you prefer;
  2400 × 720 or any wide image works.

## 6. Tune the 3D dial

`theme.js` → `SITE.dial`:

```js
idleSpin: true,        // the dial turns slowly on its own
scrollSpin: 1,         // how much it turns while scrolling (0 = none)
sweep: true,           // the radar-style sweep that lights up each community in turn
globe: true,           // faint latitude / longitude lines inside the dial
buildOnLoad: true,     // ticks and rings assemble after the preloader
mouseParallax: true,   // tilts slightly towards the cursor
tiltX: -0.62, tiltY: 0.26,
```

The six community labels and the "360° / 25.20° N · 55.27° E" centre are plain HTML in `index.html`
(`#dial-labels`) — edit the names there, keeping the order (every 60° clockwise from the top).

**Where the dial sits in each section** is set with a `data-scene` attribute in `index.html`:

```html
<section id="about" data-scene='{"x":-2.8,"y":0,"scale":0.85,"opacity":0.16,"dolly":0}'>
```

- `x`, `y` — position (positive x = right, positive y = up); the hero uses `"anchor":"#dial-anchor"` instead,
  which centres the dial on that element
- `scale` — size
- `opacity` — fade the dial behind text-heavy sections (0 hides it)
- `dolly` — camera distance (negative = closer)

On screens narrower than 1024px the dial becomes a faint motif behind the hero text and the labels are hidden.
If WebGL is unavailable a static SVG dial is shown instead.

## 7. Preview locally

Any static server works, e.g.

```bash
npx --yes serve -l 5173 .
```

then open http://localhost:5173. (The Claude desktop app's `.claude/launch.json` uses the same command.)

## 8. Publish

Any static host works (Netlify, Vercel, GitHub Pages, cPanel). There is nothing to compile.

**Netlify, drag and drop:** open https://app.netlify.com/drop and drag in a **folder** (Netlify asks you to unzip a zip first). Drag a clean copy that holds only `index.html`, `_headers` and `assets/`, not this whole project folder, which also contains `.git`. Leave out `assets/js/building3d.js`, the old tower script that nothing uses any more. To update the live site later, drag the refreshed folder onto the dropzone at the bottom of the site's **Deploys** page.

**Netlify, Git:** connect a GitHub repository, leave the build command empty and set the publish directory to `.`.

**Going to production?** The site loads Tailwind from its CDN for convenience. For the fastest possible load, compile
it once:

```bash
npx tailwindcss -i assets/css/tailwind.in.css -o assets/css/tailwind.css --minify
```

then replace the `<script src="https://cdn.tailwindcss.com">` line with
`<link rel="stylesheet" href="assets/css/tailwind.css">` (and move the `colors` / `fontFamily` from `theme.js`
into a `tailwind.config.js`). Optional — the CDN version works fine.

`assets/js/building3d.js` (the previous 3D tower) is no longer referenced and can be deleted.
