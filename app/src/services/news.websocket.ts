import { io } from 'socket.io-client';
export default io('https://reynaldtrading-production.up.railway.app', {
  transports: ['websocket', 'polling'],  // fallback
  withCredentials: true,
});