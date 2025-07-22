import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model';

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
}

interface ChatUser {
  id: string;
  username: string;
  socketId: string;
}

export class ChatServer {
  private io: Server;
  private connectedUsers = new Map<string, ChatUser>();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: ['ws://tradingrey.netlify.app', 'ws://react-frontend-production-eae6.up.railway.app'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🟢 Client connecté: ${socket.id}`);

      // Authentification
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
          const user = await UserModel.findById(decoded.userId);
          
          if (user) {
            const chatUser: ChatUser = {
              id: user._id.toString(),
              username: user.username,
              socketId: socket.id
            };
            
            this.connectedUsers.set(socket.id, chatUser);
            socket.join('general');
            
            socket.broadcast.emit('userJoined', {
              username: user.username,
              timestamp: new Date()
            });

            socket.emit('authenticated', { 
              username: user.username
            });

            console.log(`✅ ${user.username} authentifié`);
          }
        } catch (error) {
          socket.emit('error', { message: 'Authentification échouée' });
          socket.disconnect();
        }
      });

      // Messages
      socket.on('sendMessage', (data: { text: string }) => {
        const user = this.connectedUsers.get(socket.id);
        console.log('📨 Message received:', { user: user?.username, text: data.text });
        
        if (!user) {
          console.log('❌ No authenticated user for socket:', socket.id);
          return;
        }

        const message: Message = {
          id: socket.id + Date.now(),
          username: user.username,
          text: data.text,
          timestamp: new Date()
        };

        this.io.to('general').emit('newMessage', message);
      });

      // Recevoir la news et la diffuser
      socket.on('news-trigger', ({ id }) => {
        this.io.to('general').emit('global-news', { id });
      });

      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          this.connectedUsers.delete(socket.id);
          socket.broadcast.emit('userLeft', {
            username: user.username,
            timestamp: new Date()
          });
        }
        console.log(`🔴 Client déconnecté: ${socket.id}`);
      });

    });
  }
}

export function broadcast(io: Server, event: string, payload: any) {
  io.emit(event, payload);
}