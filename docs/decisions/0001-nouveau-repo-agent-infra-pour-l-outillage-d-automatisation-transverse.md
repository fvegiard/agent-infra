# 1. Nouveau repo agent-infra pour l'outillage d'automatisation transverse

Date: 2026-09-14

## Status

Accepted

## Context

La mission du jour couvre de l'outillage transverse a la stack d'agents
(n8n self-hoste, serveur MCP sequential-thinking, navigateur headless avec
port CDP ouvert pour la recherche GitHub) qui n'est pas specifique aux
Workers Cloudflare. Les deux seuls repos GitHub-tracked existants sur ce
poste sont `fvegiard/cloudflare` (code des Workers + CI) et
`fvegiard/cloudflare-private` (etat infra sensible). Aucun des deux n'est
le bon endroit pour du script de lancement Chrome, une config n8n ou des
notes d'enregistrement MCP : le melange polluerait le perimetre (et
l'historique CI) d'un repo dedie aux Workers.

## Decision

Creer un nouveau repo public `fvegiard/cloudflare... non` — cree
`fvegiard/agent-infra` (public, `gh repo create fvegiard/agent-infra
--public --clone`) pour heberger cet outillage transverse : scripts de
lancement, configuration n8n (hors secrets), notes d'integration MCP, et
les ADR qui documentent ces choix. Aucun secret n'y est commite (voir
README).

## Consequences

Le repo Cloudflare reste focalise sur les Workers (son workflow CI ne se
declenche que sur `workers/**`, et un repo distinct pour l'outillage
d'agent evite tout risque de declenchement croise ou de confusion de
perimetre). Contrepartie : un repo de plus a maintenir et a decouvrir pour
quiconque cherche l'etat de l'infra Cloudflare (attenue par un lien croise
dans les rapports et par le README de chaque repo).
