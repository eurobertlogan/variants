# variants

One master image in, every crop out. A browser tool that turns a single photo into the sizes the internet actually asks for, with the subject kept in frame and the area covered by each platform interface left alone.

Nothing is uploaded. There is no server, no account, no build step at runtime.

![The page after loading a portrait](public/previa.png)

## The problem

Every project needs the same photo in a dozen shapes: 1.91:1 for link previews, 1:1 and 4:5 for the feed, 9:16 for stories and shorts, 16:9 for video, 4:1 for a profile banner, plus a full icon set. Doing that by hand is half an hour of the same drag and zoom, and doing it by centre crop decapitates whoever is in the picture.

Worse, some of those shapes get covered by the platform itself. A story puts a header on top and a caption at the bottom. TikTok puts buttons on the right. YouTube stamps the duration in the bottom right corner. A crop can be technically correct and still hide the face behind a button.

## How it works

1. The image is reduced to 96 pixels wide and turned into an **interest map**: edge strength, skin tones, saturation, with a weak pull toward the centre. No model is downloaded, no network call is made.
2. For each preset the largest window with the right ratio is placed by scoring every candidate position. Interest inside the safe band counts fully, interest inside the band the interface covers counts a fifth, and interest just outside the window edge is penalised so the subject is not cut in half.
3. The result is drawn on a canvas, twice, to avoid the aliasing that a single big reduction produces.

The map is a heuristic, not face detection. It works because a face has edges, skin tones and saturation at the same time, which is rare in a background.

## Presets

| preset | size | safe area | why |
|---|---|---|---|
| Open Graph | 1200 × 630 | none | Facebook, LinkedIn, WhatsApp, X |
| X timeline | 1600 × 900 | none | 16:9, trimmed to 2:1 on wide screens |
| Instagram feed | 1080 × 1080 | none | square post |
| Instagram portrait | 1080 × 1350 | none | 4:5 takes more of the feed |
| Story and Reels | 1080 × 1920 | 13% top, 18% bottom | header, caption, buttons |
| TikTok | 1080 × 1920 | 7% top, 25% bottom, 12% right | caption and button column |
| YouTube | 1280 × 720 | 12% bottom, 22% right | duration stamp |
| Profile banner | 1584 × 396 | 28% bottom, 16% left | profile photo overlaps the corner |
| Pinterest | 1000 × 1500 | none | 2:3, shown whole |
| Email header | 600 × 200 | none | 3:1, 600 px survives most clients |
| Business profile | 1200 × 900 | none | 4:3, used on location cards |
| Icon pack | 16, 32, 48, 180, 192, 512 | 17% all around | Android adaptive icons crop to a circle |

Numbers checked in October 2026. Platforms change sizes without notice, and every number lives in `src/presets.ts`, in one table, so a change is one line.

## What it does not do

- It does not detect faces. It finds the region with the most visual interest, which is usually the subject and occasionally a bright logo.
- It cannot create room that is not there. A 3:4 close up cropped to 9:16 has no vertical freedom, so the framing is what the source allows.
- It does not write text, templates or titles. The crop is the whole product.
- The icon pack is square art. A logo with text will not survive 16 px.

## Export

`Download all` produces a zip with:

- every selected size, named with the dimensions (`story-1080x1920.jpg`), in JPEG at the chosen quality, except the icon pack which is PNG;
- `favicon.ico` with 16, 32 and 48 inside;
- `manifesto.json` with the source name, the time, the crop rectangle and the safe area used for each file;
- `indice.html`, a contact sheet that opens offline and shows all crops side by side.

## Commands

```
npm install
npm run build     # compiles src to dist
npm test          # 23 tests on the crop math, the interest map, zip and ico
npm start         # serves public and dist on http://localhost:4333
npm run site      # builds site/, ready for any static host
```

## Structure

```
src/tipos.ts        shared types
src/presets.ts      every platform size and safe area
src/saliencia.ts    interest map and the integral image used to score windows
src/recorte.ts      window placement, the core of the tool
src/zip.ts          zip writer, store method, own CRC32
src/ico.ts          ico writer with PNG payloads
src/i18n.ts         Portuguese and English strings
src/app.ts          interface, canvas rendering, drag to reposition, export
src/test/           23 tests, no DOM needed
public/             page shell, stylesheet, fonts, icon
scripts/            dev server and static build
```

## Fonts

The interface uses Geist and Geist Mono, self hosted from `public/fontes/`, under the SIL Open Font License 1.1. The license text ships next to the fonts.

## Author

[robertlogan.cc](https://robertlogan.cc)

## License

MIT.
