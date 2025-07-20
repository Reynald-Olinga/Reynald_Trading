import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketEvent extends Document {
  symbol: string;
  eventType: 'positive' | 'negative' | 'neutral';
  impact: number; // Pourcentage de variation
  description: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

const MarketEventSchema = new Schema<IMarketEvent>({
  symbol: { type: String, required: true, uppercase: true },
  eventType: { type: String, enum: ['positive', 'negative', 'neutral'], required: false },
  impact: { type: Number, required: true, min: -70, max: 70 }, // ✅, // -50% à +50%
  description: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  targetPrice: { type: Number, required: false },  // ✅     // Prix final après impact
  curveDuration: { type: Number, default: 60 },      // Durée en minutes
});

export default mongoose.model<IMarketEvent>('MarketEvent', MarketEventSchema);