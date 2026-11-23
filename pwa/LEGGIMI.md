# App installabili (PWA) per le web app Apps Script

Un'app Apps Script non si può installare da sola (gira dentro una pagina di Google). Qui c'è un "guscio" su GitHub Pages che si installa e dentro apre la web app a tutto schermo.

## Nuova app
1. Copia `pwa/modello/` in una cartella nuova, es. `nomeapp/` (link: `https://milkbarandcoffe-web.github.io/nomeapp/`).
2. In `index.html`: `id` (corto, unico), `nome`, `url` (/exec della web app), `colore`. Se la web app vuole un codice personale nel link, aggiungi `param: 'k'` (mai `c` o `sid`: riservati da Apps Script). Colore chiaro (es. giallo): aggiungi `su` (testo sopra il colore) e `scritta` (testo colorato su bianco), presi dal tema della SUITE (`--on`, `--ct`).
3. In `manifest.json`: `name`, `short_name`, colori. In `sw.js`: cambia il nome della cache.
4. Icone `icona-192.png` e `icona-512.png` (quadrate, il contenuto nel 80% centrale): sigla di 3 lettere + ZAVAN sul colore dell'app (bianco, o `--on` se il colore e chiaro).
5. La web app deve permettere l'iframe: `setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)`.

## Cosa vede l'utente
- Nel browser: guida per installare. Android/computer: tasto INSTALLA (se Chrome lo offre) oppure i passi col menu ⋮. iPhone/iPad: Safari → Condividi → Aggiungi alla schermata Home.
- Dopo l'installazione: "App installata ✓, per completare riaprila dall'icona" + OK (chiude la scheda, se il browser lo permette).
- Dall'icona: apre subito l'app. Con `?diretto=1` apre l'app anche nel browser. "Apri senza installare" salta la guida (ricordato sul telefono).

App esistenti: `ipx/` (IPRATICO-X), `mio/` (Il mio listino dei camerieri, `param: 'k'`), `mpx/` (MAGICPRINT-X, celeste #0288d1, `param: 'k'`), `ox/` (ORDINI-X, giallo #f9a825, `param: 'k'`, testo scuro).

Regola della suite: ogni app nuova ha il suo guscio qui dal giorno in cui nasce (elenco in `gas-codice/SUITE/gusci.json`).
