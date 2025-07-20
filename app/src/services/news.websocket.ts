import { io } from 'socket.io-client';
export default io('http://localhost:3010', {
  transports: ['websocket', 'polling'],  // fallback
  withCredentials: true,
});