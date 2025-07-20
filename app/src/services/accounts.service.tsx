import { Position } from "../App";
import api from "./api.service";
import tokens from "./tokens.service";


interface TransactionResponse {
  success: boolean;
  message: string;
  newCash?: number;
  transactionDetails?: {
    symbol: string;
    quantity: number;
    price: number;
    totalCost: number;
  };
}

interface AddFundsResponse {
  success: boolean;
  newBalance: number;
  message: string;
  newCash: number;
}

async function signup(username: string, password: string, turnstileToken: string): Promise<void> {
  try {
    await api.post("/auth/signup", { username, password, turnstileToken });
  } catch (error: any) {
    console.error("Signup failed:", error);
    throw new Error(error.response?.data?.message || "Signup failed");
  }
}

// async function login(username: string, password: string): Promise<void> {
//   try {
//     console.log("Tentative de login avec:", { username });
    
//     const response = await api.post("/auth/login", { 
//       username, 
//       password 
//     });

//     console.log("Réponse du serveur:", response.data);

//     if (!response.data?.token) {
//       throw new Error("No token received");
//     }

//     // Stockez le username depuis la réponse serveur si disponible, sinon depuis l'input
//     const authenticatedUsername = response.data.username || username;
//     tokens.setTokenAndUsername(response.data.token, authenticatedUsername);

//   } catch (error: any) {
//     console.error("Erreur complète:", {
//       request: error.config?.data,
//       response: error.response?.data,
//       status: error.response?.status
//     });
//     throw new Error(error.response?.data?.message || "Login failed");
//   }
// }


// Dans accounts.ts
async function login(username: string, password: string): Promise<string> {
  try {
    console.log("Tentative de login avec:", { username });
    
    const response = await api.post("/auth/login", { 
      username, 
      password 
    });

    console.log("Réponse du serveur:", response.data);

    if (!response.data?.token) {
      throw new Error("No token received");
    }

    // Stockez le token et username
    const authenticatedUsername = response.data.username || username;
    tokens.setTokenAndUsername(response.data.token, authenticatedUsername);
    
    // ✅ Retourner "success" pour le composant Login
    return "Connexion réussi";

  } catch (error: any) {
    console.error("Erreur complète:", {
      request: error.config?.data,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.response?.data?.message || "Connexion incomplète");
  }
}



export async function makeTransaction(
  symbol: string,
  quantity: number,
  transactionType: "buy" | "sell"
): Promise<TransactionResponse> {
  // Validation des paramètres
  if (!symbol || typeof symbol !== 'string') {
    throw new Error("Symbole d'action invalide");
  }

  if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error("La quantité doit être un nombre entier positif");
  }

  if (transactionType !== "buy" && transactionType !== "sell") {
    throw new Error("Le type de transaction doit être 'buy' ou 'sell'");
  }

  const token = tokens.getToken();
  if (!token) {
    throw new Error("Authentification requise - Veuillez vous connecter");
  }

  try {
    // Construction de la requête
    //const endpoint = `/stocks/${symbol}/${transactionType}`;
    const endpoint = `/stocks/${symbol}/${transactionType}`;
    const payload = { quantity };

    console.log("Envoi transaction:", {
      endpoint,
      payload,
      timestamp: new Date().toISOString()
    });

    const response = await api.post(endpoint, payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Validation de la réponse
    if (!response.data) {
      throw new Error("Réponse invalide du serveur");
    }

    console.log("Réponse transaction reçue:", response.data);

    return {
      success: true,
      newCash: response.data.newCash,
      message: response.data.message || "Transaction réussie",
      transactionDetails: {
        symbol: response.data.symbol || symbol,
        quantity: response.data.quantity || quantity,
        price: response.data.price || 0,
        totalCost: response.data.totalCost || 0
      }
    };
    
  } catch (error: any) {
    console.error("Erreur de transaction:", {
      error: error.response?.data || error.message,
      config: error.config
    });

    // Gestion des erreurs spécifiques
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error("Endpoint de transaction introuvable - Contactez le support");
      }
      if (error.response.status === 401) {
        tokens.clearToken();
        throw new Error("Session expirée - Veuillez vous reconnecter");
      }
      if (error.response.status === 400) {
        throw new Error(error.response.data.message || "Requête invalide");
      }
    }

    throw new Error(error.response?.data?.message || 
                   error.message || 
                   "Échec de la transaction - Veuillez réessayer");
  }
}




export async function addFunds(amount: number): Promise<AddFundsResponse> {
  try {
    if (amount <= 0 || amount > 10000) {
      throw new Error("Amount must be between $1 and $10,000");
    }

    const response = await api.post("/account/add-funds", { amount });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "Failed to add funds";
    console.error("Add funds failed:", errorMessage);
    throw new Error(errorMessage);
  }
}

async function getPositions(): Promise<Position[]> {
  try {
    const response = await api.get("/user/holdings");
    return response.data.positions || [];
  } catch (error: any) {
    console.error("Failed to get positions:", error.message);
    return [];
  }
}

async function getWatchlist(username: string | null, raw = false): Promise<any[]> {

   if (typeof username !== 'string' || !username.trim()) {
    console.error("Invalid username format:", username);
    throw new Error("Valid username is required");
  }

  try {
    //console.log(`Fetching watchlist for ${username}, raw mode: ${raw}`);
    
    const response = await api.get(`/user/watchlist/${username}`, { 
      params: { raw } 
    });
    
    const watchlist = response.data?.watchlist || [];
    
    if (raw) return watchlist;

    const results = await Promise.allSettled(
      watchlist.map(async (item: string | {symbol: string}) => {
        const symbol = typeof item === 'string' ? item : item?.symbol;
        if (!symbol) return null;
        
        try {
          return await getStockData(symbol);
        } catch {
          return null;
        }
      })
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<any>).value);
  } catch (error: any) {
    console.error("Watchlist error:", error.message);
    return []; // Retourne un tableau vide en cas d'erreur
  }
}

async function editWatchlist(username: string | null, symbol: string, operation: "add" | "remove"): Promise<string> {
  if (!username || typeof username !== 'string') {
    console.error('Invalid username:', username);
    throw new Error('Invalid username');
  }

  if (!symbol || typeof symbol !== 'string') {
    console.error('Invalid symbol:', symbol);
    throw new Error('Invalid stock symbol');
  }

  try {
    console.log(`Modifying watchlist for ${username}, operation: ${operation} ${symbol}`);
    
    const endpoint = `/user/watchlist/${username}/${operation}/${symbol}`;
    const response = await api.post(endpoint);
    return response.data?.message || 'Operation successful';
  } catch (error: any) {
    console.error("Watchlist update failed:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Watchlist update failed");
  }
}


async function getPortfolio(): Promise<{
  portfolioValue: number;
  portfolioPrevCloseValue: number;
  positions: Position[];
  cash: number;
}> {
  try {
    // 1. Récupération propre du token sans caractères parasites
    const token = (localStorage.getItem('token') || '').trim();
    
    // 2. Construction de la requête avec URL propre
    const response = await api.get("/user/portfolio".trim(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // 3. Debug amélioré
    console.log("Requête envoyée à:", response.config.url);
    console.log("Statut de la réponse:", response.status);
    console.log("Données reçues:", response.data);

    // Normalisation des positions (inchangée)
    const normalizedPositions = response.data.positions?.map((pos: any) => ({
      symbol: pos.symbol || pos.stockSymbol || "",
      quantity: pos.quantity || pos.shares || 0,
      purchasePrice: pos.purchasePrice || pos.averagePrice || 0,
      purchaseDate: pos.purchaseDate || new Date().toISOString(),
      regularMarketPrice: pos.currentPrice || pos.marketPrice || 0,
      regularMarketChangePercent: pos.changePercent || 0
    })) || [];

    return {
      portfolioValue: response.data.portfolioValue || 0,
      portfolioPrevCloseValue: response.data.portfolioPrevCloseValue || 0,
      positions: normalizedPositions,
      cash: response.data.cash || response.data.balance || 0
    };
  } catch (error) {
    // Debug amélioré des erreurs
    console.error("Détails de l'erreur:", {
      message: error.message,
      config: error.config,
      response: error.response?.data
    });
    
    return {
    portfolioValue: response.data.portfolioValue || 
      (response.data.cash || 0) + 
      (response.data.positions?.reduce((sum: number, pos: any) => 
        sum + ((pos.currentPrice || pos.regularMarketPrice || 0) * (pos.quantity || 0)), 0) || 0),
    portfolioPrevCloseValue: response.data.portfolioPrevCloseValue || 0,
    positions: normalizedPositions,
    cash: response.data.cash || response.data.balance || 0
  };
  }
}



async function getStockData(symbol: string): Promise<{
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  longName?: string;
}> {
  if (!symbol || typeof symbol !== 'string') {
    console.error('Invalid stock symbol:', symbol);
    return {
      symbol,
      regularMarketPrice: 0,
      regularMarketChangePercent: 0,
      longName: symbol
    };
  }

  try {
    const response = await api.get(`/stock/${symbol}`);
    
    return {
      symbol: response.data?.symbol || symbol,
      regularMarketPrice: parseFloat(response.data?.price) || 0,
      regularMarketChangePercent: parseFloat(response.data?.changePercent) || 0,
      longName: response.data?.longName
    };
  } catch (error: any) {
    console.error(`Failed to fetch stock data for ${symbol}:`, error.message);
    return {
      symbol,
      regularMarketPrice: 0,
      regularMarketChangePercent: 0,
      longName: symbol
    };
  }

}

// export const getBuyingPower = async (): Promise<number> => {
//   try {
//     const token = tokens.getToken();
//     if (!token) throw new Error("Authentication required");

//     const response = await api.get('/user/cash', {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     // Meilleure extraction du cash avec fallbacks
//     const cash = response.data?.cash ?? response.data?.balance ?? 0;
    
//     if (typeof cash !== 'number') {
//       throw new Error("Invalid cash format from server");
//     }

//     return cash;
//   } catch (error: any) {
//     console.error("BuyingPower Error:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: error.message
//     });
    
//     console.error("Erreur critique: Impossible de récupérer le buying power", error);
//     return 0;
//   }
// };


// Modifier la fonction getBuyingPower pour utiliser 'balance'
export const getBuyingPower = async (): Promise<number> => {
  try {
    const token = tokens.getToken();
    if (!token) throw new Error("Authentication required");

    const response = await api.get('/account/balance', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Utilisez explicitement cash qui vient du backend
    const cash = response.data?.cash ?? 0;
    
    if (typeof cash !== 'number') {
      throw new Error("Invalid cash format from server");
    }

    return cash;
  } catch (error: any) {
    console.error("BuyingPower Error:", error);
    return 0;
  }
};

// async function getAvailableShares(symbol: string): Promise<number> {
//   try {
//     const response = await api.get("/user/portfolio"); // Changé pour utiliser la bonne route
//     const positions = response.data?.positions || [];
    
//     // Debug
//     console.log("Positions disponibles:", positions);
    
//     return positions
//       .filter((pos: Position) => pos.symbol === symbol)
//       .reduce((sum: number, pos: Position) => sum + pos.quantity, 0);
      
//   } catch (error: any) {
//     console.error("Erreur getAvailableShares:", {
//       error: error.message,
//       response: error.response?.data
//     });
//     return 0;
//   }
// }


async function getAvailableShares(symbol: string): Promise<number> {
  try {
    const response = await api.get("/user/portfolio");
    const positions = response.data?.positions || [];
    
    const position = positions.find((pos: any) => pos.symbol === symbol);
    return position ? position.quantity : 0;
      
  } catch (error: any) {
    console.error("Erreur getAvailableShares:", error);
    return 0;
  }
}


export default {
  getBuyingPower,
  makeTransaction,
  addFunds,
  getPositions,
  getWatchlist,
  editWatchlist,
  getPortfolio,
  getAvailableShares,
  signup,
  login,
  getStockData,
};