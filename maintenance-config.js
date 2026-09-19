/* SBI — Mode maintenance
   Passez enabled à true pour rediriger automatiquement les utilisateurs
   vers maintenance.html. Les administrateurs peuvent toujours accéder au site
   après authentification depuis la page de maintenance.
*/
window.SBI_MAINTENANCE = {
  enabled: false,
  title: "Site en maintenance",
  message: "Notre site est momentanément indisponible pendant une opération de maintenance.",
  expectedReturn: ""
};
