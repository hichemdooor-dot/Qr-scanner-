SBI — Demande de changement de mot de passe

Le bouton « Mot de passe oublié ? » de la page de connexion ne fait PAS de réinitialisation automatique.
Il crée une demande qui apparaît dans :
Gestion utilisateurs → Demandes de changement de mot de passe

INSTALLATION SUPABASE (une seule fois)
1. Ouvrir Supabase → SQL Editor.
2. Exécuter : SUPABASE_PASSWORD_CHANGE_REQUEST_RPC.sql
3. Recharger le site.

Le site utilise ensuite la fonction RPC sécurisée « submit_password_change_request ».
Aucun accès anonyme direct en écriture à la table maintenance n'est nécessaire.

Mise à jour visuelle v67.51 : le formulaire de connexion utilise maintenant une typographie plus grande et un visuel promotionnel SBI/HANGCHA dans le panneau droit. Les fonctions de connexion et de demande à l'administrateur sont conservées.
