#!/usr/bin/env python3
"""
Generate ultra-sharp WebP hero images for Force Racing website.
Desktop: 2560x1440 landscape (crop centered on car at y=1180 with Lanczos + subtle sharpness boost)
Mobile: 1080x1920 portrait native (subtle sharpness boost)
"""
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
src_file = ROOT / 'source/images/supra26-bic.jpeg'
out_dir = ROOT / 'site/assets/images'
out_dir.mkdir(parents=True, exist_ok=True)

print(f"Loading source: {src_file}")
im = Image.open(src_file).convert('RGB')
print(f"Source size: {im.size}, mode: {im.mode}")

# 1. Desktop HD (2560x1440 landscape, 16:9)
target_w, target_h = 2560, 1440
crop_w = im.width # 1080
crop_h = int(crop_w * target_h / target_w) # 607.5 -> 607 or 608
y_center = 1180
y0 = max(0, min(im.height - crop_h, y_center - crop_h // 2))
y1 = y0 + crop_h

print(f"Desktop crop: (0, {y0}, {crop_w}, {y1}) [size {crop_w}x{crop_h}]")
desktop_cropped = im.crop((0, y0, crop_w, y1))
desktop_resized = desktop_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
desktop_enhanced = ImageEnhance.Sharpness(desktop_resized).enhance(1.15)

out_desktop = out_dir / 'supra26-bic-desktop-hd.webp'
desktop_enhanced.save(out_desktop, 'WEBP', quality=94, method=6)
print(f"[OK] Saved desktop HD: {out_desktop} ({desktop_enhanced.size}, {out_desktop.stat().st_size} bytes)")

# 2. Mobile HD (Sky cropped from top: removes 440px empty sky, centering the racecar)
crop_mobile_y0 = 440
mobile_cropped = im.crop((0, crop_mobile_y0, im.width, im.height))
mobile_enhanced = ImageEnhance.Sharpness(mobile_cropped).enhance(1.15)
out_mobile = out_dir / 'supra26-bic-mobile-hd.webp'
mobile_enhanced.save(out_mobile, 'WEBP', quality=94, method=6)
print(f"[OK] Saved mobile HD (sky removed): {out_mobile} ({mobile_enhanced.size}, {out_mobile.stat().st_size} bytes)")

print("Hero image generation complete.")
