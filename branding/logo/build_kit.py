"""Construit le kit du logo AfroMix (symbole « Afrique-peigne ») dans final/.

Sources : make_africa.py (géométrie du continent et des dents) et la police
Bricolage Grotesque mise en cache par next/font (.next/…/media/*.woff2).
Dépendances : fontTools, brotli, skia-pathops, Pillow ; Chrome pour les PNG.

Usage : python build_kit.py            (depuis branding/logo/)
"""
import glob
import io
import os
import pathlib
import subprocess
import tempfile

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image

import make_africa as af

HERE = pathlib.Path(__file__).parent
OUT = HERE / "final"
PNG = OUT / "png"
APP = HERE.parent.parent / "app" / "(frontend)"

VIOLET, ROSE, INK, PAPER = "#9333EA", "#DB2777", "#111114", "#F5F5F7"
CHROME = next((p for p in [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
] if os.path.exists(p)), None)


# ── Géométrie ─────────────────────────────────────────────────────────────────

def to_path(d):
    p = pathops.Path()
    parse_path(d, p.getPen())
    return p


def to_d(path, transform=(1, 0, 0, 1, 0, 0)):
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    path.draw(TransformPen(pen, transform))
    return pen.getCommands()


def symbol_path(slits, slit_w, with_madagascar=True):
    """Continent moins les fentes, fusionné en un seul tracé (aucun masque)."""
    af.SLIT_W = slit_w
    africa = to_path(af.smooth_closed(af.COAST))
    cuts = to_path("".join(af.slit_path(cx, b) for cx, b in slits))
    shape = pathops.op(africa, cuts, pathops.PathOp.DIFFERENCE)
    if with_madagascar:
        shape = pathops.op(shape, to_path(af.smooth_closed(af.MADAGASCAR)), pathops.PathOp.UNION)
    return shape


SYMBOL = symbol_path(af.SLITS, 11)
# Version ≤ 32 px : moins de dents, plus larges, sans Madagascar (illisible à cette taille)
SYMBOL_SMALL = symbol_path([(70, 98), (110, 92), (150, 112)], 20, with_madagascar=False)


# ── Nom « AfroMix » vectorisé ────────────────────────────────────────────────

def load_font():
    css = glob.glob(str(HERE.parent.parent / ".next/**/*bricolage_grotesque*.css"), recursive=True)
    if not css:
        raise SystemExit("Police introuvable : lancez `npm run dev` une fois pour que next/font la télécharge.")
    text = pathlib.Path(css[0]).read_text(encoding="utf-8")
    # Bloc @font-face couvrant le latin de base (U+0000-00FF)
    for block in text.split("@font-face")[1:]:
        if "U+0000-00FF" in block or "U+??" in block:
            url = block.split("url(")[1].split(")")[0].strip("\"'")
            break
    media = glob.glob(str(HERE.parent.parent / ".next/**/media" / pathlib.Path(url).name), recursive=True)
    font = TTFont(media[0])
    return instancer.instantiateVariableFont(font, {"wght": 800}) if "fvar" in font else font


def wordmark_paths(text="AfroMix", cap_height=100.0, tracking=-0.02):
    """Renvoie [(d, largeur)] par lettre, ligne de base à y=0, et la largeur totale."""
    font = load_font()
    cmap, gs = font.getBestCmap(), font.getGlyphSet()
    upm = font["head"].unitsPerEm
    cap = getattr(font["OS/2"], "sCapHeight", 0) or upm * 0.7
    s = cap_height / cap
    x, out = 0.0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, 0)))
        out.append(pen.getCommands())
        x += gs[g].width * s + tracking * upm * s
    return out, x - tracking * upm * s


# ── SVG ───────────────────────────────────────────────────────────────────────

def grad(id_):
    return (f'<linearGradient id="{id_}" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="{VIOLET}"/><stop offset="1" stop-color="{ROSE}"/></linearGradient>')


def svg(w, h, body, title="AfroMix"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{body}</svg>\n")


def write(name, content):
    (OUT / name).write_text(content, encoding="utf-8")
    return OUT / name


def symbol_svg(path, fill):
    d = to_d(path)
    if fill == "gradient":
        return svg(256, 256, f'<defs>{grad("g")}</defs><path fill="url(#g)" d="{d}"/>')
    return svg(256, 256, f'<path fill="{fill}" d="{d}"/>')


def app_icon_svg(path, size=512, radius=0.22, scale=0.74):
    d = to_d(path)
    off = size * (1 - scale) / 2
    k = size * scale / 256
    return svg(size, size,
               f'<defs>{grad("bg")}</defs><rect width="{size}" height="{size}" rx="{size * radius:g}" fill="url(#bg)"/>'
               f'<path fill="#fff" transform="translate({off:g} {off:g}) scale({k:g})" d="{d}"/>')


def lockup_svg(afro_fill, mix_fill, symbol_fill):
    """Logo horizontal : symbole 256 + espace + nom (capitales ≈ 34 % de la hauteur).
    Le continent laisse ~30 unités vides à droite du cadre : l'espace optique vaut ~gap+30."""
    letters, width = wordmark_paths(cap_height=88)
    gap, baseline = 14, 176
    x0 = 256 + gap
    defs = []
    if "gradient" in (symbol_fill, mix_fill):
        defs = [grad("gs"), grad("gm").replace('x2="1" y2="1"', 'x2="1" y2="0.4"')]
    sym = "url(#gs)" if symbol_fill == "gradient" else symbol_fill
    mix = "url(#gm)" if mix_fill == "gradient" else mix_fill
    afro_d = "".join(letters[:4])
    mix_d = "".join(letters[4:])
    body = (
        (f"<defs>{''.join(defs)}</defs>" if defs else "")
        + f'<path fill="{sym}" d="{to_d(SYMBOL)}"/>'
        + f'<g transform="translate({x0} {baseline})"><path fill="{afro_fill}" d="{afro_d}"/>'
        + f'<path fill="{mix}" d="{mix_d}"/></g>'
    )
    return svg(x0 + width + 8, 256, body)


# ── PNG via Chrome headless ──────────────────────────────────────────────────

def render_png(svg_file, size, out, height=None):
    """Rendu PNG transparent ; `size` = largeur, `height` = hauteur (carré par défaut)."""
    height = height or size
    if not CHROME:
        print("  (Chrome introuvable : PNG ignoré)", out.name)
        return None
    with tempfile.TemporaryDirectory() as tmp:
        html = pathlib.Path(tmp) / "r.html"
        html.write_text(
            f'<html><body style="margin:0;background:transparent">'
            f'<img src="{pathlib.Path(svg_file).resolve().as_uri()}" width="{size}" height="{height}" style="display:block">'
            "</body></html>", encoding="utf-8")
        shot = pathlib.Path(tmp) / "s.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--default-background-color=00000000", "--allow-file-access-from-files",
                        f"--window-size={size},{height}", f"--screenshot={shot}", html.as_uri()],
                       check=True, capture_output=True, timeout=60)
        Image.open(shot).convert("RGBA").crop((0, 0, size, height)).save(out)
    return out


def main():
    OUT.mkdir(exist_ok=True)
    PNG.mkdir(exist_ok=True)

    files = {
        "afromix-symbol.svg": symbol_svg(SYMBOL, "gradient"),
        "afromix-symbol-black.svg": symbol_svg(SYMBOL, "#000"),
        "afromix-symbol-white.svg": symbol_svg(SYMBOL, "#fff"),
        "afromix-symbol-violet.svg": symbol_svg(SYMBOL, VIOLET),
        "afromix-symbol-small.svg": symbol_svg(SYMBOL_SMALL, "gradient"),
        "afromix-app-icon.svg": app_icon_svg(SYMBOL),
        "afromix-app-icon-small.svg": app_icon_svg(SYMBOL_SMALL, scale=0.78),
        # Android « maskable » : fond plein jusqu'aux bords, symbole dans la zone sûre (cercle de 80 %)
        "afromix-app-icon-maskable.svg": app_icon_svg(SYMBOL, radius=0, scale=0.6),
        "afromix-logo-dark-bg.svg": lockup_svg(PAPER, "gradient", "gradient"),
        "afromix-logo-light-bg.svg": lockup_svg(INK, "gradient", "gradient"),
        "afromix-logo-black.svg": lockup_svg("#000", "#000", "#000"),
        "afromix-logo-white.svg": lockup_svg("#fff", "#fff", "#fff"),
    }
    for name, content in files.items():
        write(name, content)
        print("svg", name)

    # Icônes : app (512/192/180) et favicon multi-tailles
    for size in (512, 192):
        render_png(OUT / "afromix-app-icon.svg", size, PNG / f"afromix-app-icon-{size}.png")
    render_png(OUT / "afromix-app-icon.svg", 180, PNG / "apple-touch-icon-180.png")
    for size in (512, 192):
        render_png(OUT / "afromix-app-icon-maskable.svg", size, PNG / f"afromix-app-icon-maskable-{size}.png")
    # Logo blanc en PNG pour les e-mails (les clients mail n'affichent pas le SVG), 2× pour les écrans HD
    lockup_w = float(files["afromix-logo-white.svg"].split('viewBox="0 0 ')[1].split(" ")[0])
    email_h = 96
    render_png(OUT / "afromix-logo-white.svg", round(email_h * lockup_w / 256), PNG / "afromix-logo-white-email.png", email_h)
    smalls = [render_png(OUT / "afromix-symbol-small.svg", s, PNG / f"favicon-{s}.png") for s in (16, 32, 48)]
    if all(smalls):
        imgs = [Image.open(p) for p in smalls]
        imgs[-1].save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:-1])
        print("ico favicon.ico")
    print("png", ", ".join(sorted(p.name for p in PNG.glob("*.png"))))

    # Données pour le composant React du site
    ts = HERE.parent.parent / "app" / "(frontend)" / "components" / "brand" / "afromix-paths.ts"
    ts.parent.mkdir(parents=True, exist_ok=True)
    letters, width = wordmark_paths(cap_height=100)
    ts.write_text(
        "// Généré par branding/logo/build_kit.py — ne pas modifier à la main.\n"
        "// Symbole « Afrique-peigne » (viewBox 0 0 256 256) et nom vectorisé (Bricolage Grotesque 800).\n"
        f'export const SYMBOL_PATH = "{to_d(SYMBOL)}";\n'
        f'export const SYMBOL_SMALL_PATH = "{to_d(SYMBOL_SMALL)}";\n'
        f'export const WORDMARK_AFRO_PATH = "{"".join(letters[:4])}";\n'
        f'export const WORDMARK_MIX_PATH = "{"".join(letters[4:])}";\n'
        f"export const WORDMARK_WIDTH = {width:.1f}; // capitales de 100 unités, ligne de base à y=0\n",
        encoding="utf-8")
    print("ts", ts.relative_to(HERE.parent.parent))


if __name__ == "__main__":
    main()
