"""Génère preview.html : chaque SVG en grand, aux tailles 64/32/16, sur clair/sombre,
en dégradé de marque, et flouté (test du plissement d'yeux).
Usage : python make_preview.py fichier1.svg fichier2.svg ... -o preview.html"""
import re, sys, pathlib

args = sys.argv[1:]
out = args[args.index("-o") + 1] if "-o" in args else "preview.html"
files = [a for a in args if a.endswith(".svg")]

def inner(path, fill):
    svg = pathlib.Path(path).read_text(encoding="utf-8")
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    return svg.replace('fill="#000"', f'fill="{fill}"').replace('stroke="#000"', f'stroke="{fill}"')

GRAD = ('<defs><linearGradient id="g{i}" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#9333EA"/><stop offset="1" stop-color="#DB2777"/></linearGradient></defs>')

rows = []
for i, f in enumerate(files):
    black, white = inner(f, "#000"), inner(f, "#fff")
    grad = inner(f, f"url(#g{i})").replace(">", ">" + GRAD.format(i=i), 1)
    def sized(svg, px):
        return svg.replace("<svg ", f'<svg width="{px}" height="{px}" ', 1)
    rows.append(f"""
<section><h2>{pathlib.Path(f).stem}</h2><div class="row">
 <div class="tile light">{sized(black,220)}</div>
 <div class="tile dark">{sized(grad,220)}</div>
 <div class="tile dark">{sized(white,220)}</div>
 <div class="sizes light">{''.join(sized(black,s) for s in (64,32,16))}</div>
 <div class="sizes dark">{''.join(sized(white,s) for s in (64,32,16))}</div>
 <div class="tile light blur">{sized(black,120)}</div>
 <div class="appicon">{sized(white,72)}</div>
</div></section>""")

html = f"""<!doctype html><meta charset="utf-8"><title>Logo concepts</title>
<style>
body{{font-family:system-ui;margin:24px;background:#eee;color:#111}}
h2{{font-size:14px;margin:18px 0 8px}} .row{{display:flex;gap:12px;align-items:center;flex-wrap:wrap}}
.tile{{padding:14px;border-radius:12px}} .light{{background:#fff}} .dark{{background:#09090E}}
.sizes{{display:flex;gap:14px;align-items:center;padding:14px;border-radius:12px}}
.blur svg{{filter:blur(4px)}}
.appicon{{width:112px;height:112px;border-radius:26px;display:flex;align-items:center;justify-content:center;
 background:linear-gradient(135deg,#9333EA,#DB2777)}}
</style>{''.join(rows)}"""
pathlib.Path(out).write_text(html, encoding="utf-8")
print("écrit", out)
