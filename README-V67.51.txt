SBI — Version 67.51 — Login SBI/HANGCHA

- Refonte de la connexion selon le visuel approuvé : formulaire clair à gauche, visuel promotionnel SBI/HANGCHA à droite.
- Typographie et champs agrandis pour améliorer la lisibilité sur PC et mobile.
- Ajout d'icônes d'email et de mot de passe.
- Visuel promotionnel inclus dans assets/login-sbi-hangcha-promo.png.
- Le logo SBI recadré est utilisé dans le formulaire.
- Conservation du fonctionnement existant : authentification Supabase, Remember me, demande de changement de mot de passe à l'administrateur via submit_password_change_request et restrictions de rôle.

Configuration Supabase pour les demandes de changement de mot de passe :
Exécuter une seule fois SUPABASE_PASSWORD_CHANGE_REQUEST_RPC.sql dans Supabase > SQL Editor, si cela n'a pas déjà été fait.
