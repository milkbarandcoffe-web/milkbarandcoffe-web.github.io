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

App esistenti: `ipx/` (IPRATICO-X), `mio/` (Il mio listino dei camerieri, `param: 'k'`), `mpx/` (PRINT-X, ex MAGICPRINT-X, `param: 'k'`), `msx/` (MAGICSUITE-X, marrone scuro #4e342e, `param: 'k'`, guscio della suite `pwa/guscio-suite.js`), `ox/` (ORDINI-X, giallo #f9a825, `param: 'k'`, testo scuro), `pnx/` (PIENISSIMO-X, verde menta #7ddc9c, `param: 'k'`, testo scuro).

Regola della suite: ogni app nuova ha il suo guscio qui dal giorno in cui nasce (elenco in `gas-codice/SUITE/gusci.json`).

## Chiave sbagliata dentro il guscio (25/11/2026)
Se la pagina dell app chiede la chiave e si preme ENTRA, la pagina manda la chiave al guscio (`postMessage {appx:'chiave', k}` verso questo sito). Il guscio la accetta solo da pagine Google (googleusercontent.com / script.google.com), la salva (`appx_ID_tok`) e riapre l app nell iframe: non si esce dalla cornice. Lo fanno ORDINI-X 0.5 e MAGICPRINT-X 4.14 (`goto`). La chiave del link scartata si ricorda (`appx_ID_scarta`): se l icona la ripete a ogni apertura vale quella salvata.

## Guscio della suite MAGICSUITE-X (26/11/2026)
`msx/` usa `pwa/guscio-suite.js` (copia di `guscio.js` con il cambio app; `guscio.js` resta per le app singole e non e cambiato).
- La home di MAGICSUITE-X manda `{appx:'apri', url, colore, su, nome}`: la cornice apre quell app (solo link `script.google.com/macros/s/.../exec?...`), la barra del telefono prende il suo colore, il guscio risponde `{appx:'ok'}` (senza risposta la pagina apre il link fuori dal guscio).
- La X in alto a destra delle app (SUITE 1.2, solo con `suite=1` nel link) manda `{appx:'casa'}`: si torna a MAGICSUITE-X.
- `{appx:'chiave'}` con un app aperta: riapre quell app con la chiave nuova (la chiave della suite resta).
- Senza chiave (iPhone/iPad: l app aperta dall icona della Home non vede quello che Safari ha salvato e parte senza ?k=): chiede il PIN, lo salva nell app e riparte con ?k= (27/11).

## Microfono per le app (27/11/2026)
Nella cornice dell'app il microfono non e permesso (iframe senza `allow=microphone`, e le cornici di Google sotto): su Android il riconoscimento vocale parte ma non sente. In `guscio.js` e `guscio-suite.js` il guscio ascolta al posto dell'app: l'app manda `{appx:'detta'}` (o `'detta-stop'`), il guscio usa SpeechRecognition (it-IT) e risponde a quella pagina con `{appx:'dettato', via | t (testo finora) | err | fine}`. Solo da pagine Google. Lo usa PIENISSIMO-X 0.7 (chat Claudio); se il guscio non risponde l'app prova da sola. La prima volta il telefono chiede il permesso del microfono per questo sito. iPhone/iPad da provare.
