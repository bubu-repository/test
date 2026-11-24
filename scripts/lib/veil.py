"""Turn one screenshot of the room into the bento veil and the room-tile peek.

Usage: python3 -I scripts/lib/veil.py <in.png> <veil.webp> <peek.webp> [--tint 246,250,255,0.45]
       [--blur 0.03] [--veil-width 96] [--veil-q 70] [--peek-width 720] [--peek-aspect 4:3] [--peek-q 80]

veil: heavy Gaussian blur at full size (radius = blur x width), the cool tint composited on top,
      then downscaled to 96 px wide. Grain is NOT baked: at 96 px it would smear when stretched,
      so it lives in CSS on .veil::after.
peek: a sharp crop of the room centre at the given aspect, resized to 720 px wide.
Prints one JSON line with the output sizes.
"""
import json
import os
import sys

from PIL import Image, ImageFilter


def arg(name, default):
    if name in sys.argv:
        return sys.argv[sys.argv.index(name) + 1]
    return default


def main():
    src, veil_out, peek_out = sys.argv[1:4]
    tint = [float(x) for x in arg("--tint", "246,250,255,0.45").split(",")]
    blur = float(arg("--blur", "0.03"))
    veil_w = int(arg("--veil-width", "96"))
    veil_q = int(arg("--veil-q", "70"))
    peek_w = int(arg("--peek-width", "720"))
    aw, ah = (int(x) for x in arg("--peek-aspect", "4:3").split(":"))
    peek_q = int(arg("--peek-q", "80"))

    im = Image.open(src).convert("RGB")
    w, h = im.size

    # veil: blur at full size so nothing aliases, then tint, then shrink
    blurred = im.filter(ImageFilter.GaussianBlur(radius=max(8, blur * w)))
    layer = Image.new("RGB", im.size, tuple(int(c) for c in tint[:3]))
    veiled = Image.blend(blurred, layer, tint[3])
    vh = max(1, round(h * veil_w / w))
    small = veiled.resize((veil_w, vh), Image.LANCZOS)
    small.save(veil_out, "WEBP", quality=veil_q, method=6)

    # peek: centre crop at the tile aspect, sharp
    cw = min(w, round(h * aw / ah))
    ch = round(cw * ah / aw)
    if ch > h:
        ch = h
        cw = round(ch * aw / ah)
    left = (w - cw) // 2
    top = (h - ch) // 2
    crop = im.crop((left, top, left + cw, top + ch))
    ph = round(ch * peek_w / cw)
    crop.resize((peek_w, ph), Image.LANCZOS).save(peek_out, "WEBP", quality=peek_q, method=6)

    # flatness check: a near-uniform capture means the room did not paint
    stat = im.resize((veil_w, vh)).convert("L").getextrema()
    print(json.dumps({
        "veil": veil_out, "veil_bytes": os.path.getsize(veil_out), "veil_size": [veil_w, vh],
        "peek": peek_out, "peek_bytes": os.path.getsize(peek_out), "peek_size": [peek_w, ph],
        "luma_range": stat[1] - stat[0],
    }))


if __name__ == "__main__":
    main()
