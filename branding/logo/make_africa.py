"""Génère le symbole « Afrique-peigne » (piste A1) à partir de coordonnées réelles.

Le continent est projeté (équirectangulaire) à partir de points de côte en
longitude/latitude, lissé en courbes de Bézier (Catmull-Rom), puis entaillé au nord
par des fentes de profondeurs variables : les dents d'un peigne afro, en rythme
d'égaliseur.

Usage : python make_africa.py <sortie.svg> [--no-teeth] [--fill #000]
"""
import sys

SCALE = 2.9
X0, Y0 = 28, 18  # origine du cadre 256×256 (remonté pour le centrage optique)

# Côtes du continent, sens horaire depuis Tanger (lon, lat)
COAST = [
    (-6, 35.8), (3, 36.8), (10, 37.2), (10.5, 34), (13, 32.9), (19, 30.4), (20, 32.1),
    (25, 31.6), (30, 31.2), (32.4, 31.2), (32.6, 29.8), (34.5, 26), (37.2, 19.6),
    (39.5, 15.5), (43.3, 12.4), (45, 10.4), (51.2, 11.8), (50.6, 9.4), (48.6, 5.6),
    (45.3, 2), (42, -1), (39.7, -4), (39.3, -6.8), (40.4, -10.6), (40.6, -15),
    (36.8, -18.6), (35.4, -22.4), (32.6, -25.8), (32.4, -28.6), (30.8, -30.6),
    (27.8, -33), (25.6, -33.9), (20, -34.8), (18.4, -34.3), (18, -32), (16.4, -28.6),
    (14.5, -22.9), (11.8, -17.3), (12.5, -13), (13.3, -8.8), (12.2, -6), (9.4, 0.4),
    (9.6, 3.6), (6.4, 4.3), (3.4, 6.4), (-0.2, 5.6), (-4, 5.2), (-7.5, 4.4),
    (-10.8, 6.3), (-13.2, 8.5), (-15.4, 11.6), (-17.4, 14.7), (-16.2, 18.2),
    (-17, 21), (-14.6, 25.8), (-13.2, 27.6), (-9.8, 29.8), (-9.4, 32.4), (-7.6, 33.6),
]
MADAGASCAR = [
    (49.3, -12), (50.4, -15.4), (49.6, -18), (48, -23.5), (47, -25.1), (45.2, -25.4),
    (43.6, -23.4), (43.3, -21.6), (44.2, -18.4), (44.2, -16.6), (46.3, -15.6), (48, -13.6),
]

# Fentes (dents du peigne) : centre x, profondeur basse y — rythme d'égaliseur
# Pas régulier sur toute la largeur du nord, comme un peigne ; seules les profondeurs varient
SLITS = [(58, 94), (82, 108), (106, 88), (130, 104), (154, 116), (178, 92)]
SLIT_W = 11
SLIT_R = 2.5  # fond plat, coins à peine adoucis : une dent, pas une coulure


def project(lon, lat):
    return X0 + (lon + 17) * SCALE, Y0 + (37 - lat) * SCALE


def smooth_closed(points, tension=0.5):
    """Catmull-Rom fermée → chemin de Bézier cubiques."""
    pts = [project(*p) for p in points]
    n = len(pts)
    d = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        d.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return "".join(d) + "Z"


def slit_path(cx, bottom):
    """Fente à fond plat (coins légèrement arrondis), partant au-dessus du cadre."""
    x0, x1, r = cx - SLIT_W / 2, cx + SLIT_W / 2, SLIT_R
    return (f"M{x0} -4V{bottom - r}A{r} {r} 0 0 0 {x0 + r} {bottom}"
            f"H{x1 - r}A{r} {r} 0 0 0 {x1} {bottom - r}V-4Z")


def build(teeth=True, fill="#000"):
    africa = smooth_closed(COAST)
    mada = smooth_closed(MADAGASCAR)
    if not teeth:
        body = f'<path fill="{fill}" d="{africa}{mada}"/>'
    else:
        # Continent moins les fentes : le masque reste un découpage net, sans chevauchement
        slits = "".join(slit_path(cx, b) for cx, b in SLITS)
        body = (
            '<defs><mask id="teeth" maskUnits="userSpaceOnUse" x="0" y="-8" width="256" height="272">'
            f'<rect x="0" y="-8" width="256" height="272" fill="white"/><path fill="black" d="{slits}"/></mask></defs>'
            f'<path fill="{fill}" mask="url(#teeth)" d="{africa}"/>'
            f'<path fill="{fill}" d="{mada}"/>'
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">\n'
        "  <!-- A1 · L'Afrique devient un peigne afro : dents au nord, en rythme d'égaliseur. "
        "Généré par make_africa.py -->\n  " + body + "\n</svg>\n"
    )


if __name__ == "__main__":
    args = sys.argv[1:]
    fill = args[args.index("--fill") + 1] if "--fill" in args else "#000"
    out = next(a for a in args if a.endswith(".svg"))
    with open(out, "w", encoding="utf-8") as f:
        f.write(build(teeth="--no-teeth" not in args, fill=fill))
    print("écrit", out)
