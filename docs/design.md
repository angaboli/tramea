# Tramea — Design System (référence)

Source : handoff Claude Design (`design/Tramea-Design-System.html`).
Identité **aérée, rassurante**, claire + sombre. Police **Hanken Grotesk** (UI) +
**JetBrains Mono** (code). Bleu `#2F557F` (structure) + orange `#FF6C1A` (accent,
à doser). Tokens en variables CSS, thème sombre via `data-theme="dark"`.
**Aucune couleur en dur dans les composants** — tout passe par les tokens.

## Couleurs de marque
- **Bleu** 50→900 : `#EEF3F9 #D8E3EF #B0C6DD #82A3C5 #5681AB #3A6494 #2F557F(600★) #284769 #213853 #182838`
- **Orange** 50→900 : `#FFF2EA #FFE0CC #FFC09A #FF9D63 #FF842F #FF6C1A(500★) #E85808 #BC4708 #94390C #6E2C0B`
- **Neutres** 0→950 : `#FFFFFF #F6F8FA #EFF1F5 #E2E6EB #CBD2DA #9AA5B1 #6B7785 #4E5965 #3A434E #262C34 #161A20 #0E1116`

## Tokens sémantiques — thème clair
```
--bg:#F6F8FA  --bg-subtle:#EEF1F5  --surface:#FFFFFF  --surface-2:#F7F9FB  --surface-hover:#F1F4F8
--border:#E2E6EB  --border-strong:#CBD2DA
--text:#1A2129  --text-secondary:#56616E  --text-muted:#8A95A1  --text-inverse:#FFFFFF
--primary:#2F557F  --primary-hover:#284769  --primary-active:#213853  --primary-soft:#EAF1F8  --primary-soft-text:#2F557F
--accent:#FF6C1A  --accent-hover:#E85808  --accent-active:#BC4708  --accent-soft:#FFF1E8  --accent-soft-text:#BC4708
--success:#1F8A5B  --success-soft:#E6F4EC  --warning:#C9881A  --warning-soft:#FBF1DC
--error:#D64545  --error-soft:#FBE9E9  --info:#2F557F  --info-soft:#EAF1F8
```

## Tokens sémantiques — thème sombre (`[data-theme="dark"]`)
```
--bg:#0E1116  --bg-subtle:#11151B  --surface:#171C23  --surface-2:#1D232B  --surface-hover:#232A33
--border:#2A323C  --border-strong:#3A434E
--text:#EAEEF3  --text-secondary:#A9B4C0  --text-muted:#6E7A87  --text-inverse:#0E1116
--primary:#4A77A6  --primary-hover:#5E8AB8  --primary-active:#3A6494  --primary-soft:#1A2A3A  --primary-soft-text:#9CC0E4
--accent:#FF7A2E  --accent-hover:#FF8A45  --accent-active:#FF6C1A  --accent-soft:#2A1A10  --accent-soft-text:#FFA76B
--success:#34A56F  --warning:#D69B2E  --error:#E26464  --info:#5E8AB8
```

## Rayons / Ombres / Focus
```
--r-xs:4  --r-sm:6  --r-md:10  --r-lg:14  --r-xl:20  --r-2xl:28  --r-full:999   (px)
--shadow-sm / md / lg / xl  (élévation discrète)
--focus: anneau 3px primary @28% (clair) / @40% (sombre)
```

## Typographie (échelle observée)
| Usage | Taille | Poids |
|---|---|---|
| Display (hero) | 62 | 800 |
| H2 section | 36 | 700 |
| H3 carte | 19 | 700 |
| Texte large | 18–20 | 400–500 |
| Corps | 15–16 | 400 |
| Label / méta | 12–14 | 600–700 |
| Mono (code/réf) | 10–15 | JetBrains Mono |

Interlignage corps ~1.4–1.55. `letter-spacing` négatif léger sur les titres.

## Espacement
Base **4 px** ; toute l'échelle en multiples (4, 8, 12, 16, 20, 24, 26, 40…).

## Accessibilité
- Contraste **AA+**.
- Cibles tactiles **44 px** minimum (mobile-first).
- Anneau de **focus** visible (`--focus`) sur tous les interactifs.

## Composants couverts par le design
Boutons (5 variantes × états), champs, sélecteurs, cases, radios, interrupteurs,
badges de statut, alertes, info-bulles, onglets, fil d'Ariane, cartes, tableau,
navigation latérale, header, modale, menu contextuel, états vide/chargement.
**Métier** : liste de trame réordonnable, cartes d'export PDF/ProPresenter,
gestion des rôles + matrice de permissions. **Écrans** : création de trame,
sélection de chants, aperçu PDF.

## Mise en œuvre
- `src/styles/tokens.css` — toutes les variables (clair + sombre).
- `tailwind.config` — `darkMode: ['selector','[data-theme="dark"]']`, couleurs et
  polices mappées sur les variables CSS.
- Bascule de thème via store **Zustand** (`data-theme` sur `<html>`).
