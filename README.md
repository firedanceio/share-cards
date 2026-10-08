# share-cards

Design a share image once in HTML and render it at every size social sites ask for: link
previews, X and LinkedIn headers, YouTube channel art, Instagram posts and stories, profile
pictures. Each preset knows the platform's safe area, so nothing important gets cropped.

- One HTML template, any number of sizes
- Your fonts, CSS and SVG, rendered by real Chrome
- Zero dependencies, Node 20+

## Use

```sh
npx github:firedanceio/share-cards render examples/basic.html -o og.png -p og -s title="Hello"
```

Or render a list of cards from JSON:

```json
[
  { "template": "card.html", "preset": "og", "out": "out/og.png", "params": { "title": "Launch day" } },
  { "template": "card.html", "preset": "x-header", "out": "out/x.png", "params": { "title": "Launch day" } }
]
```

```sh
share-cards build cards.json
```

Paths in the JSON are relative to the JSON file.

## Presets

```text
og               1200x630   safe 1200x630   Open Graph / link previews
x-header         1500x500   safe 1200x400   X profile header; avatar covers the lower left
youtube-banner   2560x1440  safe 1546x423   YouTube channel art; only the centre shows everywhere
linkedin-cover   1128x191   safe 900x170    LinkedIn page cover; logo covers the lower left
linkedin-banner  1584x396   safe 1200x330   LinkedIn personal profile background
square           1080x1080  safe 1080x1080  Instagram / feed post
portrait         1080x1350  safe 1080x1350  Instagram 4:5 post
story            1080x1920  safe 1080x1420  Stories / Reels; top and bottom are covered by UI
avatar           800x800    safe 560x560    Profile picture; keep the mark inside the circle
```

`--width` and `--height` override a preset's size.

## Templates

A template is a normal HTML file. It receives these query parameters:

| Parameter | Meaning |
|---|---|
| `width`, `height` | Canvas size in pixels |
| `safeW`, `safeH` | The centred area every platform shows; keep text and logos inside it |
| anything you pass with `-s key=value` | Your own values, such as `title` |

The easiest pattern is to design at one size and scale into the safe area, as
[`examples/basic.html`](examples/basic.html) does:

```js
const q = new URLSearchParams(location.search);
const k = Math.min(+q.get('safeW') / 1200, +q.get('safeH') / 630);
card.style.transform = `translate(-50%, -50%) scale(${k})`;
```

Chrome gets 3 seconds of virtual time for fonts and scripts (`--wait` to change it). Local
`@font-face` files and images load fine because the template is opened from disk.

## From JavaScript

```js
import { render, PRESETS } from 'share-cards';
render({ template: 'card.html', out: 'og.png', preset: 'og', params: { title: 'Hi' } });
```

## Requirements

Chrome or Chromium. share-cards looks in the usual places on macOS, Linux and Windows; set
`CHROME=/path/to/chrome` otherwise. Output is PNG; convert to JPEG or WebP with your usual tool if
you need smaller files.

## Licence

Apache-2.0. Made by [Firedance](https://firedance.io), where it renders the share images for our
site and social profiles.
