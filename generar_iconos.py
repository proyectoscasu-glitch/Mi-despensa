"""Genera los íconos PNG de Mi Despensa (necesarios para iOS y Android).

Uso:
    py generar_iconos.py

Crea en esta misma carpeta:
    - apple-touch-icon.png  (180x180, ícono de pantalla de inicio en iPhone/iPad)
    - icon-192.png          (192x192, manifest / Android)
    - icon-512.png          (512x512, manifest / splash Android)

El dibujo replica el diseño de `icon.svg` (canasto, hoja y check).
"""

import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
SS = 4  # super-muestreo para bordes suaves


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def cubic(p0, p1, p2, p3, n=64):
    """Aproxima una curva Bézier cúbica por una lista de puntos."""
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0]
        y = mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def diagonal_gradient(size, c1, c2):
    """Gradiente diagonal (arriba-izq -> abajo-der) usando interpolación bilineal."""
    base = Image.new("RGB", (2, 2))
    mid = lerp(c1, c2, 0.5)
    base.putpixel((0, 0), c1)
    base.putpixel((1, 0), mid)
    base.putpixel((0, 1), mid)
    base.putpixel((1, 1), c2)
    return base.resize((size, size), Image.BILINEAR)


def draw_icon(size):
    S = size * SS
    k = S / 100.0  # escala desde el viewBox de 100x100 del SVG
    img = diagonal_gradient(S, hex2rgb("1e4d3e"), hex2rgb("013628")).convert("RGBA")
    d = ImageDraw.Draw(img)

    def P(pts):
        return [(x * k, y * k) for (x, y) in pts]

    def w(v):
        return max(1, round(v * k))

    # --- Canasto ---
    basket = ([(26, 44), (74, 44), (67, 76)]
              + cubic((67, 76), (66, 79), (63, 81), (60, 81))
              + [(40, 81)]
              + cubic((40, 81), (37, 81), (34, 79), (33, 76)))
    d.polygon(P(basket), fill=hex2rgb("bbedd8"))

    # --- Borde superior (rim) ---
    rim = ([(22, 41), (78, 41)]
           + cubic((78, 41), (80, 41), (81, 43), (80, 45))
           + [(78, 47), (22, 47), (20, 45)]
           + cubic((20, 45), (19, 43), (20, 41), (22, 41)))
    d.polygon(P(rim), fill=(255, 255, 255, 242))

    # --- Asa ---
    handle = cubic((35, 41), (35, 24), (65, 24), (65, 41))
    d.line(P(handle), fill=hex2rgb("bbedd8"), width=w(4.5), joint="curve")
    for end in (handle[0], handle[-1]):
        r = w(4.5) / 2
        d.ellipse([end[0] * k - r, end[1] * k - r, end[0] * k + r, end[1] * k + r],
                  fill=hex2rgb("bbedd8"))

    # --- Hoja ---
    leaf = ([(50, 35)]
            + cubic((50, 35), (50, 20), (68, 22), (68, 22))
            + cubic((68, 22), (68, 22), (70, 38), (50, 35)))
    d.polygon(P(leaf), fill=hex2rgb("44c997"))
    d.line(P([(52, 33), (64, 25)]), fill=hex2rgb("1e4d3e"), width=w(1.8))

    # --- Insignia con check ---
    cx, cy, r = 73 * k, 71 * k, 11 * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hex2rgb("ecfef3"))
    d.line(P([(68, 71), (72, 75), (78, 67)]), fill=hex2rgb("013628"),
           width=w(3.2), joint="curve")
    for end in ((68, 71), (78, 67)):
        rr = w(3.2) / 2
        d.ellipse([end[0] * k - rr, end[1] * k - rr, end[0] * k + rr, end[1] * k + rr],
                  fill=hex2rgb("013628"))

    return img.resize((size, size), Image.LANCZOS)


def main():
    targets = {
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    for name, size in targets.items():
        icon = draw_icon(size).convert("RGB")
        path = os.path.join(OUT_DIR, name)
        icon.save(path, "PNG")
        print(f"  OK  {name:<22} {size}x{size}")


if __name__ == "__main__":
    print("Generando iconos de Mi Despensa...")
    main()
