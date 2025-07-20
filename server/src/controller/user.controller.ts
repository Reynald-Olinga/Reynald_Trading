import Position from "../models/position.model";
import User, { IUser } from "../models/user.model";
import { Request, Response } from "express";
import { fetchStockData } from "../utils/requests";

const getLedger = (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Data']
    */
    User.findById(req.body.userId)
        .then((user) => {
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json({ ledger: user.ledger });
        })
        .catch((err: { message: any }) => {
			res.status(500).send({ 
			message: err instanceof Error ? err.message : 'Unknown error' 
			});
        });
};

const getHoldings = (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Data']
    */
    User.findById(req.body.userId)
        .then((user) => {
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json({ positions: user.positions, cash: user.cash });
        })
        .catch((err: { message: any }) => {  
			res.status(500).send({ 
			message: err instanceof Error ? err.message : 'Unknown error' 
			});
        });
};

const getPortfolio = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Data']
    */
    try {
        const user = await User.findById(req.body.userId).lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let portfolioValue = 0;
        let portfolioPrevCloseValue = 0;

        // Create array of how many of each symbol (no duplicates)
        const positionsNoDupes: { [key: string]: number } = {};
        user.positions.forEach((position) => {
            positionsNoDupes[position.symbol] = 
                (positionsNoDupes[position.symbol] || 0) + position.quantity;
        });

        const symbols = Object.keys(positionsNoDupes);
        const quantities = Object.values(positionsNoDupes);

        const values = await Promise.all(symbols.map((symbol) => fetchStockData(symbol)));
        const listOfPositions: any[] = [];

        // Sum up the value of all positions
        values.forEach((value, i) => {
            portfolioValue += value.regularMarketPrice * quantities[i];
            portfolioPrevCloseValue += value.regularMarketPreviousClose * quantities[i];
        });

        // Create list of positions with live data
        user.positions.forEach((position) => {
            const positionLiveData = values.find((value) => value.symbol === position.symbol);
            if (positionLiveData) {
                listOfPositions.push({
                    ...position,
                    ...positionLiveData,
                });
            }
        });

        res.status(200).json({
            portfolioValue,
            portfolioPrevCloseValue,
            positions: listOfPositions,
            cash: user.cash,
        });
    } catch (err) {
		res.status(500).send({ 
		message: err instanceof Error ? err.message : 'Unknown error' 
		});
    }
};

const getWatchlist = (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Watchlist']
    */
    User.findById(req.body.userId)
        .then((user) => {
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            if (req.body.raw === "true") {
                return res.status(200).json({ watchlist: user.watchlist });
            }

            Promise.all(user.watchlist.map((symbol) => fetchStockData(symbol)))
                .then((values) => {
                    res.status(200).json({ watchlist: values });
                })
                .catch((err) => {
					res.status(500).send({ 
					message: err instanceof Error ? err.message : 'Unknown error' 
					});
                });
        })
        .catch((err: { message: any }) => {
			res.status(500).send({ 
			message: err instanceof Error ? err.message : 'Unknown error' 
			});
        });
};

const addToWatchlist = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Watchlist']
    */
    try {
        const user = await User.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.watchlist.includes(req.params.symbol)) {
            return res.status(400).json({ message: "Already in watchlist" });
        }

        user.watchlist.push(req.params.symbol);
        await user.save();
        res.status(200).json({ message: "Added to watchlist" });
    } catch (err) {
			res.status(500).send({ 
			message: err instanceof Error ? err.message : 'Unknown error' 
			});
    }
};

const removeFromWatchlist = async (req: Request, res: Response) => {
    /* 
    #swagger.tags = ['User Watchlist']
    */
    try {
        const user = await User.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.watchlist.includes(req.params.symbol)) {
            return res.status(400).json({ message: "Not in watchlist" });
        }

        user.watchlist = user.watchlist.filter(
            (symbol) => symbol !== req.params.symbol
        );
        await user.save();
        res.status(200).json({ message: "Removed from watchlist" });
    } catch (err) {
			res.status(500).send({ 
			message: err instanceof Error ? err.message : 'Unknown error' 
			});
    }
};

export default {
    getLedger,
    getHoldings,
    getPortfolio,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
};

