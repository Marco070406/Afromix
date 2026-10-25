# Logo AfroMix

**Idée :** l'Afrique devient un peigne afro. Les dents, taillées dans le nord du continent,
ont des longueurs différentes, comme les barres d'un égaliseur : le continent, la culture
et la musique en un seul signe.

## Fichiers (`final/`)

| Fichier | Usage |
|---|---|
| `afromix-logo-dark-bg.svg` | Logo principal sur fond sombre (le site) |
| `afromix-logo-light-bg.svg` | Logo principal sur fond clair (documents, partenaires) |
| `afromix-logo-black.svg` / `-white.svg` | Impression une couleur, tampons, gravure, fonds photo |
| `afromix-symbol.svg` | Symbole seul en dégradé (avatars, réseaux sociaux) |
| `afromix-symbol-black.svg` / `-white.svg` / `-violet.svg` | Symbole une couleur |
| `afromix-symbol-small.svg` | **Version petite taille** (≤ 32 px) : 3 dents larges, sans Madagascar |
| `afromix-app-icon.svg` (+ `-small`) | Icône d'application : tuile dégradée, symbole blanc |
| `favicon.ico` | Favicon 16/32/48 px |
| `png/` | Icônes d'app 512, 192, Apple 180 ; favicons 16/32/48 ; logo blanc pour les e-mails |

Tous les SVG sont des tracés purs : pas de texte live, pas de masque, pas d'image intégrée.

## Couleurs

| Rôle | HEX | RGB |
|---|---|---|
| Violet (début du dégradé) | `#9333EA` | 147, 51, 234 |
| Rose (fin du dégradé) | `#DB2777` | 219, 39, 119 |
| Encre (texte sur clair) | `#111114` | 17, 17, 20 |
| Papier (texte sur sombre) | `#F5F5F7` | 245, 245, 247 |

Dégradé à 135° (haut-gauche → bas-droite) sur le symbole, quasi horizontal sur « Mix ».
En une seule couleur, utiliser le violet `#9333EA`, le noir ou le blanc. Pour une impression
en quadrichromie ou en Pantone, faire valider les équivalences par l'imprimeur.

## Typographie

« AfroMix » est en **Bricolage Grotesque ExtraBold (800)**, vectorisée (licence SIL Open Font,
usage dans un logo autorisé). « Afro » prend la couleur du texte, « Mix » le dégradé.

## Règles

- **Zone de protection :** autour du logo, laisser au moins la largeur d'une dent du peigne × 3
  (≈ 1/8 de la hauteur du logo) sans texte ni autre élément.
- **Tailles minimales :** logo horizontal 24 px de haut à l'écran (15 mm en impression) ;
  symbole 16 px, avec la version `small` en dessous de 32 px.
- **Fonds :** dégradé sur sombre ou blanc ; sur photo ou fond coloré, version blanche ou noire.
- **À ne pas faire :** déformer ou incliner le logo, changer les couleurs du dégradé, ajouter
  une ombre ou un contour, recomposer le nom dans une autre police, retirer les dents, placer
  le symbole en dégradé sur un fond violet ou rose.

## Sur le site

- Composants : `app/(frontend)/components/brand/afromix-logo.tsx`
  (`<AfromixLogo />` horizontal, `<AfromixSymbol />` seul, qui passe automatiquement en
  version petite taille à 32 px et moins).
- Icônes : `app/(frontend)/icon.svg`, `app/(frontend)/apple-icon.png`, `public/favicon.ico`.
- E-mails : `public/brand/afromix-logo-white.png` (logo blanc 299×96, affiché en 150×48),
  référencé par `lib/email.ts` via `NEXT_PUBLIC_APP_URL` — les clients mail n'affichent pas le SVG.

## Régénérer

```bash
python build_kit.py
```

Le script reconstruit tout `final/` et `components/brand/afromix-paths.ts` à partir de
`make_africa.py` (côtes en longitude/latitude, dents) et de la police mise en cache par
`next/font`. Il demande fontTools, brotli, skia-pathops et Pillow
(`python -m pip install --user fonttools brotli skia-pathops pillow`), et Chrome pour les PNG.
Après une régénération, recopier `final/favicon.ico` dans `public/`,
`final/afromix-symbol-small.svg` dans `app/(frontend)/icon.svg` et
`final/png/apple-touch-icon-180.png` dans `app/(frontend)/apple-icon.png`, et
`final/png/afromix-logo-white-email.png` dans `public/brand/afromix-logo-white.png`.

`concepts/` garde les pistes explorées (Play-A, Onde…) et chaque itération ;
`concepts.html` est la planche de présentation des trois pistes.

## Limites

- Aucune recherche d'antériorité n'a été faite : faire vérifier la marque (INPI/OAPI/EUIPO,
  recherche d'image inversée) avant un dépôt.
- La carte est simplifiée à partir de points de côte réels ; les îles autres que Madagascar
  sont volontairement omises.
