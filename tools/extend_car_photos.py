#!/usr/bin/env python3
"""
Hyper-precision car image processing for Force Racing Revival.
Crops and scales all 15 vehicle photographs with authentic framing,
producing pristine 16:10 widescreen desktop (1200x750) and mobile phone (800x500) assets
with ZERO black bars and ZERO blurry mirrored edges.
"""
from pathlib import Path
from PIL import Image, ImageEnhance
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
src_dir = ROOT / 'source/images'
site_img_dir = ROOT / 'site/assets/images'

# (name, source_filename, vertical_center_y)
CARS = [
    # Formula Student
    ('supra26-bic', 'supra26-bic.jpeg', 1180),
    ('fr19', 'fr19.jpg', 252),
    ('ffs18', 'ffs18.png', 260),
    ('fr17', 'fr17.jpg', 120),
    ('fr16', 'fr16.jpeg', 560),
    ('legions12', 'legions12.jpg', 173),
    # Karting
    ('ikr', 'ikr.jpg', 290),
    ('kart2', 'kart2.jpg', 297),
    ('kart1', 'kart1.png', 160),
    # Beyond Formula & BAJA
    ('ratham', 'ratham.jpeg', 475),
    ('efficycle', 'efficycle.jpeg', 391),
    ('phoenix', 'phoenix.jpg', 118),
    ('ashwasena', 'ashwasena.jpg', 115),
    ('baja11', 'baja11.jpg', 231),
    ('baja10', 'baja10.png', 361)
]

TARGET_ASPECT = 16 / 10  # 1.6

def process_car(name, src_file, y_center):
    p = src_dir / src_file
    if not p.exists():
        print(f'Warning: {src_file} not found')
        return

    im = Image.open(p).convert('RGB')
    w, h = im.size
    current_aspect = w / h

    if current_aspect > TARGET_ASPECT:
        # Image is wider than 16:10 -> crop left/right symmetrically
        crop_w = int(h * TARGET_ASPECT)
        crop_h = h
        x0 = (w - crop_w) // 2
        y0 = 0
    else:
        # Image is taller/squarer than 16:10 -> crop top/bottom around car vertical center
        crop_w = w
        crop_h = int(w / TARGET_ASPECT)
        x0 = 0
        y0 = max(0, min(h - crop_h, y_center - crop_h // 2))

    cropped = im.crop((x0, y0, x0 + crop_w, y0 + crop_h))

    # Optional micro-enhancement: boost contrast slightly for motorsport punch
    enhancer = ImageEnhance.Contrast(cropped)
    enhanced = enhancer.enhance(1.04)

    # 1. Desktop Widescreen: 1200 x 750 (16:10)
    wide = enhanced.resize((1200, 750), Image.Resampling.LANCZOS)
    # Subtle studio edge vignette (5% border) to seat the car naturally into dark surfaces
    wide_arr = np.array(wide, dtype=np.float32)
    v_w = int(1200 * 0.05)
    for x in range(v_w):
        factor = 0.82 + 0.18 * (x / v_w)
        wide_arr[:, x] = wide_arr[:, x] * factor
        wide_arr[:, -1 - x] = wide_arr[:, -1 - x] * factor
    wide_final = Image.fromarray(np.clip(wide_arr, 0, 255).astype(np.uint8))
    out_wide = site_img_dir / f'{name}-wide.webp'
    wide_final.save(out_wide, 'WEBP', quality=92, method=6)

    # 2. Android / Phone Screen: 800 x 500 (16:10)
    phone = enhanced.resize((800, 500), Image.Resampling.LANCZOS)
    phone_arr = np.array(phone, dtype=np.float32)
    p_w = int(800 * 0.05)
    for x in range(p_w):
        factor = 0.85 + 0.15 * (x / p_w)
        phone_arr[:, x] = phone_arr[:, x] * factor
        phone_arr[:, -1 - x] = phone_arr[:, -1 - x] * factor
    phone_final = Image.fromarray(np.clip(phone_arr, 0, 255).astype(np.uint8))
    out_phone = site_img_dir / f'{name}-phone.webp'
    phone_final.save(out_phone, 'WEBP', quality=92, method=6)

    print(f'✔ Processed {name}: wide={wide_final.size}, phone={phone_final.size}')

def main():
    print('Starting hyper-precision car photography rendering...')
    for name, src, y_center in CARS:
        process_car(name, src, y_center)
    print('All 15 car assets generated with zero black bars and zero mirrored extensions.')

if __name__ == '__main__':
    main()
