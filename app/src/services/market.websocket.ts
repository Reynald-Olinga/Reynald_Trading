// src/services/market.websocket.ts
import { EventBus } from './eventBus';

class MarketWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventBus = new EventBus();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket('ws://reynaldtrading-production.up.railway.app/market'); ///market enlevé

    this.ws.onopen = () => {
      console.log('✅ WebSocket Market connecté');
      this.reconnectAttempts = 0;
      this.eventBus.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'candle' && data.timestamp) {
          this.eventBus.emit('candle', data); // ✅ envoi direct
        } else if (data.type === 'historical' && Array.isArray(data.data)) {
          this.eventBus.emit('historical', data.data);
        } else {

        }
      } catch (error) {
        console.error("❌ Parsing échoué :", error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket déconnecté');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  on(event: string, fn: (data: any) => void) {
    this.eventBus.on(event, fn);
  }

  off(event: string, fn: (data: any) => void) {
    this.eventBus.off(event, fn);
  }

  subscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  unsubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, 3000);
    }
  }
}

export default new MarketWebSocketService();