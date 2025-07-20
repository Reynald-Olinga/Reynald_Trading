import MarketEvent from '../models/marketEvent.model';
import User from '../models/user.model';
import { StockPriceService } from './stockPrice.service';
import { PriceCurveService } from './priceCurve.service';

export class MarketSimulator {
  private static instance: MarketSimulator;
  private priceService = new StockPriceService();
  
  static getInstance(): MarketSimulator {
    if (!this.instance) {
      this.instance = new MarketSimulator();
    }
    return this.instance;
  }

  // ✅ Créer un événement de marché
  async createEvent(eventData: {
    symbol: string;
    eventType: 'positive' | 'negative';
    impact: number;
    description: string;
    duration?: number; // minutes
  }) {
    const event = new MarketEvent({
      ...eventData,
      endDate: eventData.duration ? 
        new Date(Date.now() + eventData.duration * 60000) : 
        new Date(Date.now() + 60 * 60000) // 1h par défaut
    });
    
    await event.save();
    console.log(`🎯 Événement créé: ${eventData.description} pour ${eventData.symbol}`);
    return event;
  }

  // ✅ Obtenir le prix modifié par les événements actifs
  
  async getSimulatedPrice(symbol: string): Promise<{
  originalPrice: number;
  simulatedPrice: number;
  events: any[];
}> {
  const basePrice = await this.priceService.getCurrentPrice(symbol);
  const activeEvents = await MarketEvent.find({
    symbol,
    isActive: true,
    startDate: { $lte: new Date() },
    $or: [{ endDate: { $gte: new Date() } }, { endDate: { $exists: false } }]
  });

  let finalPrice = basePrice;
  const curve = new PriceCurveService();

  for (const ev of activeEvents) {
    finalPrice = curve.computeProgressivePrice(
      basePrice,
      ev.targetPrice,
      ev.startDate,
      ev.curveDuration
    );
  }

  return {
    originalPrice: basePrice,
    simulatedPrice: finalPrice,
    events: activeEvents
  };
}



  // ✅ Simulation d'événements pré-définis
    async simulateMarketCrash() {
    const crashEvents = [
      { symbol: 'NVDA', impact: -70, description: 'Crash 70 % NVDA' },
      { symbol: 'TSLA', impact: -70, description: 'Crash 70 % TSLA' },
      { symbol: 'AAPL', impact: -70, description: 'Crash 70 % AAPL' }
    ];
    for (const ev of crashEvents) await this.createEvent(ev);
  }

  async simulateTechBoom() {
    const boomEvents = [
      { symbol: 'NVDA', impact: 70, description: 'Boom 70 % NVDA' },
      { symbol: 'TSLA', impact: 70, description: 'Boom 70 % TSLA' },
      { symbol: 'AAPL', impact: 70, description: 'Boom 70 % AAPL' }
    ];
    for (const ev of boomEvents) await this.createEvent(ev);
  }
}

export default MarketSimulator;