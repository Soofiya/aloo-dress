# Aloo All Day — dress-up game

A phone-first dress-up game for Aloo the cat. Plain HTML, CSS and JavaScript: no framework, no server.

## Adding new clothes (the everyday job)

1. Draw it on a transparent canvas **exactly the same size as `assets/aloo.png`** (868 × 1549 px at the moment), with Aloo in the same position.
2. Save it as a PNG in the matching folder, named however you like (no spaces; dashes are fine, e.g. `star-hat.png`):

   | Folder in `assets/layers/` | What goes in it |
   |---|---|
   | `hats` | hats and head items |
   | `tops` | tops, coats, dresses |
   | `bottoms` | shorts, skirts, trousers |
   | `overalls` | dungarees (they sit over tops and remove bottoms) |
   | `neck` | scarves, collars |
   | `face` | glasses, masks |
   | `tail` | tail and back accessories |
   | `props` | held items |
   | `background` | backgrounds (full canvas) |

3. In Terminal, in this folder, run:

   ```bash
   python3 tools/build_assets.py
   ```

   It makes the thumbnail, **adds the item to `js/config.js` for you**, and warns you if a PNG is the wrong size or over 100 KB.
4. (Optional) open `js/config.js` and tidy the item's display name, e.g. `Star hat`.
5. Upload to GitHub. Done.

First time only, install the image helper: `python3 -m pip install pillow`

**To remove an item:** delete its line in `js/config.js` (and its PNG if you like).
**To replace artwork:** save over the same file name, run the script again.
**To replace Aloo:** save over `assets/aloo.png` (if the canvas size changes, every layer must change too — the game adapts its shape automatically).

## Settings you might want in `js/config.js`

| Want to… | Change |
|---|---|
| Reorder what sits on top of what | `LAYER_ORDER` |
| One item at a time vs several | a category's `rule`: `'replace'` or `'stack'` |
| Wearing X removes category Y | `clears: ['bottoms']` on that category |
| Reorder the carousel | move lines up/down in `ITEMS` |
| Make a new category | add it to `CATEGORIES` and `LAYER_ORDER`, then make the folder |
| Start wearing something | `GAME.startWearing` |

There are no tabs: every item lives in **one carousel** (three at a time, arrows or swipe). The carousel order is simply the order of the lines in the `ITEMS` list in `js/config.js` — move a line up or down to move the item. Categories (folders) only decide what sits on top of what, and which items replace each other.

## Changing the look

- **Title words:** edit the `<h1>` in `index.html` (the dashed and wavy underlines are the two `<span>`s).
- **Yellow / black:** `--bg` and `--ink` at the top of `css/style.css`. Also change `theme-color` in `index.html` and the colours in `manifest.webmanifest` to match.
- **Wobbly border:** drawn automatically to fit any screen (`drawFrame` in `js/game.js`). Change `stroke-width` in the CSS, or `amp` / `wave` in `drawFrame`, for a calmer or wilder wobble.
- **Buttons:** the Mix / Reset / Save / arrow pictures in `assets/ui/` were cut from your mock-up at small size. For the sharpest result on phones, replace them with your own transparent PNGs at about 3× the displayed size (e.g. 150 px wide), keeping the file names.

## Folder map

```
index.html            the page
css/style.css         styling (yellow, black and font at the top)
js/config.js          ★ layer order, categories, item list
js/game.js            game logic (no need to edit)
sw.js, manifest...    offline support + "add to home screen"
assets/aloo.png       base Aloo
assets/icon.png       home-screen icon (512×512; replace with your own)
assets/ui/            your hand-drawn buttons: mix, reset, save, prev, next (swap for better ones any time — transparent PNGs, same names)
assets/fonts/         Soof Sans, your handwriting font
assets/layers/<cat>/  full-size item PNGs
assets/thumbs/<cat>/  thumbnails (made by the script)
tools/build_assets.py the helper script
```

## Smaller files with WebP (optional)

`python3 tools/build_assets.py --webp` writes `.webp` copies and then you set `imageFormat: 'webp'` in `js/config.js`. Keep your PNGs as masters. Aim for about 3 MB total; the script prints the total. (`tops/jumper.png` is a little over 100 KB — fine, but WebP will shrink it.)

## Run it on your computer

```bash
python3 -m http.server 8000
```

Visit <http://localhost:8000>. (Save and offline mode need http, not a double-clicked file.) On a phone on the same Wi-Fi: `http://<your-computer's-IP>:8000`.

## Deploy to GitHub Pages

1. Create a repository on github.com and upload everything in this folder (or `git push` it).
2. **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
3. After a minute it's live at `https://<username>.github.io/<repo-name>/`.

Paths are relative, so it works inside the `/repo-name/` subfolder. After you update artwork, players see the new version on their next visit after a reload (bump `CACHE_NAME` in `sw.js` to force it).

## How it works

- Clothes are stacked transparent `<img>` layers: the browser composites them smoothly and loads them lazily, with no positioning code. **Save** draws the same layers onto a hidden canvas the size of `aloo.png` and shares/downloads it.
- Tap to wear, tap again to remove. Drag an item **up or down** onto Aloo (sideways scrolls the carousel, so scrolling and dragging never fight). Pointer events work for finger, pen and mouse.

## Testing checklist

- Real iPhone (Safari) and Android (Chrome): tap, drag onto Aloo, scroll the tray sideways, Save.
- Emulator at 360 × 640 and 390 × 844.
- Check transparent edges for white fringing.
- Not built yet: sound effects, shareable outfit link, title screen.
