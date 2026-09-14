# 2. chrome-launcher plutot que des flags Chrome ecrits a la main

Date: 2026-09-14

## Status

Accepted

## Context

Besoin : lancer un Chrome headless a nous (jamais s'attacher a une session
existante), l'epingler sur le port CDP 9222, avec un `--user-data-dir`
fixe, et le garder vivant pour que des subagents de recherche GitHub s'y
connectent. Premiere version : une invocation `google-chrome --headless=new
--remote-debugging-port=9222 --user-data-dir=... --no-sandbox --disable-gpu`
ecrite a la main, supervisee par le process manager (`hub`) — fonctionnelle
mais une reimplementation ad hoc des flags/de l'attente de disponibilite du
port.

## Decision

Adopter [`chrome-launcher`](https://github.com/GoogleChrome/chrome-launcher)
(GoogleChrome org, Apache-2.0, 1 361 etoiles, 14M telechargements npm/semaine,
maintenu par l'equipe Lighthouse — Lighthouse lui-meme en depend en
production pour exactement ce role, `github.com/GoogleChrome/lighthouse`
`package.json` : `"chrome-launcher": "^1.2.1"`, dernier commit 2025-09-25).
C'est une librairie (pas de CLI de lancement), donc integree via un petit
script Node (`tools/chrome-cdp/launch.mjs`, ~10 lignes) :
`launch({ port: 9222, userDataDir, chromeFlags: ['--headless','--disable-gpu'],
handleSIGINT: false })`. La promesse ne se resout qu'une fois le port CDP
reellement pret (poll toutes les 500 ms), et si le port 9222 est deja pris
par NOTRE instance, `launch()` l'adopte plutot que d'echouer. `hub` reste la
couche de supervision (redemarrage, persistance) ; seule la construction des
flags/l'attente de disponibilite est deleguee a l'outil.

## Consequences

Plus besoin de reimplementer/maintenir la logique d'attente de port ni la
liste de flags par defaut : c'est le meme code que Lighthouse utilise en
prod. Cout : une dependance npm (`chrome-launcher`) et un petit script
wrapper a maintenir dans ce repo. Alternative ecartee : `puppeteer-core`
(16M telechargements/semaine, aussi tres etabli) — plus adapte comme pilote
CDP que comme simple lanceur de processus (port ephemere par defaut, gros
arbre de dependances, lie son propre cycle de vie SIGINT/SIGTERM au
process) ; Lighthouse utilise d'ailleurs les deux outils cote a cote,
chacun pour son role.
