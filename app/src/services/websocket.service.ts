// src/services/websocket.service.ts
import { io, Socket } from "socket.io-client";

const WS_URL = "ws://reynaldtrading-production.up.railway.app/market";           /// market enlevé

export interface Candle {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class WebSocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(WS_URL, { transports: ["websocket"] });
    this.socket.on("connect", () => console.log("📡 WebSocket connecté"));
    this.socket.on("disconnect", () => console.log("📡 WebSocket déconnecté"));
  }

  subscribe(symbol: string) {
    if (!this.socket) throw new Error("WebSocket non connecté");
    this.socket.emit("subscribe", symbol.toUpperCase());
  }

  unsubscribe(symbol: string) {
    if (!this.socket) return;
    this.socket.emit("unsubscribe", symbol.toUpperCase());
  }

  onCandle(callback: (candle: Candle) => void) {
    if (!this.socket) throw new Error("WebSocket non connecté");
    this.socket.on("candle", callback);
  }

  onError(callback: (err: any) => void) {
    if (!this.socket) return;
    this.socket.on("error", callback);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new WebSocketService();