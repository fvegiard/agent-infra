# ADR-001 : OpenClaw comme exécuteur agentique derrière n8n

**Date** : 2026-09-14
**Statut** : Accepté

## Contexte

Rendre Desktop Commander remote pleinement autonome : pipeline webhook public → n8n → exécuteur agentique multi-LLM qui touche le shell/fichiers de la station. Contraintes : zéro code « maison » côté orchestration (solutions éprouvées GitHub), 100 % local/gratuit, multi-LLM avec routage Ollama.

## Candidats évalués (recherche sous-agents, sources officielles)

| Candidat | Install | Mode headless | Multi-LLM local | Verdict |
|---|---|---|---|---|
| **OpenClaw** (ex-Clawdbot → Moltbot) [github.com/openclaw/openclaw] | `npm i -g openclaw` (v2026.9.4) | gateway daemon (port 18789) + `openclaw agent --json` | provider Ollama natif (local + `:cloud` via un seul daemon signé) | **ADOPTÉ** |
| OpenHands (Agent Canvas) [github.com/OpenHands] | `npm i -g @openhands/agent-canvas` ou pip | `openhands --headless -t` + Agent Server REST | LiteLLM requis pour routage | Runner-up |
| crewAI | pip | `crewai run` | litellm | Pas de daemon REST fourni (rejeté : nécessiterait un wrapper maison) |
| LangGraph | lib Python | `langgraph dev` (in-memory, dev-only) | ChatOllama | Prod exige LangSmith (rejeté) |

## Décision

OpenClaw 2026.9.4 installé en prefix dédié `/home/francis-v/.local/share/openclaw-global`, gateway systemd `--user` sur `127.0.0.1:18789` avec `Restart=always`, auth token (`gateway.auth.mode=token`, jeton dans `~/.config/francis/openclaw-gateway.token`, jamais commité).

## Modèles (multi-LLM)

- Primaire : `ollama/gemma4-64k` (local, gratuit)
- Utilitaire : idem
- Fallback : `ollama/kimi-k3:cloud` via le même daemon Ollama signé
- Configuré via `openclaw config set agents.defaults.model.{primary,fallbacks,utilityModel}`

## n8n ↔ OpenClaw

Le gateway OpenClaw ne publie pas d'endpoint OpenAI-compatible sur le port 18789 (SPA catchall ; `/tools/invoke` existe mais les tools `exec/shell/fs_*` y sont deny-listés par défaut). Le bridge retenu : micro-service TypeScript `agent-infra/openclaw-runner` (127.0.0.1:7890) qui enveloppe `openclaw agent --json` en HTTP synchrone, persistant chaque run dans `~/.local/state/openclaw-runner-runs/`. n8n l'appelle via un nœud HTTP Request standard.

## Conséquences

- Positives : zéro coût ; exécution shell/fichier prouvée ; routage modèle par requête (`--model`).
- Négatives : surface HTTP d'OpenClaw non consommée directement (le runner compense) ; tours RAG longs (timeout runner porté à 600 s).

## Sources

- Gateway : https://docs.openclaw.ai/gateway
- Provider Ollama : https://docs.openclaw.ai/providers/ollama
- OpenHands headless (alternative documentée) : https://docs.openhands.dev/openhands/usage/cli/headless.md
- n8n MCP nodes : https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/
