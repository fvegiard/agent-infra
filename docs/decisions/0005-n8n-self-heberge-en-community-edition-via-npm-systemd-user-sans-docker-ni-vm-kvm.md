# 5. n8n self-heberge en Community Edition via npm + systemd --user, sans Docker ni VM KVM

Date: 2026-09-14

## Status

Accepted

## Context

n8n sert de backbone d'automatisation (webhooks, routage/switch, boucles,
hooks). `docker --version` echoue sur ce poste : Docker n'est pas installe,
et rien dans la mission ne demande de l'installer. Doc officielle
d'installation self-hosted : https://docs.n8n.io/deploy/host-n8n/ (npm :
https://docs.n8n.io/deploy/host-n8n/install-options/install-with-npm/).
Deux recherches paralleles (docs.n8n.io + github.com/n8n-io/n8n) ont
confirme :
- Node requis : 20.19-24.x (le Node par defaut du poste est 26.8.2 → besoin
  d'un Node dedie, sans toucher au `node` global).
- Edition Community = gratuite par defaut, sans cle de licence
  (https://docs.n8n.io/deploy/host-n8n/community-edition-features/) : aucune
  fonctionnalite payante n'est activee par un simple `npm install -g n8n`.
- **L'auth basique (`N8N_BASIC_AUTH_ACTIVE`/`_USER`/`_PASSWORD`) a ete
  SUPPRIMEE depuis n8n 1.0** (pas seulement depreciee) — la consigne initiale
  ("activer l'authentification basique") ne peut plus s'appliquer telle
  quelle. Le mecanisme actuel est la gestion d'utilisateurs integree :
  aucun moyen documente de desactiver l'ecran de connexion
  (https://docs.n8n.io/deploy/host-n8n/configure-n8n/user-management/).
  Provisionnement non interactif possible via `N8N_INSTANCE_OWNER_MANAGED_BY_ENV`
  (n8n >= 2.17.0 ; notre install est en 2.38.7).
- Faisabilite VM KVM verifiee sur demande (`/dev/kvm` present, flag `vmx`
  present → virtualisation materielle disponible) mais **aucun `libvirtd`
  systeme** n'est enregistre et `virsh`/`virt-install`/`multipass` sont
  absents du PATH ; seul GNOME Boxes (snap, `~/snap/gnome-boxes/`) embarque
  son propre libvirt confine, non expose en dehors du snap.

## Decision

1. Installer un Node 22 dedie et garde en *keg-only* via Homebrew
   (`brew install node@22`), sans toucher au `node` par defaut (26.8.2) du
   reste du poste.
2. `npm install -g n8n --prefix ~/.local/n8n-npm-global` avec ce Node 22
   (n8n 2.38.7 installe).
3. Le faire tourner directement sur l'hote via un service `systemctl --user`
   (`n8n/systemd/n8n.service`, linger deja actif pour francis-v — persiste
   sans session ouverte), PAS dans un container/VM : n8n est lie a
   `127.0.0.1:5678` uniquement, l'authentification par compte utilisateur
   integree est obligatoire (pas d'ecran de connexion desactivable), et
   Docker/une VM KVM ne sont pas necessaires pour cette isolation reseau.
   Durcissement `systemd.exec(5)` applique en defense en profondeur
   (`NoNewPrivileges`, `PrivateTmp`, `ProtectHome=read-only` +
   `ReadWritePaths=~/.n8n`) — les options necessitant des capacites
   supplementaires (`ProtectKernelTunables`, `LockPersonality`, etc.)
   echouent sous `systemctl --user` non privilegie (exit 218) et ont ete
   retirees.
4. Provisionner le compte owner de facon non interactive via
   `N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true` + email/prenom/nom + hash bcrypt
   du mot de passe (genere avec le `bcryptjs` deja fourni par n8n — aucune
   nouvelle dependance). Mot de passe genere aleatoirement (24 caracteres),
   stocke uniquement dans `/home/francis-v/.config/francis/n8n-owner-credentials.env`
   (mode 600), jamais affiche ni commite. Cle de chiffrement des identifiants
   (`N8N_ENCRYPTION_KEY`) auto-generee par n8n au premier lancement, copiee
   dans `/home/francis-v/.config/francis/n8n-encryption-key.env` (mode 600).
5. Workflow minimal cree via la CLI officielle (`n8n import:workflow` +
   `n8n publish:workflow`, https://docs.n8n.io/hosting/cli-commands/), pas
   via un appel API ecrit a la main : Webhook (POST /webhook/smoke-test) →
   Respond to Webhook (JSON). Verifie par une vraie requete `curl` -> 200,
   corps echo renvoye.

## Consequences

n8n Community Edition tourne en local, persiste au redemarrage (systemd
`--user` + linger), n'est joignable que depuis la boucle locale
(`ss -ltnp` confirme `127.0.0.1:5678`, pas `0.0.0.0`), et son compte owner
est protege par un mot de passe fort jamais expose. Limite documentee
assumee : n8n via npm est qualifie par la doc officielle de "pas sur pour
la production" (recommandation = Docker) — accepte ici car l'instance reste
strictement locale, mono-utilisateur, et le systemd unit applique un
durcissement complementaire. Pas de VM KVM utilisee : reevaluer si
l'automatisation s'ouvre un jour a des workflows executant du code non
fiable venant de tiers (le sandboxing systemd actuel ne remplace pas une
isolation VM complete).
