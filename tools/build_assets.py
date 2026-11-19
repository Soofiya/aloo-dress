#!/usr/bin/env python3
"""
build_assets.py — the one script you run after adding artwork.

    python3 tools/build_assets.py            # thumbnails + add new items to config.js
    python3 tools/build_assets.py --webp     # also make smaller .webp copies

First time only:   python3 -m pip install pillow

What it does
  1. Looks in assets/layers/<category>/ for PNGs.
  2. Makes a tight-cropped thumbnail for each in assets/thumbs/<category>/.
  3. Any PNG that isn't in js/config.js yet is ADDED to the item list for you
     (its name is made from the file name — tidy it in config.js if you like).
  4. Warns about: items in config.js whose PNG is missing, PNGs that are a
     different size from aloo.png (they wouldn't line up!), and files over 100 KB.
  5. Prints the total download size.
"""
import os
import re
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..")
ASSETS = os.path.join(SITE, "assets")
LAYERS = os.path.join(ASSETS, "layers")
THUMBS = os.path.join(ASSETS, "thumbs")
CONFIG = os.path.join(SITE, "js", "config.js")
MARKER = "// ▲▲ NEW ITEMS ARE ADDED ABOVE THIS LINE"
SIZE = 360          # thumbnail size in px
PAD = 0.06          # margin around the artwork in a thumbnail

def make_thumb(src, dst):
    im = Image.open(src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        print("  ! empty image:", src); return
    w, h = im.size
    area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    if area > 0.7 * w * h:                       # a background: crop the centre square
        side = min(w, h)
        left, top = (w - side) // 2, (h - side) // 2
        crop = im.crop((left, top, left + side, top + side))
    else:                                        # an item: tight crop + margin
        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        side = int(max(bw, bh) * (1 + 2 * PAD))
        crop = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        crop.paste(im.crop(bbox), (side // 2 - bw // 2, side // 2 - bh // 2))
    crop = crop.resize((SIZE, SIZE), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    crop.save(dst, optimize=True)

def to_webp(png):
    Image.open(png).save(os.path.splitext(png)[0] + ".webp", "WEBP", quality=85, method=6)

def nice_name(item_id):
    """'pink-tshirt' / 'pink_tshirt' -> 'Pink tshirt'"""
    words = re.sub(r"[-_]+", " ", item_id).strip()
    return words[:1].upper() + words[1:]

def main():
    webp = "--webp" in sys.argv
    config = open(CONFIG, encoding="utf-8").read()
    known = set(re.findall(r"id:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'", config))
    known_cats = set(re.findall(r"^\s{2}(\w+):\s*\{\s*label:", config, re.M))

    base = Image.open(os.path.join(ASSETS, "aloo.png"))
    print(f"aloo.png is {base.size[0]} x {base.size[1]} px. Every layer must be exactly this size.\n")

    found, total, new_lines = set(), 0, []
    for cat in sorted(os.listdir(LAYERS)) if os.path.isdir(LAYERS) else []:
        folder = os.path.join(LAYERS, cat)
        if not os.path.isdir(folder):
            continue
        if cat not in known_cats:
            print(f"  ! folder 'layers/{cat}' is not a category in config.js (skipped)")
            continue
        for f in sorted(os.listdir(folder)):
            if not f.lower().endswith(".png"):
                continue
            item_id = f[:-4]
            src = os.path.join(folder, f)
            found.add((item_id, cat))
            size = os.path.getsize(src)
            notes = []
            if Image.open(src).size != base.size:
                # A different size won't line up with Aloo, so leave it out of the game.
                print(f"  {cat + '/' + f:34s} SKIPPED: it is {Image.open(src).size[0]}x{Image.open(src).size[1]} "
                      f"but must be {base.size[0]}x{base.size[1]} (same canvas as aloo.png)")
                found.add((item_id, cat))
                continue
            if size > 100 * 1024:
                notes.append("over 100 KB")
            total += size
            make_thumb(src, os.path.join(THUMBS, cat, f))
            if webp:
                to_webp(src); to_webp(os.path.join(THUMBS, cat, f))
            if (item_id, cat) not in known:
                new_lines.append(f"  {{ id: '{item_id}', category: '{cat}', name: '{nice_name(item_id)}' }},")
                notes.append("NEW - added to config.js")
            print(f"  {cat + '/' + f:34s} {size/1024:5.0f} KB  {'  <-- ' + ', '.join(notes) if notes else ''}")

    if new_lines:
        if MARKER in config:
            config = config.replace("  " + MARKER, "\n".join(new_lines) + "\n\n  " + MARKER, 1)
            open(CONFIG, "w", encoding="utf-8").write(config)
            print(f"\nAdded {len(new_lines)} new item(s) to js/config.js. Open it to tidy the names.")
        else:
            print("\nCouldn't find the marker comment in config.js. Paste these into ITEMS:")
            print("\n".join(new_lines))

    for item_id, cat in sorted(known - found):
        print(f"  ! config.js lists '{item_id}' ({cat}) but assets/layers/{cat}/{item_id}.png is missing")

    print(f"\nLayers total: {total/1024/1024:.2f} MB (aim for under about 3 MB)")
    if webp:
        print("WebP copies written. Now set  imageFormat: 'webp'  in js/config.js.")

if __name__ == "__main__":
    main()
