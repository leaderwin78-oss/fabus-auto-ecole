# FABUS — Plateforme SaaS multi-auto-écoles

Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage). Multi-tenant :
chaque auto-école est isolée par Row Level Security, pas seulement par filtre
applicatif.

## Démarrage

### 1. Créer un projet Supabase

Sur [supabase.com](https://supabase.com), créez un projet (gratuit pour
démarrer). Récupérez dans **Project Settings → API** :
- Project URL
- anon public key
- service_role key (secret — ne jamais l'exposer côté client)

### 2. Configurer les variables d'environnement

```
cp .env.local.example .env.local
```

Renseignez les 4 valeurs (URL, anon key, service role key, et
`NEXT_PUBLIC_SITE_URL`, `http://localhost:3000` en local).

### 3. Appliquer le schéma de base de données

Dans le **SQL Editor** de Supabase, exécutez dans l'ordre les fichiers de
`supabase/migrations/` :
1. `0001_schema.sql` — tables
2. `0002_rls.sql` — Row Level Security (isolation multi-tenant + RBAC)
3. `0003_storage.sql` — buckets de fichiers (documents élèves, contenus de cours)

(Ou via la CLI Supabase : `supabase db push` si vous liez le projet.)

### 4. Activer les emails d'invitation

Le flux "Inviter un moniteur / élève / admin d'auto-école" utilise
`supabase.auth.admin.inviteUserByEmail`, qui s'appuie sur le service email
intégré de Supabase (fonctionne par défaut en dev, avec des limites de débit —
configurez un fournisseur SMTP dans **Project Settings → Auth** avant la
mise en production).

### 5. Lancer l'application

```
npm install
npm run dev
```

### 5bis. Alternative : appliquer les migrations sans copier-coller

Si vous avez la chaîne de connexion Postgres directe de votre projet
(`postgresql://postgres:[password]@db.<ref>.supabase.co:5432/postgres`) :

```
$env:SUPABASE_DB_URL = "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
node scripts/run-migrations.mjs
```

### 6. (Optionnel) Charger des données de démonstration

Crée un super admin, deux auto-écoles avec admin/moniteur/élèves, une
formation avec chapitres/leçons, des séances, paiements et notifications —
utile pour vérifier l'isolation entre auto-écoles :

```
npm run seed
```

Tous les comptes créés utilisent le mot de passe `FabusDemo2026!` (affiché
aussi en fin de script). Identifiants créés :
- `superadmin@fabus.sn`
- `admin@teranga.fabus.sn`, `moniteur@teranga.fabus.sn`, `eleve1@teranga.fabus.sn`, `eleve2@teranga.fabus.sn`
- `admin@baobab.fabus.sn`, `moniteur@baobab.fabus.sn`, `eleve1@baobab.fabus.sn`

### 7. Vérifier que tout fonctionne réellement

Avec le serveur de dev lancé (`npm run dev`) et les données de démo chargées :

```
npm run test:smoke
```

Ce script pilote un vrai navigateur (Playwright) : connexion élève/moniteur/
admin/super admin, vérification que chaque rôle atterrit sur son propre
tableau de bord, et surtout **vérification de l'isolation entre auto-écoles**
(l'admin de Teranga ne doit jamais voir les élèves ou moniteurs de Baobab, et
inversement) et qu'un élève ne peut pas accéder à `/admin` en changeant l'URL.

## Architecture

- `app/` — routes Next.js (App Router). Une zone par rôle : `/student`,
  `/instructor`, `/admin`, `/super-admin`, protégées par `middleware.ts` +
  vérification du rôle dans chaque `layout.tsx`.
- `lib/supabase/` — clients Supabase (browser, server, admin/service-role).
- `lib/actions/` — Server Actions (mutations). Chaque action revérifie le rôle
  de l'appelant à partir de sa session, jamais depuis les données du
  formulaire.
- `lib/payments/provider.ts` — abstraction de paiement. Seul `manual` est
  réellement câblé (un admin marque un paiement reçu) ; `wave` et
  `orange_money` renvoient explicitement "non configuré" tant que les clés
  API marchand ne sont pas fournies — voir la section Paiements ci-dessous.
- `supabase/migrations/` — schéma SQL + RLS, source de vérité de la structure
  de données.
- `_legacy-static/` — l'ancienne maquette HTML/CSS statique (conservée pour
  référence de design, non utilisée par l'app).

## État du projet

Voir le message de session pour l'état détaillé (fait / restant). En résumé :
authentification, RBAC, isolation multi-tenant, dashboards des 4 rôles,
formations/leçons/progression, calendrier avec détection de conflits,
paiements (flux manuel réel + abstraction pour Wave/Orange Money),
messagerie et notifications sont fonctionnels de bout en bout sur de vraies
données Postgres. La visioconférence utilise un lien Jitsi généré
automatiquement (aucune clé API requise) en attendant un choix de solution
définitive. Aucune fausse donnée : chaque écran vide affiche un état vide
honnête tant qu'aucune donnée réelle n'existe.
