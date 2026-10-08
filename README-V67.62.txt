V67.62 — Hauteur de levage / Type de mât
- 3M, 4M -> suggestion automatique DUPLEX.
- 4.3M, 4.5M, 6M -> suggestion automatique TRIPLEX.
- Le champ Type de mât reste modifiable manuellement.
- Une modification manuelle reste prioritaire à l'enregistrement.

V67.63 — FIX EXPORTS
- Réactivation des fonctions globales exportChariotsExcel() et exportChariotsPDF().
- Export Excel XLSX avec fallback CSV si le CDN SheetJS est indisponible.
- Export PDF A4 paysage avec jsPDF + AutoTable et fallback impression navigateur.
- Cache-buster app.js mis à jour à v67.63.
