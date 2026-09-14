# ADR-002 : Tunnel Cloudflare éphémère (quick tunnel) pour le webhook public n8n

**Date** : 2026-09-14
**Statut** : Accepté

## Contexte

Exposer le webhook n8n (127.0.0.1:5678) publiquement. `~/.config/francis/cloudflare.env` ne contient que `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` / `CF_AIG_TOKEN` — aucun jeton de tunnel nommé (Argo) ni zone DNS configurée pour ce poste.

## Décision

Quick tunnel trycloudflare via unité systemd `--user` `n8n-cloudflared.service` (`Restart=always`, `RestartSec=5`), URL publique actuelle : `https://ranges-shift-deemed-trained.trycloudflare.com`. L'URL est **éphémère** : elle change à chaque redémarrage du tunnel ; extraire l'URL courante avec :

```sh
journalctl --user -u n8n-cloudflared --no-pager | grep -oE 'https://[a-z-]+\.trycloudflare\.com' | tail -1
```

## Sécurité

- n8n exige déjà login ; le workflow `DC Autonomous Worker Gateway` ajoute un contrôle d'en-tête `X-DC-Key` (`Reject` 401 sinon). Valeur dans `~/.config/francis/dc-webhook-key.env` (mode 600, non commitée).
- Le gateway OpenClaw reste en loopback (jamais exposé).

## Alternative documentée (future)

Tunnel nommé Cloudflare (URL stable) si une zone est rattachée : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

## Conséquences

- Coût nul ; aucun compte requis ; pas de SLA (acceptable pour usage personnel).
- Scripts consommateurs doivent résoudre l'URL au moment de l'appel, jamais la cacher en dur.
