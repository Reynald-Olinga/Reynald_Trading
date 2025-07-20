// src/websocket/marketDataServer.ts
import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { StockPriceService } from '../services/stockPrice.service';
import logger from '../utils/logger';
import MarketSimulator from '../services/marketSimulator.service';

interface Candle {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MarketDataServer {
  private wss: WebSocketServer;
  private stockService = new StockPriceService();
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/market' });
    this.setupHandlers();
    console.log('📈 MarketDataServer attaché sur ws://localhost:3010/market');
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log(`🔗 Client connecté au market depuis ${req.socket.remoteAddress}`);

      ws.on('message', async (raw) => {
        try {
          console.log("📥 Message reçu du client :", raw.toString());
          const { type, symbol } = JSON.parse(raw.toString());

          if (type === 'subscribe') {
            const sym = symbol.toUpperCase();
            (ws as any).symbols = [...((ws as any).symbols || []), sym];
            this.startCandleStream(sym);
            const last = await this.stockService.getLastCandle(sym);
            ws.send(JSON.stringify({
              type: 'candle',
              ...last
            }));
            this.startSimulationStream(sym);
          }
        } catch (err) {
          console.error("❌ Erreur serveur :", err);
          ws.send(JSON.stringify({ type: 'error', error: err.message }));
        }
      });

      ws.on('close', () => {
        ((ws as any).symbols || []).forEach((s) => this.stopCandleStream(s));
        console.log('❌ Client déconnecté du market');
      });
    });
  }

  private startCandleStream(symbol: string) {
    if (this.intervals.has(symbol)) return;
    const interval = setInterval(async () => {
      try {
        const candle = await this.stockService.getLatestCandle(symbol);
        this.broadcast(symbol, candle);
      } catch (err) {
        this.broadcast(symbol, { type: 'error', error: err.message });
      }
    }, 3000);
    this.intervals.set(symbol, interval);
  }

  private stopCandleStream(symbol: string) {
    const timer = this.intervals.get(symbol);
    if (!timer) return;
    clearInterval(timer);
    this.intervals.delete(symbol);
    console.log(`🛑 Stream arrêté pour ${symbol}`);
  }

  private startSimulationStream(symbol: string) {
    if (this.intervals.has(`sim-${symbol}`)) return;

    const sim = MarketSimulator.getInstance(); // ✅ instance récupérée
    const interval = setInterval(async () => {
      try {
        const data = await sim.getSimulatedPrice(symbol);
          if (data.events.length === 0) return; // ← ignore si aucun événement actif

          this.broadcast(symbol, {
            type: 'simulated',
            timestamp: Date.now(),
            price: data.simulatedPrice,
            originalPrice: data.originalPrice,
            events: data.events
          });
      } catch (err) {
        this.broadcast(symbol, { type: 'error', error: err.message });
      }
    }, 1000);

    this.intervals.set(`sim-${symbol}`, interval);
  }

  private broadcast(symbol: string, candle: Candle) {
    this.wss.clients.forEach((ws) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (ws as any).symbols?.includes(symbol)
      ) {
        ws.send(JSON.stringify({
          type: 'candle',
          ...candle
        }));
      }
    });
  }
}




















// // src/websocket/marketDataServer.ts
// import { Server as HttpServer } from 'http';
// import { WebSocket, WebSocketServer } from 'ws';
// import { StockPriceService } from '../services/stockPrice.service';
// import logger from '../utils/logger';
// import MarketSimulator from '../services/marketSimulator.service';

// interface Candle {
//   symbol: string;
//   timestamp: number;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// export class MarketDataServer {
//   private wss: WebSocketServer;
//   private stockService = new StockPriceService();
//   private intervals = new Map<string, NodeJS.Timeout>();

//   constructor(server: HttpServer) {
//     this.wss = new WebSocketServer({ server, path: '/market' });
//     this.setupHandlers();
//     console.log('📈 MarketDataServer attaché sur ws://localhost:3010/market');
//   }

//   private setupHandlers() {
//     this.wss.on('connection', (ws: WebSocket, req) => {
//       console.log(`🔗 Client connecté au market depuis ${req.socket.remoteAddress}`);

//       ws.on('message', async (raw) => {
//         try {
//           console.log("📥 Message reçu du client :", raw.toString());
//           const { type, symbol } = JSON.parse(raw.toString());

//           if (type === 'subscribe') {
//             const sym = symbol.toUpperCase();
//             (ws as any).symbols = [...((ws as any).symbols || []), sym];
//             this.startCandleStream(sym);
//             const last = await this.stockService.getLastCandle(sym);
//             ws.send(JSON.stringify({
//               type: 'candle',
//               ...last
//             }));
//             this.startSimulationStream(sym);
//           }
//         } catch (err) {
//           console.error("❌ Erreur serveur :", err);
//           ws.send(JSON.stringify({ type: 'error', error: err.message }));
//         }
//       });

//       ws.on('close', () => {
//         ((ws as any).symbols || []).forEach((s) => this.stopCandleStream(s));
//         console.log('❌ Client déconnecté du market');
//       });
//     });
//   }

//   private startCandleStream(symbol: string) {
//     if (this.intervals.has(symbol)) return;
//     const interval = setInterval(async () => {
//       try {
//         const candle = await this.stockService.getLatestCandle(symbol);
//         this.broadcast(symbol, candle);
//       } catch (err) {
//         this.broadcast(symbol, { type: 'error', error: err.message });
//       }
//     }, 30_000);
//     this.intervals.set(symbol, interval);
//   }

//   private stopCandleStream(symbol: string) {
//     const timer = this.intervals.get(symbol);
//     if (!timer) return;
//     clearInterval(timer);
//     this.intervals.delete(symbol);
//     console.log(`🛑 Stream arrêté pour ${symbol}`);
//   }


//   private startSimulationStream(symbol: string) {
//   if (this.intervals.has(`sim-${symbol}`)) return;

//   const sim = MarketSimulator.getInstance().simulateMarketCrash(); 
//   const interval = setInterval(async () => {
//     try {
//       const data = await sim.getSimulatedPrice(symbol);
//       this.broadcast(symbol, {
//         type: 'simulated',
//         timestamp: Date.now(),
//         price: data.simulatedPrice,
//         originalPrice: data.originalPrice,
//         events: data.events
//       });
//     } catch (err) {
//       this.broadcast(symbol, { type: 'error', error: err.message });
//     }
//   }, 1000); // toutes les 1s

//   this.intervals.set(`sim-${symbol}`, interval);
// }



//   private broadcast(symbol: string, candle: Candle) {
//     this.wss.clients.forEach((ws) => {
//       if (
//         ws.readyState === WebSocket.OPEN &&
//         (ws as any).symbols?.includes(symbol)
//       ) {
//         ws.send(JSON.stringify({
//           type: 'candle',
//           ...candle
//         }));
//       }
//     });
//   }
// }