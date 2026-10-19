# ClearPulse site

A static, one-page marketing site plus a privacy page for ClearPulse. It has no dependencies and needs Node 18 or newer.

```
site.config.mjs      every business value: handle, price, phone, email, spots, flags
src/index.html       page template ({{tokens}} and <!-- if:… --> blocks)
src/privacy.html     privacy template (DRAFT, see the checklist below)
src/partials/        shared <head>, header and footer
src/styles.css       all styles
assets/              hero photo (clinic.webp), link-preview image, your photo
build.mjs            renders src/ into dist/ and checks the result
tools/render-og.mjs  optional: re-renders assets/og-image.png (needs Playwright)
```

## Build and preview

```bash
npm run build          # writes dist/
npx http-server dist   # or any static server, then open http://localhost:8080
```

The build **fails** if any of these happen:
- The visible copy on the home page contains *AI, bot, chatbot, ChatGPT, GPT, LLM, agent, HIPAA* or *artificial intelligence*.
- The home page contains *we / our / us / our team / the studio* outside an element marked `data-voice="spa"`.
- A link is empty, is `#`, or points at an `#id` or file that doesn't exist.
- A template hardcodes the handle, price, phone, email, age, name or number of founding spots instead of reading it from the config.

The build **warns but still succeeds** when `bookingUrl` is empty, when the photo is missing, or when `siteUrl` is empty.

## Editing site.config.mjs

Change one line, then run `npm run build` again. On Vercel, just push.

| Key | What it controls |
| --- | --- |
| `instagramHandle` | No `@`. Every DM link (`https://ig.me/m/<handle>`), profile link and visible @handle comes from this. |
| `bookingUrl` | A free Cal.com or Calendly link. While it's empty, every "Book" button opens an email to you with the subject "15-minute call". |
| `priceMonthly`, `foundingSpots` | The price and number of spots everywhere, including the spelled-out word ("Three med spas…"). |
| `liveDemoEnabled` | `false`: the hero leads with "Book a 15-minute call". `true`: it leads with "DM @handle to see it live" and the demo section becomes a try-it-now section. |
| `photoPath` | Your photo, ideally 4:5 portrait. If the file is missing, a gold monogram is shown instead. |
| `siteUrl` | Your live domain, such as `https://clearpulse.vercel.app`. It makes the link-preview image URL absolute, so Instagram and iMessage show it reliably. |
| `ownerAge`, `city`, `serviceArea`, `serviceAreaShort`, `email`, `phoneDisplay`, `phoneE164` | Exactly what they say. |

If you change the brand name, run `npm run og-image` to re-render the link-preview image. This needs Playwright: `npm i -g playwright`.

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project**, then import the repo.
3. Leave the framework preset as **Other**. `vercel.json` already sets the build command (`npm run build`) and the output directory (`dist`).
4. Deploy. Add your domain under **Settings → Domains**, then put it in `siteUrl` and push again.

Every push to the main branch redeploys. A failed build check stops the deploy, so a banned word or a dead link can't go live.

## Pre-launch checklist

- [ ] Add a real photo of yourself at assets/bach.jpg
- [ ] Set bookingUrl to a free Cal.com or Calendly link
- [ ] Read privacy.html and confirm every line — including 90-day retention — matches what the system really does
- [ ] On your phone, tap the DM button and confirm it opens a DM with your account
- [ ] Set liveDemoEnabled to true only after you've DMed the account yourself, gotten the med spa reply, and confirmed a medical question gets the safety reply
- [ ] If you rename the Instagram account, change instagramHandle — nothing else
