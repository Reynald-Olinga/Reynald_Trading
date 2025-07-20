// src/models/position.model.ts
import mongoose, { Schema, Document, model } from "mongoose";

export interface IPosition extends Document {
  userId: string;          // ← ajouté
  symbol: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: Date;
}

const PositionSchema = new mongoose.Schema<IPosition>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

const Position = mongoose.models.Position || model<IPosition>("Position", PositionSchema);
export default Position;