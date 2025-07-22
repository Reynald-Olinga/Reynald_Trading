// src/models/user.model.ts
import mongoose, { Schema, Document, model } from "mongoose";
import { IPosition } from './position.model';

export interface IUser extends Document {
  username: string;
  password?: string; // Marque la propriété comme optionnelle
  watchlist: string[];
  ledger: any;
  positions: IPosition[];
  cash: number;
  balance: number;
  __v?: number; // Marque la propriété comme optionnelle
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (username: string) => username.length >= 3,
      message: "Le nom d'utilisateur doit contenir au moins 3 caractères"
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  watchlist: {
    type: [String],
    default: []
  },
  ledger: {
    type: [Schema.Types.Mixed], // référence vers Transaction
    ref: 'Transaction',
    default: [],
    required: false,
  },
  positions: {
    type: [Schema.Types.ObjectId], // référence vers Position
    ref: 'Position',
    default: []
  },
  cash: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: (cash: number) => cash >= 0,
      message: "Le solde ne peut pas être négatif"
    }
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Middleware pour synchroniser les positions
UserSchema.pre('save', async function (next) {
  if (this.isModified('positions')) {
    const Position = mongoose.model('Position');
    const positions = await Position.find({ userId: this._id });
    this.positions = positions.map(p => p._id); // on ne stocke que les ObjectId
  }
  next();
});

const UserModel = mongoose.models.User || model<IUser>('User', UserSchema);
export default UserModel;




