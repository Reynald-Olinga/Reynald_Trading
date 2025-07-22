import mongoose, { Document } from "mongoose";
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import yahooFinance from "yahoo-finance2";
import axios from "axios";
import alphaVantage from 'alphavantage';
import NodeCache from 'node-cache';
import winston from 'winston';
import { ErrorRequestHandler } from 'express';
import { AccountController } from './controller/account.controller';
import TransactionModel from "./models/transaction.model";
import PositionModel from "./models/position.model";       
import UserModel from './models/user.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import routes from './routes';
//import { ChatServer } from './websocket/chatServer';
import MarketEvent from './models/marketEvent.model';
import { StockPriceService } from './services/stockPrice.service';
import { MarketDataServer } from './websocket/marketDataServer';
import MarketSimulator from './services/marketSimulator.service';
import eventsRouter from './routes/event.route';
import { computeTargetPrice } from './utils/eventCalculator';
import { Server } from 'socket.io';


const { log } = require("mercedlogger");

dotenv.config();

// Configuration Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// 📦 Fonction fetchFinnhubNews (ajoutée manquante)
async function fetchFinnhubNews() {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/news`, {
      params: { token: process.env.STOTRA_FINNHUB_API }
    });
    return response.data;
  } catch (error) {
    throw new Error(`News fetch failed: ${(error as Error).message}`);
  }
}

// ✅ Configuration corrigée
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Après dotenv.config()
const requiredEnvVars = ['STOTRA_ALPHAVANTAGE_API', 'STOTRA_FINNHUB_API', 'STOTRA_MONGODB_USERNAME', 'STOTRA_MONGODB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Active le mode debug de Mongoose
mongoose.set('debug', true);

// Supprimer le message d'enquête Yahoo
yahooFinance.suppressNotices(['yahooSurvey']);



if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}


/////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////


// Configuration des APIs externes
const API_CONFIG = {
  yahooFinance: {
    enabled: true,
    timeout: 10000,
    retries: 3
  },
  alphaVantage: {
    enabled: true,
    apiKey: process.env.STOTRA_ALPHAVANTAGE_API ?? 'valeur_par_defaut',
    endpoint: 'https://www.alphavantage.co/query'
  },
  finnhub: {
    enabled: true,
    apiKey: process.env.STOTRA_FINNHUB_API,
    endpoint: 'https://finnhub.io/api/v1',
    timeout: 8000
  }
};

// Cache pour les données boursières
const stockCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60 
});

// Fonction pour récupérer les données depuis Yahoo Finance
async function fetchFromYahoo(symbol: string) {
  try {
    const data = await yahooFinance.quote(symbol, {}, {
    fetchOptions: { timeout: API_CONFIG.yahooFinance.timeout }
});

    return {
      symbol,
      price: data.regularMarketPrice,
      changePercent: data.regularMarketChangePercent,
      source: 'Yahoo Finance'
    };
  } catch (error) {
    throw new Error(`Yahoo: ${(error as Error).message}`);
  }
}

// Fonction pour récupérer depuis Alpha Vantage
async function fetchFromAlphaVantage(symbol: string) {
  try {
    const response = await axios.get(`${API_CONFIG.alphaVantage.endpoint}`, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apiKey: process.env.STOTRA_ALPHAVANTAGE_API
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    return {
      symbol,
      price: parseFloat(quote['05. price']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      source: 'Alpha Vantage'
    };
  } catch (error) {
    throw new Error(`AlphaVantage: ${(error as Error).message}`);
  }
}

// Fonction pour récupérer depuis Finnhub
async function fetchFromFinnhub(symbol: string) {
  try {
    const response = await axios.get(`${API_CONFIG.finnhub.endpoint}/quote`, {
      params: {
        symbol,
        token: API_CONFIG.finnhub.apiKey
      },
      timeout: 8000
    });

    return {
      symbol,
      price: response.data.c,
      changePercent: response.data.dp,
      source: 'Finnhub'
    };
  } catch (error) {
    throw new Error(`Finnhub: ${(error as Error).message}`);
  }
}

// Fonction principale unifiée
export async function getStockData(symbol: string): Promise<{
  symbol: string;
  price: number;
  changePercent: number;
  source: string;
  error?: string;
}> {
  const cacheKey = `stock-${symbol}`;
  const cached = stockCache.get(cacheKey) as { symbol: string; price: number; changePercent: number; source: string; error?: string } | undefined;
  if (cached) return cached;

  // Ordre de priorité des sources
  const sources = [
    { name: 'Yahoo', fetch: fetchFromYahoo, enabled: API_CONFIG.yahooFinance.enabled },
    { name: 'AlphaVantage', fetch: fetchFromAlphaVantage, enabled: API_CONFIG.alphaVantage.enabled },
    { name: 'Finnhub', fetch: fetchFromFinnhub, enabled: API_CONFIG.finnhub.enabled }
  ];

  for (const source of sources.filter(s => s.enabled)) {
    try {
      const data = await source.fetch(symbol);
      stockCache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.warn(`Failed with ${source.name}: ${(error as Error).message}`);
      continue;
    }
  }

  // Fallback si tout échoue
  return {
    symbol,
    price: 0,
    changePercent: 0,
    source: 'Fallback',
    error: 'All data sources failed'
  };
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////


// Configuration Alpha Vantage
const alphaVantageClient = alphaVantage({ 
  key: process.env.STOTRA_ALPHAVANTAGE_API!
});

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || '1fc16af6a2ac97783c59cde5be5ce67ba2be6f8e4a1482eef54fdd763c94e00d';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';


// Fonctions de service pour les comptes
const AccountService = {
  async addFunds(username: string, amount: number): Promise<number> {
    // Validation du montant
    if (amount <= 0 || amount > 1000000000000) {
      throw new Error("Le montant doit être entre 1$ et 10,000$");
    }

    // Recherche de l'utilisateur par username
    const user = await UserModel.findOne({ username }); // Changé de UserSchema à UserModel
    if (!user) throw new Error("Utilisateur non trouvé");

    // Mise à jour du solde
    user.balance += amount;
    await user.save();

    logger.info(`Fonds ajoutés - Utilisateur: ${username}, Montant: $${amount}`);
    return user.balance;
  },

  async getBalance(username: string): Promise<number> {
    const user = await User.findOne({ username }); // Changé de UserSchema à UserModel
    if (!user) throw new Error("Utilisateur non trouvé");
    return user.balance;
  }
};

// Config/initialization
const app = express();

const PORT = process.env.PORT || 8080;


// Docs
const { swaggerDocs } = require("./utils/swagger");


// =======================================================================
// 🔗 CONNEXION MONGODB 
// =======================================================================

const constructMongoURI = () => {
  const username = encodeURIComponent(process.env.STOTRA_MONGODB_USERNAME || '');
  const password = encodeURIComponent(process.env.STOTRA_MONGODB_PASSWORD || '');
  const cluster = process.env.STOTRA_MONGODB_CLUSTER || '';
  return `mongodb+srv://${username}:${password}@${cluster}`;
};

const MONGODB_URI = constructMongoURI();

async function connectMongo(retries = Infinity, delay = 5000): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    console.log('🟢 Connecté avec succès à MongoDB Atlas');
    console.log(`📊 Base de données : ${mongoose.connection.db?.databaseName || 'N/A'}`);
  } catch (err) {
    logger.error('[Mongo] Échec connexion – nouvelle tentative dans ' + delay + 'ms', {
      message: (err as Error).message,
    });
    if (retries === 0) {
      // Dernier recours : on laisse le driver se débrouiller ou on redémarre
      logger.error('[Mongo] Trop de tentatives – abandon');
      // process.exit(1);  ← on supprime cette ligne
    } else {
      // Retry
      setTimeout(() => connectMongo(retries === Infinity ? Infinity : retries - 1, delay), delay);
    }
  }
}

// Lancement de la connexion (sans bloquer le serveur)
connectMongo();

// Gestion des événements post-connexion
mongoose.connection.on('error', (err) => {
  logger.error('[Mongo] Erreur réseau détectée', { message: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('[Mongo] Connexion perdue – reconnexion auto…');
});

mongoose.connection.on('reconnected', () => {
  logger.info('[Mongo] Reconnexion réussie');
});

// Fermeture propre sur SIGINT
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('[Mongo] Connexion fermée proprement (SIGINT)');
  } catch (err) {
    logger.error('[Mongo] Erreur lors de la fermeture', err);
  } finally {
    process.exit(0);
  }
});


// Middleware
app.use(cors({
  origin: ['https://tradingrey.netlify.app', 'https://react-frontend-production-eae6.up.railway.app']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));
app.use(morgan("tiny"));
app.use(express.json());

// Ratelimiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 15,
  message: "Too many login attempts from this IP, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});

const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many accounts created from this IP, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});


//Route pour les évènement essai avec l'import étant donné que avec la route directe ca a refusé 
app.use('/api/events', eventsRouter);

// Apply rate limiting
app.use("/api/", apiLimiter);
app.use("/api/auth/signup", createAccountLimiter);
app.use("/api/auth/login", loginLimiter);

// Auth Routes

app.post("/api/auth/signup", async (req: Request, res: Response) => {
  console.log("=== TENTATIVE D'INSCRIPTION ===");
  console.log("Données reçues:", JSON.stringify(req.body, null, 2));

  try {
    const { username, password } = req.body;

    // Validation des champs
    if (!username?.trim() || !password) {
      console.log("Erreur: Champs manquants ou vides");
      return res.status(400).json({ 
        success: false,
        error: "Nom d'utilisateur et mot de passe requis" 
      });
    }

    // Vérification de l'existence de l'utilisateur
    const existingUser = await UserModel.findOne({ username: username.trim() }).lean();
    console.log("Vérification de l'utilisateur existant:", existingUser ? "Existe déjà" : "Nouveau");

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: "Ce nom d'utilisateur est déjà pris" 
      });
    }

    // Création du nouvel utilisateur (sans hachage)
    const newUser = new UserModel({
      username: username.trim(),
      password: password, // Mot de passe en clair
      cash: 0,
      balance: 0,
      createdAt: new Date()
    });

    // Validation Mongoose
    const validationError = newUser.validateSync();
    if (validationError) {
      console.error("Erreur de validation:", validationError.errors);
      throw validationError;
    }

    // Sauvegarde dans MongoDB
    await newUser.save();
    console.log("Utilisateur enregistré avec succès - ID:", newUser._id);

    // Réponse réussie
    res.status(201).json({ 
      success: true,
      userId: newUser._id,
      username: newUser.username
    });

  } catch (error) {
    console.error("ERREUR D'INSCRIPTION:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      code: (error as any).code,
      keyValue: (error as any).keyValue
    });
    
    res.status(500).json({ 
      success: false,
      error: (error as any).code === 11000 
        ? "Ce nom d'utilisateur existe déjà" 
        : "Erreur serveur lors de l'inscription"
    });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  console.log("=== TENTATIVE DE CONNEXION ===");
  console.log("Données reçues:", JSON.stringify(req.body, null, 2));
  
  try {
    const { username, password } = req.body;
    
    // Validation des champs
    if (!username?.trim() || !password) {
      console.log("Erreur: Champs manquants ou vides");
      return res.status(400).json({ 
        success: false,
        message: "Nom d'utilisateur et mot de passe requis" 
      });
    }

    // Recherche de l'utilisateur
    const user = await UserModel.findOne({ username: username.trim() });
    console.log("Utilisateur trouvé:", user ? "Oui" : "Non");

    if (!user) {
      console.log("Échec: Utilisateur non trouvé");
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides"
      });
    }

    // Comparaison directe des mots de passe (sans bcrypt)
    console.log("Comparaison du mot de passe...");
    const isMatch = password === user.password;
    console.log("Résultat de la comparaison:", isMatch);

    if (!isMatch) {
      console.log("Échec: Mot de passe incorrect");
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides"
      });
    }

    // Génération du token JWT
    const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
  );

    console.log("Connexion réussie pour:", user.username);
    
    // Réponse réussie
    res.json({
      success: true,
      token,
      userId: user._id,
      username: user.username
    });

  } catch (error) {
    console.error("ERREUR SERVEUR:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la connexion",
    });
  };
});


// account routes 
app.post("/api/account/add-funds", apiLimiter, async (req: Request, res: Response) => {
  try {
    const { username, amount } = req.body;
    
    if (!username || !amount) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
    }

    // Modification clé : Ajout au cash au lieu de balance
    user.cash += amountNum;
    
    // Mise à jour optionnelle de la balance si nécessaire
    // user.balance = user.cash + calculatePortfolioValue(user.positions);
    
    await user.save();

    logger.info(`Fonds ajoutés à ${username}: +$${amountNum}`);
    res.json({ 
      success: true,
      newCash: user.cash,  // Renommage pour cohérence
      newBalance: user.balance, // Optionnel
      message: "Fonds ajoutés avec succès"
    });

  } catch (error) {
    logger.error("Erreur addFunds:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/account/balance/:username", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json({ 
      success: true,
      balance: user.balance 
    });

  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Routes pour les données utilisateur
app.get("/api/user/holdings", async (req: Request, res: Response) => {
  try {
    const holdingsData = [
      { symbol: 'AAPL', quantity: 10, avgPrice: 150 },
      { symbol: 'MSFT', quantity: 5, avgPrice: 250 }
    ];
    res.json(holdingsData);
  } catch (error) {
    res.status(500).json({ 
      error: "Error fetching holdings",
      details: (error as Error).message
    });
  }
});

app.get("/api/user/buying-power", async (req: Request, res: Response) => {
  try {
    res.json({ buyingPower: 10000 });
  } catch (error) {
    res.status(500).json({ 
      error: "Error fetching buying power",
      details: (error as Error).message
    });
  }
});

// Route pour obtenir les données boursières

app.get('/api/stock/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const data = await getStockData(symbol.toUpperCase());

    if (data.error) {
      logger.error(`All sources failed for ${symbol}`);
      return res.status(502).json({
        success: false,
        error: data.error,
        sourcesTried: ['Yahoo', 'AlphaVantage', 'Finnhub'].filter(source => 
          API_CONFIG[source.toLowerCase() as keyof typeof API_CONFIG]?.enabled
        )
      });
    }

    res.json({
      success: true,
      symbol: data.symbol,
      price: data.price,
      changePercent: data.changePercent,
      source: data.source,
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error(`Stock data error: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock data',
      details: (error as Error).message
    });
  }
});


// Route pour le portfolio
app.get("/api/user/portfolio", async (req: Request, res: Response) => {
  try {
    // 1. Authentification
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Token manquant" });

    // 2. Décodage du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // 3. Récupération SYNCHRONISÉE des données
    const [user, positions, transactions] = await Promise.all([
      UserModel.findById(userId),
      PositionModel.find({ userId }),
      TransactionModel.find({ userId, symbol: { $exists: true } })
    ]);

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    // 4. Calcul des positions NETTES (achats - ventes)
    const netPositions = positions.map(pos => {
      const totalSold = transactions
        .filter(t => t.symbol === (pos as IPosition).symbol && t.type === 'sell')
        .reduce((sum, t) => sum + t.quantity, 0);

      return {
        ...pos.toObject(),
        netQuantity: (pos as IPosition).quantity - totalSold,
        isSoldOut: ((pos as IPosition).quantity - totalSold) <= 0
      };
    });

    // 5. Filtrage des positions actives
    const activePositions = netPositions.filter(p => p.netQuantity > 0);

    // 6. Réponse
    res.json({
      success: true,
      cash: user.cash,
     positions: activePositions.map(p => ({
      symbol: (p as IPosition).symbol,
      quantity: p.netQuantity,
      purchasePrice: (p as IPosition).purchasePrice,
      purchaseDate: (p as IPosition).purchaseDate
    })),
      lastUpdated: new Date(),
    });

  } catch (error) {
    console.error("Erreur portfolio:", error);
    res.status(500).json({ 
      error: "Erreur serveur",
      details: (error as Error).message
    });
  }
});


// Route pour obtenir le solde
app.get("/api/account/balance", async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: "Token manquant" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await UserModel.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        res.json({ 
            success: true,
            balance: user.balance, // ou user.cash selon ce que vous utilisez
            cash: user.cash
        });

    } catch (error) {
        console.error("Erreur balance route:", error);
        res.status(500).json({ 
            error: "Erreur serveur",
            details: (error as Error).message
        });
    }
});


// Route pour les actualités (corrigée)
app.get("/api/news", async (req: Request, res: Response) => {
  try {
    const news = await fetchFinnhubNews();
    res.json(news);
  } catch (error) {
    logger.error('News fetch error:', error);
    res.status(500).json({
      error: "Failed to fetch news",
      details: (error as Error).message
    });
  }
});


const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(500).json({
    message: err instanceof Error ? err.message : 'Unknown error'
  });
};
app.use(errorHandler);



// Route pour acheter des actions

// 1. Ajoutez ce middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// 2. Modifiez vos routes pour qu'elles correspondent à l'URL appelée
app.post("/api/stocks/:symbol/buy", async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { symbol } = req.params;
    const { quantity } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      await session.abortTransaction();
      return res.status(401).json({ error: "Token manquant" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userId = decoded.userId;

    // Récupération des données
    const [stockData, user] = await Promise.all([
      getStockData(symbol),
      UserModel.findById(userId).session(session)
    ]);

    // Vérifications
    if (!user) throw new Error("Utilisateur non trouvé");
    if (!stockData?.price) throw new Error("Prix non disponible");

    const totalCost = stockData.price * quantity;
    if (user.cash < totalCost) {
      throw new Error(`Fonds insuffisants. Nécessaire: $${totalCost}, Disponible: $${user.cash}`);
    }

    // Mise à jour atomique
    user.cash -= totalCost;
    
    const position = await PositionModel.findOneAndUpdate(
      { userId, symbol },
      { 
        $inc: { quantity },
        $setOnInsert: { 
          purchasePrice: stockData.price,  
          purchaseDate: new Date()   
    }
      },
      { upsert: true, new: true, session }
    );

    const transaction = new TransactionModel({
      userId,
      symbol,
      quantity,
      price: stockData.price,
      type: 'buy'
    });

    await Promise.all([
      user.save({ session }),
      transaction.save({ session })
    ]);

    await session.commitTransaction();
    
    res.json({
      success: true,
      newCash: user.cash,
      position: {
        symbol,
        quantity: (position as IPosition).quantity,
        purchasePrice: (position as IPosition).purchasePrice,
        purchaseDate: (position as IPosition).purchaseDate
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erreur achat:", error);
    res.status(500).json({ 
      error: "Échec de l'achat",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message: undefined
    });
  } finally {
    session.endSession();
  }
});

// Route pour vendre des actions

// Route pour vendre des actions - VERSION FINALE SANS TRANSACTIONS
app.post("/api/stocks/:symbol/sell", async (req: Request, res: Response) => {
  console.log("=== VENTE - NOUVELLE ROUTE ===");
  
  try {
    const { symbol } = req.params;
    const { quantity } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // 1. Validation authentification
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Token manquant" 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userId = decoded.userId;

    // 2. Validation quantité
    const sellQuantity = parseInt(quantity);
    if (!sellQuantity || sellQuantity <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Quantité invalide" 
      });
    }

    // 3. Vérifier position existante
    const position = await PositionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      symbol: symbol.toUpperCase()
    });

    if (!position) {
      return res.status(400).json({ 
        success: false,
        error: "Aucune position trouvée",
        details: `Vous ne possédez pas ${symbol}`
      });
    }

    if ((position as IPosition).quantity < sellQuantity) {
      return res.status(400).json({ 
        success: false,
        error: "Quantité insuffisante",
        details: {
          possédé: (position as IPosition).quantity,
          demandé: sellQuantity,
        }
      });
    }

    // 4. Récupérer prix actuel
    const stockData = await getStockData(symbol);
    if (!stockData?.price) {
      return res.status(400).json({ 
        success: false,
        error: "Prix non disponible" 
      });
    }

    const price = stockData.price;
    const totalValue = price * sellQuantity;

    // 5. Mise à jour séquentielle sécurisée
    let remainingShares;
    let positionUpdateResult;

    if (position.quantity === sellQuantity) {
      // Supprimer complètement la position
      await PositionModel.deleteOne({ _id: position._id });
      remainingShares = 0;
      console.log(`Position ${symbol} supprimée complètement`);
    } else {
      // Décrémenter la quantité
      positionUpdateResult = await PositionModel.findOneAndUpdate(
        { _id: position._id },
        { $inc: { quantity: -sellQuantity } },
        { new: true }
      );
      remainingShares = (positionUpdateResult as IPosition)?.quantity || 0;
      console.log(`Position ${symbol} mise à jour: ${remainingShares} restantes`);
    }

    // 6. Mettre à jour le cash utilisateur
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { cash: totalValue } },
      { new: true }
    );

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // 7. Créer transaction de vente
    const transaction = new TransactionModel({
      userId,
      symbol: symbol.toUpperCase(),
      quantity: sellQuantity,
      price,
      type: 'sell',
      date: new Date()
    });
    
    await transaction.save();
    console.log(`Transaction de vente créée: ${sellQuantity} ${symbol} @ $${price}`);

    // 8. Réponse finale
    res.json({
      success: true,
      newCash: user.cash,
      remainingShares: remainingShares,
      soldQuantity: sellQuantity,
      price: price,
      totalValue: totalValue,
      message: `Vente de ${sellQuantity} ${symbol} effectuée @ $${price} = $${totalValue.toFixed(2)}`
    });

  } catch (error) {
    console.error("Erreur vente:", {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la vente",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Route pour vérifier l'état des APIs
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    apis: {
      yahoo: API_CONFIG.yahooFinance.enabled,
      alphaVantage: API_CONFIG.alphaVantage.enabled,
      finnhub: API_CONFIG.finnhub.enabled
    },
    cache: {
      size: stockCache.keys().length,
      hits: stockCache.getStats().hits,
      misses: stockCache.getStats().misses
    }
  });
});

// Route pour basculer une API
app.post('/api/toggle/:api', (req, res) => {
  const api = req.params.api.toLowerCase();
  const apis = ['yahoo', 'alphavantage', 'finnhub'];
  
  if (!apis.includes(api)) {
    return res.status(400).json({ error: 'Invalid API name' });
  }

  const configKey = `${api}Finance` as keyof typeof API_CONFIG;
  API_CONFIG[configKey].enabled = !API_CONFIG[configKey].enabled;

  res.json({
    api,
    enabled: API_CONFIG[configKey].enabled,
    message: `API ${api} is now ${API_CONFIG[configKey].enabled ? 'enabled' : 'disabled'}`
  });
});


// Watchlist Routes - à placer avant le app.use("/", require("./routes"));

// Avant les routes watchlist
app.use('/api/user/watchlist/:username', async (req, res, next) => {
  const { username } = req.params;
  if (!username || username.length < 3) {
    return res.status(400).json({ 
      success: false,
      error: 'Nom d\'utilisateur invalide' 
    });
  }
  next();
});

// Routes Watchlist simplifiées (sans auth)
app.get('/api/user/watchlist/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const user = await UserModel.findOne({ username }).select('watchlist');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      watchlist: user.watchlist || []
    });
  } catch (error) {
    logger.error('Watchlist fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

app.post('/api/user/watchlist/:username/add/:symbol', async (req: Request, res: Response) => {
  try {
    const { username, symbol } = req.params;
    const normalizedSymbol = symbol.toUpperCase();

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utilisateur non trouvé' 
      });
    }

    // Éviter les doublons
    if (!user.watchlist.includes(normalizedSymbol)) {
      user.watchlist.push(normalizedSymbol);
      await user.save();
    }

    res.json({
      success: true,
      message: `${normalizedSymbol} ajouté à la watchlist`,
      watchlist: user.watchlist
    });
  } catch (error) {
    logger.error('Watchlist add error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'ajout' 
    });
  }
});



// // Ajoutez après vos autres routes
// app.post('/api/events/simulate', async (req: Request, res: Response) => {
//   try {
//     const { type } = req.body;
    
//     const eventTemplates = {
//       crash: [
//         { symbol: 'NVDA', eventType: 'negative', impact: -25, description: 'Pénurie de puces graphiques' },
//         { symbol: 'TSLA', eventType: 'negative', impact: -20, description: 'Rappel massif de véhicules' },
//         { symbol: 'AAPL', eventType: 'negative', impact: -15, description: 'Réduction des ventes iPhone' }
//       ],
//       boom: [
//         { symbol: 'NVDA', eventType: 'positive', impact: 30, description: 'IA révolutionnaire annoncée' },
//         { symbol: 'TSLA', eventType: 'positive', impact: 25, description: 'Nouvelle batterie révolutionnaire' },
//         { symbol: 'AAPL', eventType: 'positive', impact: 20, description: 'Lancement iPhone 20 réussi' }
//       ]
//     };

//     const events = eventTemplates[type as keyof typeof eventTemplates];
//     if (!events) {
//       return res.status(400).json({ success: false, error: 'Type d\'événement invalide' });
//     }

//     await MarketEvent.insertMany(events);
//     res.json({ success: true, message: `${events.length} événements ${type} créés` });
    
//   } catch (error) {
//     console.error('Erreur simulation:', error);
//     res.status(500).json({ success: false, error: (error as Error).message });
//   }
// });



app.post('/api/user/watchlist/:username/remove/:symbol', async (req: Request, res: Response) => {
  try {
    const { username, symbol } = req.params;
    const normalizedSymbol = symbol.toUpperCase();

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utilisateur non trouvé' 
      });
    }

    user.watchlist = user.watchlist.filter(s => s !== normalizedSymbol);
    await user.save();

    res.json({
      success: true,
      message: `${normalizedSymbol} retiré de la watchlist`,
      watchlist: user.watchlist
    });
  } catch (error) {
    logger.error('Watchlist remove error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression' 
    });
  }
});

// Nouvelle route pour obtenir le cash de l'utilisateur
app.get("/api/user/cash", async (req: Request, res: Response) => {
  try {
    // Récupérer le token d'authentification
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Token d'authentification manquant" });
    }

    // Vérifier le token et récupérer l'utilisateur
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Retourner le cash et le solde
    res.json({ 
    success: true,
    newCash: user.cash, // Ligne 1031
    balance: user.balance 
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du cash:", error);
    res.status(500).json({ 
      error: "Erreur serveur",
      details: (error as Error).message
    });
  }
});

app.get('/api/events/prices/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    const data = await getStockData(symbol);
    const events = await MarketEvent.find({ symbol, isActive: true });
    
    let multiplier = 1;
    events.forEach(event => {
      multiplier += (event.impact / 100);
    });

    res.json({
      success: true,
      originalPrice: data.price,
      simulatedPrice: data.price * multiplier,
      events
    });
  } catch (error) {
    console.error('Erreur prix simulé:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});



// REST Routes - Modification clé ici
app.use("/", require("./routes")); // Préfixe déjà inclus dans les routes
//app.use("/api", require("./routes"));


// ----------------------------------------------------------
// 1) Middleware d'erreur GLOBAL (doit être LE DERNIER)
// ----------------------------------------------------------
const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error(`[GLOBAL] ${err.message}`, { stack: err.stack });
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};
app.use(globalErrorHandler);


const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  swaggerDocs(app, PORT);
  
  // // ✅ WebSocket intégré
  // new ChatServer(server);
  // console.log(`🗣️  WebSocket Chat Server running on ws://localhost:${PORT}`);

  //✅  WebSocket Market
  new MarketDataServer(server);
  console.log(`📈 MarketDataServer running on ws://localhost:${PORT}/market`);

  const io = new Server(server, {
  cors: {
    origin: ['ws://tradingrey.netlify.app', 'ws://react-frontend-production-eae6.up.railway.app'],
    methods: "*",
    credentials: true
  },
  transports: ["websocket", "polling"],
});

process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught Exception', err);
  process.exit(1); // redémarrage Docker/PM2
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection at', promise, reason);
  process.exit(1);
});

// ✅ Configuration unique du WebSocket
io.on('connection', (socket) => {
  console.log(`🟢 Client connecté: ${socket.id}`);

  // Quand le client s’authentifie
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.username = decoded.username;  // ← stocke le username
      socket.emit('authenticated', { username: decoded.username });
    } catch {
      socket.disconnect();
    }
  });

  // Réception d’un message
  socket.on('sendMessage', ({ text }) => {
    if (!socket.data.username) return;          // pas encore authentifié

    const message: Message = {
      id: Date.now().toString(),
      username: socket.data.username,           // ← utilise le vrai username
      text,
      timestamp: new Date()
    };

    io.emit('newMessage', message);             // broadcast
  });


  // News
  socket.on('news-trigger', ({ id }) => {
    io.emit('global-news', { id });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Client déconnecté: ${socket.id}`);
  });

  // ✅ Support market
  socket.on('subscribe', ({ symbol }) => {
    socket.join(`market-${symbol}`);
    console.log(`📈 ${socket.id} subscribed to ${symbol}`);
  });

  socket.on('unsubscribe', ({ symbol }) => {
    socket.leave(`market-${symbol}`);
    console.log(`📉 ${socket.id} unsubscribed from ${symbol}`);
  });

  // ✅ Exemple d'envoi de données
  setInterval(() => {
    // Envoyer des données de marché ici
    socket.emit('candle', { symbol: 'AAPL', price: 150 + Math.random() * 10 });
  }, 5000);

  setInterval(() => {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    // ✅ Émettre des chandeliers fictifs
    const candle = {
      symbol,
      timestamp: Date.now(),
      open: 150 + Math.random() * 20,
      high: 160 + Math.random() * 20,
      low: 140 + Math.random() * 20,
      close: 145 + Math.random() * 20,
      volume: Math.floor(Math.random() * 1000000)
    };

    socket.emit('candle', candle);
  }, 2000);

  // ✅ Émettre des données historiques
  socket.on('subscribe', ({ symbol }) => {
    const historical: any[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 25; i++) {
      const price = 150 + (Math.random() - 0.5) * 20;
      historical.push({
        symbol,
        timestamp: now - (24 - i) * 5 * 60 * 1000,
        open: price,
        high: price + Math.random() * 5,
        low: price - Math.random() * 5,
        close: price + (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 500000)
      });
    }
    
    socket.emit('historical', historical);
  });

  socket.on('sendMessage', ({ text }) => {
  try {
    // votre logique actuelle
  } catch (e) {
    logger.error('[WS] sendMessage error', e);
    socket.emit('error', { message: 'Internal error' });
  }
});

});

console.log(`🗣️  WebSocket Server running on ws://localhost:${PORT}`);








});

