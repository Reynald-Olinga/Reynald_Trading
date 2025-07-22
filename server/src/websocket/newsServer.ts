import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export default function attachNewsServer(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: 'https://tradingrey.netlify.app/', credentials: true },
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