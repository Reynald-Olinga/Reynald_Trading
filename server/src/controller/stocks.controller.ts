import mongoose from "mongoose";
import { Request, Response } from "express";
import User from "../models/user.model";
import {
    fetchStockData,
    fetchHistoricalStockData,
    searchStocks,
} from "../utils/requests";
import { ITransaction } from "../models/transaction.model";
// import { IPosition } from "../models/position.model";
// import Position from "../models/position.model";
import Position, { IPosition } from "../models/position.model";
import Transaction from "../models/transaction.model";

const getInfo = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['Stock Data']
    */
    try {
        const symbol = req.params.symbol;
        const quote = await fetchStockData(symbol);
        res.status(200).send(quote);
    } catch (error) {
        console.error("Error fetching stock data:", error);
        res.status(500).send({ message: "Error fetching stock data" });
    }
};

const getHistorical = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['Stock Data']
    */
    try {
        const symbol = req.params.symbol;
        const period = req.query.period?.toString() as
            | "1d"
            | "5d"
            | "1m"
            | "6m"
            | "YTD"
            | "1y"
            | "all"
            | undefined;

        const historicalData = await fetchHistoricalStockData(symbol, period);
        res.status(200).send(historicalData);
    } catch (error) {
        console.error("Error fetching historical stock data:", error);
        res.status(500).send({ message: "Error fetching historical stock data" });
    }
};



const buyStock = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { symbol } = req.params;
        const quantity = parseInt(req.body.quantity);
        const userId = req.userId;

        // Validation
        if (!quantity || quantity <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Invalid quantity" });
        }

        // Prix actuel
        const stockData = await getStockData(symbol);
        if (!stockData?.price) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Failed to fetch stock price" });
        }

        const totalCost = stockData.price * quantity;

        // Opération atomique
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: -totalCost } },
            { new: true, session }
        );

        if (!user || user.balance < 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Insufficient funds" });
        }

        // Mise à jour position
        await Position.findOneAndUpdate(
            { userId, symbol },
            { 
                $inc: { quantity },
                $setOnInsert: { purchasePrice: stockData.price }
            },
            { upsert: true, session }
        );

        // Transaction
        await Transaction.create([{
            userId,
            symbol,
            quantity,
            price: stockData.price,
            type: 'buy'
        }], { session });

        await session.commitTransaction();
        
        res.json({
            success: true,
            newCash: user.balance,
            message: `Achat de ${quantity} ${symbol} effectué`
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Transaction error:", error);
        res.status(500).json({ error: "Transaction failed" });
    } finally {
        session.endSession();
    }
};


export const sellStock = async (req: Request & { userId: string }, res: Response) => {
  console.log("=== VENTE SANS TRANSACTIONS ===");
  console.log("Données:", { params: req.params, body: req.body, userId: req.userId });

  try {
    const { symbol } = req.params;
    const { quantity } = req.body;
    const userId = req.userId;

    // Validation
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        error: "Quantité invalide"
      });
    }

    // Vérifier la position avec findOneAndUpdate pour verrouillage optmiste
    const position = await Position.findOne({
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

    if (position.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: "Quantité insuffisante",
        details: {
          possédé: position.quantity,
          demandé: quantity
        }
      });
    }

    // Récupérer le prix actuel
    const stockData = await fetchStockData(symbol);
    if (!stockData?.price) {
      throw new Error("Impossible de récupérer le cours actuel");
    }

    const price = stockData.price;
    const totalValue = price * quantity;

    // Mise à jour séquentielle avec vérifications
    let remainingShares;
    
    if (position.quantity === quantity) {
      // Supprimer la position complètement
      await Position.deleteOne({ _id: position._id });
      remainingShares = 0;
      console.log("Position supprimée complètement");
    } else {
      // Décrémenter la quantité
      const result = await Position.findOneAndUpdate(
        { 
          _id: position._id,
          quantity: { $gte: quantity } // Vérification de concurrence
        },
        { $inc: { quantity: -quantity } },
        { new: true }
      );
      
      if (!result) {
        throw new Error("Erreur de concurrence - quantité modifiée entre temps");
      }
      
      remainingShares = result.quantity;
      console.log("Position mise à jour, nouvelle quantité:", remainingShares);
    }

    // Mettre à jour le cash de l'utilisateur
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { cash: totalValue } },
      { new: true }
    );

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Enregistrer la transaction
    const transaction = new Transaction({
      userId,
      symbol,
      quantity,
      price,
      type: 'sell',
      date: new Date()
    });
    
    await transaction.save();
    console.log("Transaction enregistrée:", transaction._id);

    console.log("=== VENTE RÉUSSIE ===");

    res.json({
      success: true,
      newCash: user.cash,
      remainingShares: remainingShares,
      message: `Vente de ${quantity} ${symbol} effectuée`
    });

  } catch (error) {
    console.error("Erreur vente:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de la vente"
    });
  }
};


const search = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['Stock Data']
    */
    try {
        const { query } = req.params;
        if (!query) {
            return res.status(400).send({ message: "No query provided" });
        }

        const quotes = await searchStocks(query);
        const stocksAndCurrencies = quotes.filter((quote: { quoteType: string }) => {
            return quote.quoteType && quote.quoteType !== "FUTURE" && quote.quoteType !== "Option";
        });

        res.status(200).send(stocksAndCurrencies);
    } catch (err) {
        console.error("Error searching stocks:", err);
        res.status(500).send({ message: "Error searching stocks" });
    }
};

export default { getInfo, getHistorical, buyStock, sellStock, search };


