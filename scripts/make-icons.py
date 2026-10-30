# Genera el icono (bola de tenis sobre pista azul) y todos los tamaños de Android. Todo por código.
from PIL import Image, ImageDraw, ImageFilter
import os, math
def ball(size, bg=True, scale=0.62, rounded=True):
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg:
        d.rounded_rectangle([0, 0, S, S], radius=S // 5 if rounded else 0, fill=(14, 58, 92))
        # líneas de pista
        w = S // 40
        d.rectangle([S * 0.12, S * 0.12, S * 0.88, S * 0.88], outline=(255, 255, 255, 70), width=w)
        d.line([S * 0.5, S * 0.12, S * 0.5, S * 0.88], fill=(255, 255, 255, 70), width=w)
    r = S * scale / 2; cx = cy = S / 2
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([cx - r + S * .03, cy - r + S * .05, cx + r + S * .03, cy + r + S * .05], fill=(0, 0, 0, 110))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.02)))
    b = Image.new("RGBA", (S, S), (0, 0, 0, 0)); bd = ImageDraw.Draw(b)
    for i in range(60, 0, -1):  # degradado
        k = i / 60; rr = r * k
        col = (int(150 + 90 * (1 - k)), int(185 + 70 * (1 - k)), int(0 + 90 * (1 - k) ** 2))
        bd.ellipse([cx - rr - r * 0.18 * (1 - k), cy - rr - r * 0.22 * (1 - k), cx + rr - r * 0.18 * (1 - k), cy + rr - r * 0.22 * (1 - k)], fill=col)
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    seam = ImageDraw.Draw(b); sw = int(r * 0.09)
    seam.arc([cx - r * 2.05, cy - r, cx - r * 0.05, cy + r], -70, 70, fill=(255, 255, 255), width=sw)
    seam.arc([cx + r * 0.05, cy - r, cx + r * 2.05, cy + r], 110, 250, fill=(255, 255, 255), width=sw)
    clipped = Image.new("RGBA", (S, S), (0, 0, 0, 0)); clipped.paste(b, (0, 0), mask)
    im.alpha_composite(clipped)
    return im.resize((size, size), Image.LANCZOS)
os.makedirs("public", exist_ok=True)
for s in (512, 192): ball(s).save(f"public/icon-{s}.png")
ball(512).save("icon-512.png")
res = "android/app/src/main/res"
for name, s in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    ball(s).save(f"{res}/mipmap-{name}/ic_launcher.png")
    c = ball(s, rounded=False); m = Image.new("L", (s, s), 0); ImageDraw.Draw(m).ellipse([0, 0, s - 1, s - 1], fill=255)
    rnd = Image.new("RGBA", (s, s), (0, 0, 0, 0)); rnd.paste(c, (0, 0), m); rnd.save(f"{res}/mipmap-{name}/ic_launcher_round.png")
    f = int(s * 108 / 48); ball(f, bg=False, scale=0.46).save(f"{res}/mipmap-{name}/ic_launcher_foreground.png")
# pantallas de carga
import glob
for p in glob.glob(f"{res}/drawable*/splash.png"):
    w, h = Image.open(p).size
    sp = Image.new("RGBA", (w, h), (7, 17, 30, 255)); b = ball(int(min(w, h) * 0.35), bg=False, scale=0.9)
    sp.alpha_composite(b, ((w - b.width) // 2, (h - b.height) // 2)); sp.convert("RGB").save(p)
print("iconos ok")
