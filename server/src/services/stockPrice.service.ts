// server/src/services/stockPrice.service.ts
import axios from 'axios';
import { getStockData } from '../index';

interface Candle {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class StockPriceService {
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const data = await getStockData(symbol);
      return data.price;
    } catch (error) {
      console.error(`Erreur prix ${symbol}:`, error);
      throw new Error(`Impossible de récupérer le prix pour ${symbol}`);
    }
  }

  /* ---------- BOUGIES ---------- */

  private getMockCandle(symbol: string): Candle {
    const base = 100 + Math.random() * 200;
    const close = base * (1 + (Math.random() - 0.5) * 0.02);
    return {
      symbol,
      timestamp: Date.now(),
      open: base,
      high: Math.max(base, close) * 1.01,
      low: Math.min(base, close) * 0.99,
      close,
      volume: Math.floor(Math.random() * 1_000_000),
    };
  }

  public async getLastCandle(symbol: string): Promise<Candle> {
    const apiKey = process.env.STOTRA_ALPHAVANTAGE_API;
    if (!apiKey) {
      console.warn("⚠️  Clé Alpha Vantage manquante → fallback mock");
      return this.getMockCandle(symbol);
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apiKey}`;

    try {
      const res = await axios.get(url);
      const raw = res.data['Time Series (1min)'];

      if (!raw) {
        console.warn("⚠️  Alpha Vantage intraday absent → fallback mock");
        return this.getMockCandle(symbol);
      }

      const latestTime = Object.keys(raw)[0];
      const latest = raw[latestTime];

      return {
        symbol,
        timestamp: new Date(latestTime).getTime(),
        open: parseFloat(latest['1. open']),
        high: parseFloat(latest['2. high']),
        low: parseFloat(latest['3. low']),
        close: parseFloat(latest['4. close']),
        volume: parseInt(latest['5. volume'], 10),
      };
    } catch (err: any) {
      console.warn("⚠️  Erreur Alpha Vantage → fallback mock", err.message);
      return this.getMockCandle(symbol);
    }
  }

  public async getHistoricalCandles(symbol: string, limit = 30): Promise<Candle[]> {
    const apiKey = process.env.STOTRA_ALPHAVANTAGE_API;
    if (!apiKey) {
      console.warn("⚠️  Clé Alpha Vantage manquante → fallback mock historique");
      return Array.from({ length: limit }, () => this.getMockCandle(symbol));
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apiKey}`;

    try {
      const res = await axios.get(url);
      const raw = res.data['Time Series (1min)'];

      if (!raw) {
        console.warn("⚠️  Alpha Vantage intraday absent → fallback mock historique");
        return Array.from({ length: limit }, () => this.getMockCandle(symbol));
      }

      const candles = Object.entries(raw)
        .slice(0, limit)
        .map(([time, ohlcv]: [string, any]) => ({
          symbol,
          timestamp: new Date(time).getTime(),
          open: parseFloat(ohlcv['1. open']),
          high: parseFloat(ohlcv['2. high']),
          low: parseFloat(ohlcv['3. low']),
          close: parseFloat(ohlcv['4. close']),
          volume: parseInt(ohlcv['5. volume'], 10),
        }))
        .reverse();

      return candles;
    } catch (err: any) {
      console.warn("⚠️  Erreur Alpha Vantage → fallback mock historique", err.message);
      return Array.from({ length: limit }, () => this.getMockCandle(symbol));
    }
  }

  public async getLatestCandle(symbol: string): Promise<Candle> {
    const last = await this.getLastCandle(symbol);
    const now = Date.now();
    const variation = (Math.random() - 0.5) * 0.01;
    const close = last.close * (1 + variation);

    return {
      ...last,
      timestamp: now,
      close,
      high: Math.max(last.high, close),
      low: Math.min(last.low, close),
    };
  }
}
























// // server/src/services/stockPrice.service.ts
// // server/src/services/stockPrice.service.ts
// import axios from 'axios';
// import { getStockData } from '../index';

// interface StockData {
//   symbol: string;
//   price: number;
//   changePercent: number;
//   source: string;
// }

// export class StockPriceService {
//   async getCurrentPrice(symbol: string): Promise<number> {
//     try {
//       const data: StockData = await getStockData(symbol);
//       return data.price;
//     } catch (error) {
//       console.error(`Erreur récupération prix ${symbol}:`, error);
//       throw new Error(`Impossible de récupérer le prix pour ${symbol}`);
//     }
//   }

//   /* ===== AJOUTS POUR LES BOUGIES 1-MIN ===== */
//   public async getLastCandle(symbol: string): Promise<{
//     symbol: string;
//     timestamp: number;
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//     volume: number;
//   }> {
//     if (!process.env.STOTRA_ALPHAVANTAGE_API) {
//       return this.getMockCandle(symbol); // fallback si clé absente
//     }

//     const url =
//       `https://www.alphavantage.co/query` +
//       `?function=TIME_SERIES_INTRADAY` +
//       `&symbol=${symbol}` +
//       `&interval=1min` +
//       `&apikey=${process.env.STOTRA_ALPHAVANTAGE_API}`;

//     const response = await axios.get(url);
//     const data = response.data['Time Series (1min)'];
//     if (!data) throw new Error('Alpha Vantage intraday data missing');

//     const latestTime = Object.keys(data)[0];
//     const latest = data[latestTime];

//     return {
//       symbol,
//       timestamp: new Date(latestTime).getTime(),
//       open: parseFloat(latest['1. open']),
//       high: parseFloat(latest['2. high']),
//       low: parseFloat(latest['3. low']),
//       close: parseFloat(latest['4. close']),
//       volume: parseInt(latest['5. volume'], 10),
//     };
//   }

//   public async getHistoricalCandles(
//   symbol: string,
//   limit: number = 30
// ): Promise<Candle[]> {
//   if (!process.env.STOTRA_ALPHAVANTAGE_API) {
//     // fallback : générer des fausses bougies
//     return Array.from({ length: limit }, () => this.getMockCandle(symbol));
//   }

//   const url =
//     `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY` +
//     `&symbol=${symbol}&interval=1min&apikey=${process.env.STOTRA_ALPHAVANTAGE_API}`;

//   const res = await axios.get(url);
//   const raw = res.data['Time Series (1min)'];
//   const candles = Object.entries(raw)
//     .slice(0, limit)
//     .map(([time, ohlcv]: [string, any]) => ({
//       symbol,
//       timestamp: new Date(time).getTime(),
//       open: parseFloat(ohlcv['1. open']),
//       high: parseFloat(ohlcv['2. high']),
//       low: parseFloat(ohlcv['3. low']),
//       close: parseFloat(ohlcv['4. close']),
//       volume: parseInt(ohlcv['5. volume'], 10),
//     }));
//   return candles.reverse(); // ordre chronologique
// }

//   public async getLatestCandle(symbol: string): Promise<{
//     symbol: string;
//     timestamp: number;
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//     volume: number;
//   }> {
//     const last = await this.getLastCandle(symbol);
//     const now = Date.now();
//     const variation = (Math.random() - 0.5) * 0.02; // ±1 %

//     const close = last.close * (1 + variation);
//     return {
//       ...last,
//       timestamp: now,
//       close,
//       high: Math.max(last.high, close),
//       low: Math.min(last.low, close),
//     };
//   }

//   private getMockCandle(symbol: string): {
//     symbol: string;
//     timestamp: number;
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//     volume: number;
//   } {
//     const base = 100 + Math.random() * 200;
//     const close = base * (1 + (Math.random() - 0.5) * 0.02);
//     return {
//       symbol,
//       timestamp: Date.now(),
//       open: base,
//       high: Math.max(base, close) * 1.01,
//       low: Math.min(base, close) * 0.99,
//       close,
//       volume: Math.floor(Math.random() * 1_000_000),
//     };
//   }
// }