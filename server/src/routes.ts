import express from "express";
const router = express.Router();
import { verifySignUp, authJwt } from "./middleware";
import authController from "./controller/auth.controller";
import userController from "./controller/user.controller";
import stocksController from "./controller/stocks.controller";
import newsController from "./controller/news.controller";
import leaderboardController from "./controller/leaderboard.controller";
import { sellStock } from './controller/stocks.controller';
import { User } from "./models/user.model";
import { Position } from "./models/position.model";
import jwt from 'jsonwebtoken';

// Auth routes
router.post(
  "/auth/signup",
  [verifySignUp.checkDuplicateUsername],
  authController.signup
);
router.post("/auth/login", authController.login);

// User data routes
router.get("/user/ledger", [authJwt.verifyToken], userController.getLedger);
router.get("/user/holdings", [authJwt.verifyToken], userController.getHoldings);
router.get("/user/portfolio", [authJwt.verifyToken], userController.getPortfolio);
router.get("/user/leaderboard", leaderboardController.getLeaderboard);

// User watchlist routes
router.get("/user/watchlist", [authJwt.verifyToken], userController.getWatchlist);
router.post(
  "/user/watchlist/add/:symbol",
  [authJwt.verifyToken],
  userController.addToWatchlist
);
router.post(
  "/user/watchlist/remove/:symbol",
  [authJwt.verifyToken],
  userController.removeFromWatchlist
);

// Stocks routes
router.get("/stocks/search/:query", stocksController.search);
router.get("/stocks/:symbol/info", stocksController.getInfo);
router.get("/stocks/:symbol/historical", stocksController.getHistorical);
router.post(
  "/stocks/:symbol/buy",
  [authJwt.verifyToken],
  stocksController.buyStock
);
// router.post(
//   "/stocks/:symbol/sell",
//   [authJwt.verifyToken],
//   stocksController.sellStock
// );

// News routes
router.get("/news", newsController.getNews);
router.get("/news/:symbol", newsController.getNews);

export = router;

