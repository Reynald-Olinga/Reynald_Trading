import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export default function attachNewsServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
  origin: ['https://tradingrey.netlify.app', 'https://react-frontend-production-eae6.up.railway.app'],
  credentials: true,
  allowMethods: "GET, POST, PUT, DELETE, OPTIONS",
},
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket.IO news client connecté', socket.id);

    socket.on('news-trigger', ({ id }) => {
      console.log('📢 Diffusion news', id);
      io.emit('global-news', { id });
    });
  });

  return io;
}