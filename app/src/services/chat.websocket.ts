// src/services/chat.websocket.ts
console.log('📡 Chat WebSocket service chargé');
import { io, Socket } from 'socket.io-client';
import tokens from './tokens.service';

const socket: Socket = io('wss://reynaldtrading-production.up.railway.app', {
  auth: { token: tokens.getToken?.() },
  transports: ['polling','websocket']
});


// ✅ Wait for connection + add error handling
socket.on('connect', () => {
  console.log('✅ Socket connected, authenticating...');
  const token = tokens.getToken?.();
  if (token) {
    socket.emit('authenticate', token);
  } else {
    console.error('❌ No token found');
  }
});

// Add error listener
socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

export default {
  on: (event: string, cb: any) => socket.on(event, cb),
  off: (event: string, cb: any) => socket.off(event, cb),
  emit: (event: string, payload?: any) => socket.emit(event, payload)
};