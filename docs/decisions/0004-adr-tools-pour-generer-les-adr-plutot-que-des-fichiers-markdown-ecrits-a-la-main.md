# 4. adr-tools pour generer les ADR plutot que des fichiers Markdown ecrits a la main

Date: 2026-09-14

## Status

Accepted

## Context

La consigne du jour demande de journaliser chaque decision significative
sous forme d'ADR, avec un template etabli (ex. `joelparkerhenderson/decision_record`
ou equivalent) plutot que des fichiers Markdown ecrits main sans
convention de numerotation.

## Decision

Installer [`adr-tools`](https://github.com/npryce/adr-tools) (formule
Homebrew officielle `adr-tools`, 1 978 installations/an sur
`homebrew-core`) via `brew install adr-tools`, et l'utiliser pour generer
chaque ADR : `adr init docs/decisions` (ou pose manuelle d'un `.adr-dir`
pour eviter le premier ADR generique « record architecture decisions »
quand une numerotation precise ADR-001..00N est demandee) puis
`adr new "<titre>"` pour chaque decision — l'outil gere la numerotation
sequentielle et applique le template de Michael Nygard (Title / Status /
Context / Decision / Consequences,
http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).
Le contenu (Context/Decision/Consequences) est ensuite redige a la main
dans chaque fichier genere.

## Consequences

Numerotation et nommage de fichiers coherents et automatiques
(`NNNN-slug-du-titre.md`), sans script de numerotation maison. Le meme
outil est utilise a l'identique dans `fvegiard/cloudflare/docs/decisions/`
pour les ADR-0001..0004 sur les decisions CI/Workers.
