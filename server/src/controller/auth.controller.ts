import dotenv from "dotenv";
dotenv.config();
const jwtSecret = process.env.STOTRA_JWT_SECRET;
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import User from "../models/user.model";

const signup = (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Authentication']
  */
  if (!req.body.username || !req.body.password) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // SUPPRIMÉ: L'appel à validateTurnstile() et sa gestion Promise
  const newUser = new User({
    username: req.body.username,
    password: req.body.password,
    watchlist: [],
    ledger: [],
    positions: [],
    cash: 100_000,
  });

  newUser.save()
    .then(() => {
      res.send({ message: "User was registered successfully!" });
    })
    .catch((err: Error) => {
      res.status(500).send({ message: err.message });
    });
};

const login = (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Authentication']
  */
  // SUPPRIMÉ: L'appel à validateTurnstile() et sa gestion Promise
  User.findOne({ username: req.body.username })
    .then((user) => {
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      //const passwordIsValid = bcrypt.compareSync(
      //  req.body.password,
      //  user.password
      //);
      const passwordIsValid = req.body.password === user.password; // Pour simplifier, on compare directement les mots de passe
      
     
      console.log({ username: user.username, password: req.body.password, passwordIsValid,  user });

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Incorrect password",
        });
      }
      console.log("Password valid:", passwordIsValid);
      const token = jwt.sign({ id: user._id, username: user.username, userId:user._id }, jwtSecret!, {
        algorithm: "HS256",
        allowInsecureKeySizes: true,
        expiresIn: "7d",
      });

      console.log({ id: user._id, username: user.username, userId:user._id });
      
      
      res.status(200).send({
        id: user._id,
        username: user.username,
        accessToken: token,
      });
    })
    .catch((err: Error) => {
      res.status(500).send({ message: err.message });
    });
};

// SUPPRIMÉ: La fonction validateTurnstile() complète

export default { signup, login };



