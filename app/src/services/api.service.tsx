import axios from "axios";
import tokens from "./tokens.service";

const instance = axios.create({
  baseURL: "http://localhost:3010/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 15000,
  retry: 8,
  retryDelay: 1000
});

instance.interceptors.request.use(config => {
  // Ne pas ajouter le header Authorization pour les routes d'authentification
  if (config.url?.includes('/auth/login') || config.url?.includes('/auth/signup')) {
    return config;
  }

  const token = tokens.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  response => {
    // Si la réponse contient un token (login réussi), le sauvegarder
    if (response.data?.token) {
      tokens.setToken(response.data.token);
    }
    return response;
  },
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          console.error("Erreur 400 - Requête incorrecte :");
          console.error("1. Vérifiez les données envoyées :", error.config.data);
          console.error("2. Erreur détaillée :", error.response.data);
          console.error("3. Paramètres manquants ou invalides");
          break;
        case 401:
          console.error("Erreur 401 - Non autorisé");
          console.error("1. Token invalide ou expiré");
          console.error("2. Droits insuffisants");
          
          // Si erreur 401 sur login, c'est probablement des identifiants invalides
          if (error.config.url?.includes('/auth/login')) {
            return Promise.reject({
              ...error,
              userMessage: "Identifiants incorrects"
            });
          }
          
          // Pour les autres routes, c'est probablement un token invalide
          tokens.clearToken();
          break;
        case 404:
          console.error("Erreur 404 - Vérifiez que :");
          console.error("1. La route existe dans le backend");
          console.error(`2. L'URL ${error.config.url} est correcte`);
          break;
        case 500:
          console.error("Erreur serveur - Vérifiez les logs backend");
          break;
        default:
          console.error(`Erreur ${error.response.status}:`, error.message);
      }
    } else if (error.code === "ECONNREFUSED") {
      console.error("Serveur backend injoignable - Vérifiez que :");
      console.error("1. Le serveur est démarré");
      console.error("2. Le port 3010 est libre");
      console.error("3. Aucun firewall ne bloque la connexion");
    } else {
      console.error("Erreur réseau ou configuration :", error.message);
    }
    
    return Promise.reject({
      ...error,
      userMessage: error.response?.data?.message || "Une erreur est survenue"
    });
  }
);

export default instance;