# agent-infra

Infrastructure d'automatisation et de decision pour la stack d'agents de
francis-v (webhooks/routage via n8n, raisonnement structure via MCP,
recherche web via navigateur CDP). Chaque outil adopte ici est un outil
tiers etabli sur GitHub (releases actives, adoption reelle), installe avec
une configuration minimale — jamais reimplemente. Chaque decision
significative est journalisee dans `docs/decisions/` (format ADR de
Michael Nygard, genere avec [adr-tools](https://github.com/npryce/adr-tools)).

## Contenu

- `docs/decisions/` — Architecture Decision Records (une par choix d'outil
  ou de configuration significatif).
- `tools/chrome-cdp/` — script de lancement Chrome headless avec port CDP
  fixe, base sur [`chrome-launcher`](https://github.com/GoogleChrome/chrome-launcher)
  (Google/Lighthouse), supervise par le process manager de l'agent.
- `n8n/` — configuration et export de workflow pour l'instance n8n
  self-hosted (edition Community, gratuite) qui sert de backbone
  d'automatisation (webhooks, routage/switch, boucles, hooks).

## Secrets

Aucun secret n'est commite dans ce repo. Les identifiants generes
(mot de passe proprietaire n8n, cles de chiffrement) vivent dans
`/home/francis-v/.config/francis/` (mode 600), jamais dans Git.
