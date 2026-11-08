"""Generate PWA and Mobile App icons for Stellegent."""

import math
from pathlib import Path
from PIL import Image, ImageDraw

def create_stellegent_icon(size: int, maskable: bool = False) -> Image.Image:
    # 32-bit RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = 0 if maskable else int(size * 0.08)
    radius = int(size * 0.22) if not maskable else 0

    # Background gradient approximation (rich indigo to violet)
    bg_box = [margin, margin, size - margin, size - margin]
    
    # Base background rounded rectangle
    if not maskable:
        draw.rounded_rectangle(bg_box, radius=radius, fill=(79, 70, 229, 255))
    else:
        draw.rectangle([0, 0, size, size], fill=(79, 70, 229, 255))

    # Inner decorative gradient overlay
    center_x = size // 2
    center_y = size // 2

    # Draw whiteboard frame symbol
    wb_w = int(size * 0.52)
    wb_h = int(size * 0.40)
    wb_left = center_x - wb_w // 2
    wb_top = center_y - wb_h // 2 - int(size * 0.03)
    wb_right = wb_left + wb_w
    wb_bottom = wb_top + wb_h

    # Whiteboard border
    border_r = max(4, int(size * 0.04))
    draw.rounded_rectangle(
        [wb_left, wb_top, wb_right, wb_bottom],
        radius=border_r,
        fill=(255, 255, 255, 240),
        outline=(224, 231, 255, 255),
        width=max(2, int(size * 0.02))
    )

    # Chalk / pen tray at bottom of whiteboard
    tray_h = max(2, int(size * 0.025))
    draw.rounded_rectangle(
        [wb_left + int(wb_w * 0.2), wb_bottom - tray_h, wb_right - int(wb_w * 0.2), wb_bottom + tray_h],
        radius=2,
        fill=(99, 102, 241, 255)
    )

    # Diagram nodes inside the whiteboard (flowchart nodes)
    node1_r = max(3, int(size * 0.035))
    n1_x = wb_left + int(wb_w * 0.3)
    n1_y = wb_top + int(wb_h * 0.35)
    
    n2_x = wb_left + int(wb_w * 0.7)
    n2_y = wb_top + int(wb_h * 0.35)

    n3_x = center_x
    n3_y = wb_top + int(wb_h * 0.72)

    line_w = max(2, int(size * 0.018))
    # Connector lines
    draw.line([(n1_x, n1_y), (n2_x, n2_y)], fill=(129, 140, 248, 255), width=line_w)
    draw.line([(n1_x, n1_y), (n3_x, n3_y)], fill=(129, 140, 248, 255), width=line_w)
    draw.line([(n2_x, n2_y), (n3_x, n3_y)], fill=(129, 140, 248, 255), width=line_w)

    # Nodes
    draw.ellipse([n1_x - node1_r, n1_y - node1_r, n1_x + node1_r, n1_y + node1_r], fill=(99, 102, 241, 255))
    draw.ellipse([n2_x - node1_r, n2_y - node1_r, n2_x + node1_r, n2_y + node1_r], fill=(139, 92, 246, 255))
    draw.ellipse([n3_x - node1_r, n3_y - node1_r, n3_x + node1_r, n3_y + node1_r], fill=(236, 72, 153, 255))

    # Sparkle / AI star in top right corner of whiteboard
    star_x = wb_right + int(size * 0.02)
    star_y = wb_top - int(size * 0.02)
    star_r = int(size * 0.07)
    star_pts = []
    for i in range(8):
        angle = i * (math.pi / 4)
        r = star_r if i % 2 == 0 else star_r * 0.38
        star_pts.append((star_x + r * math.cos(angle), star_y + r * math.sin(angle)))
    draw.polygon(star_pts, fill=(251, 191, 36, 255))

    return img

def main():
    public_dir = Path("frontend/public")
    public_dir.mkdir(parents=True, exist_ok=True)

    icons = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon.png", 64, False),
    ]

    for name, sz, mask in icons:
        out_path = public_dir / name
        im = create_stellegent_icon(sz, maskable=mask)
        im.save(out_path, "PNG")
        print(f"Generated {out_path} ({sz}x{sz})")

if __name__ == "__main__":
    main()
