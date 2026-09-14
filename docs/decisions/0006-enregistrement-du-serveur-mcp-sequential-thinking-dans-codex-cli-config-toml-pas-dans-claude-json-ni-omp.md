# 6. Enregistrement du serveur MCP sequential-thinking dans Codex CLI (config.toml), pas dans claude.json ni omp

Date: 2026-09-14

## Status

Accepted

## Context

Trois configurations MCP existent sur ce poste : `~/.codex/config.toml`
(sections `[mcp_servers.*]`, deja utilisee pour `node_repl`, `cloudflare-api`),
`~/.claude.json` (cle `mcpServers`, deja utilisee pour `playwright`), et
`~/.omp/agent/config.yml`. La consigne interdit explicitement de modifier
`~/.omp` (c'est le harnais qui execute cette tache elle-meme). Entre les deux
options restantes, Codex CLI est installe (`codex-cli 0.154.0`,
`/home/linuxbrew/.linuxbrew/bin/codex`) et expose une commande dediee
documentee officiellement PAR LE SERVEUR LUI-MEME : le README de
`@modelcontextprotocol/server-sequential-thinking`
(github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/README.md,
section « Usage with Codex CLI ») donne textuellement
`codex mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking`.

## Decision

Executer cette commande telle quelle plutot que d'editer `config.toml` a la
main. Verifie : `codex mcp list` et `codex mcp get sequential-thinking`
affichent l'entree (`transport: stdio`, `command: npx`,
`args: -y @modelcontextprotocol/server-sequential-thinking`) ; le fichier
`~/.codex/config.toml` contient la section generee
`[mcp_servers.sequential-thinking]` au bon format (identique au style des
entrees `node_repl`/`cloudflare-api` deja presentes). `~/.claude.json` n'est
pas touche (aucune tache ne demande d'ajouter ce serveur a Claude Code) ;
`~/.omp` n'est pas touche (interdiction explicite).

## Consequences

Le serveur est disponible pour Codex CLI immediatement, sans risque
d'erreur de syntaxe TOML manuelle. Si un autre outil (Claude Code, etc.) a
besoin du meme serveur plus tard, il faudra l'enregistrer separement dans
sa propre configuration (`~/.claude.json` suit un schema JSON different,
deja illustre par l'entree `playwright` existante).
