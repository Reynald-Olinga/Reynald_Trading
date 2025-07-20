import express from 'express';
import MarketEvent from '../models/marketEvent.model';
import { computeTargetPrice } from '../utils/eventCalculator';

const router = express.Router();

router.post('/simulate', async (req, res) => {
  try {
    const { type, symbol } = req.body; // ← récupère le symbole envoyé

    if (!symbol) return res.status(400).json({ success: false, error: 'Symbole manquant' });

    const impact = type === 'crash' ? -70 : 70;
    const basePrice = await computeTargetPrice(symbol, impact);
    const targetPrice = basePrice * (1 + impact / 100);

    const event = new MarketEvent({
        symbol: symbol.toUpperCase(),
        eventType: type === 'crash' ? 'negative' : 'positive',
        impact: type === 'crash' ? -70 : 70,
        description: `${type} 70 % ${symbol}`,
        targetPrice: await computeTargetPrice(symbol, type === 'crash' ? -70 : 70),
        curveDuration: 3, // minutes
        endDate: new Date(Date.now() + 3 * 60 * 1000), // ← fin dans 3 min
        isActive: true,
    });
        setTimeout(async () => {
        await MarketEvent.updateMany(
            { endDate: { $lte: new Date() }, isActive: true },
            { $set: { isActive: false } }
        );
        }, 3 * 60 * 1000); // 3 min après le lancement

    await event.save();

    res.json({ success: true, message: `${type} 70 % sur ${symbol} lancé` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;