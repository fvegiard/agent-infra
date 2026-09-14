# 3. MCP Inspector officiel plutot qu'un script JSON-RPC maison pour verifier les serveurs MCP

Date: 2026-09-14

## Status

Accepted

## Context

Avant d'enregistrer le serveur MCP `@modelcontextprotocol/server-sequential-thinking`
dans un outil (Codex CLI), il faut verifier qu'il demarre et repond
correctement au protocole MCP. Premiere verification : un script Node
maison qui `spawn` le serveur et envoie a la main une requete JSON-RPC
`initialize` sur stdin/stdout — fonctionnel, mais une reimplementation ad
hoc d'un client MCP minimal.

## Decision

Utiliser l'outil officiel de l'organisation `modelcontextprotocol` :
[`@modelcontextprotocol/inspector`](https://github.com/modelcontextprotocol/inspector)
(10 873 etoiles, 1 515 forks, MIT, derniere release 2.6.0 le 2026-09-09,
push le plus recent 2026-09-14, 24 issues ouvertes seulement — activement
maintenu par l'org MCP elle-meme). Mode CLI non interactif documente dans
`clients/cli/README.md` et `docs/cli-smoke-testing.md` :

```
npx --yes @modelcontextprotocol/inspector@2.6.0 --cli \
  npx -y @modelcontextprotocol/server-sequential-thinking \
  -- --method tools/list --format json
```

Verifie en direct (exit code 0) : la sortie JSON liste l'outil enregistre
`sequentialthinking` avec son schema complet — confirmant que le serveur
demarre, repond au handshake MCP et expose bien son outil.

## Consequences

La verification s'appuie sur le meme outil que l'equipe MCP recommande
pour deboguer/tester n'importe quel serveur MCP, avec gestion d'erreurs
standardisee (codes de sortie 0-8 documentes) plutot qu'un parsing JSON-RPC
maison fragile. Le script maison (`/tmp/mcp_handshake_test.mjs`) est
abandonne, non commite.
