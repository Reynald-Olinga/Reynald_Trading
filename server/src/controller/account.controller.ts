import { Request, Response } from "express";
import User from '../models/user.model';
import { logger } from '../utils/logger';
import Position from '../models/position.model'; 

export const AccountController = {
    async addFunds(req: Request, res: Response) {
        try {
            const { username, amount } = req.body;
            
            // Validation des données
            if (!username || !amount) {
                return res.status(400).json({ 
                    success: false,
                    error: "Nom d'utilisateur et montant requis" 
                });
            }

            if (amount <= 0 || amount > 10000) {
                return res.status(400).json({ 
                    success: false,
                    error: "Le montant doit être entre 1$ et 10,000$" 
                });
            }

            // Recherche de l'utilisateur
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    error: "Utilisateur non trouvé" 
                });
            }

            // Mise à jour du solde de manière atomique
            const updatedUser = await User.findOneAndUpdate(
                { username },
                { $inc: { balance: amount } },
                { new: true }
            );

            // Logging
            const logMessage = `Fonds ajoutés - Utilisateur: ${username}, Montant: $${amount}, Nouveau solde: $${updatedUser?.balance}`;
            logger?.info(logMessage) || console.log(logMessage);
            
            return res.json({
                success: true,
                newBalance: updatedUser?.balance,
                message: `$${amount} ajoutés avec succès`
            });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            logger?.error("Erreur lors de l'ajout de fonds:", errorMessage) || console.error("Erreur lors de l'ajout de fonds:", errorMessage);
            
            return res.status(500).json({ 
                success: false,
                error: "Erreur serveur" 
            });
        }
    },

    async getPortfolio(req: Request & { userId: string }, res: Response) {
        try {
            const positions = await Position.find({ userId: req.userId })
                .select('symbol quantity purchasePrice purchaseDate')
                .lean();

            return res.json({
                success: true,
                portfolio: positions || []
            });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            logger?.error("Erreur lors de la récupération du portefeuille:", errorMessage) || console.error("Erreur lors de la récupération du portefeuille:", errorMessage);
            
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
    },

    async getBalance(req: Request & { userId: string }, res: Response) {
    try {
        const user = await User.findById(req.userId).select('balance');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "Utilisateur non trouvé" 
            });
        }

        return res.json({
            success: true,
            cash: user.balance || 0, // Toujours retourner comme 'cash'
            balance: user.balance || 0, // Pour compatibilité
            message: "Solde récupéré avec succès"
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        logger?.error("Erreur getBalance:", errorMessage) || console.error("Erreur getBalance:", errorMessage);
        
        return res.status(500).json({
            success: false,
            error: "Erreur serveur"
        });
    }
}
};


