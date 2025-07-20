// src/models/transaction.model.ts
import mongoose, { Schema, Document, model } from "mongoose";

export interface ITransaction extends Document {
  userId: string;
  symbol: string;
  quantity: number;
  price: number;
  type: "buy" | "sell";
  date: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: (v: string) => /^[A-Z]{1,10}$/.test(v),
      message: "Format de symbole invalide"
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    required: true,
    enum: ["buy", "sell"]
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

const Transaction = mongoose.models.Transaction || model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;


















// // src/models/transaction.model.ts
// import mongoose, { Schema, Document, model } from "mongoose";

// export interface ITransaction extends Document {
//   symbol: string;
//   price: number;
//   quantity: number;
//   type: "buy" | "sell";
//   date: Date;
// }

// export const TransactionSchema = new Schema<ITransaction>({
//   symbol: {
//     type: String,
//     required: true,
//     uppercase: true,
//     trim: true,
//     validate: {
//       validator: (v: string) => /^[A-Z]{1,10}$/.test(v),
//       message: "Format de symbole invalide"
//     }
//   },
//   price: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 1
//   },
//   type: {
//     type: String,
//     required: true,
//     enum: ["buy", "sell"]
//   },
//   date: {
//     type: Date,
//     default: Date.now
//   }
// }, { versionKey: false });

// const Transaction = mongoose.models.Transaction || model<ITransaction>("Transaction", TransactionSchema);
// export default Transaction;