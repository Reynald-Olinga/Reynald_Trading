// client/src/pages/ChatPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Flex,
  Card,
  CardBody,
  Badge,
  Avatar,
  Heading,
  Divider,
  useToast
} from '@chakra-ui/react';
import { io, Socket } from 'socket.io-client';
import tokens from '../services/tokens.service';

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
}

interface ConnectedUser {
  username: string;
  socketId: string;
}

const ChatPage: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const username = tokens.getUsername();

  useEffect(() => {
    if (!username) {
      toast({
        title: "Authentification requise",
        description: "Veuillez vous connecter pour accéder au chat",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Connexion WebSocket
    const newSocket = io('http://localhost:3010', {
      auth: {
        token: tokens.getToken()
      }
    });

    // Événements Socket
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('authenticate', tokens.getToken());
    });

    newSocket.on('authenticated', (data) => {
      toast({
        title: "Connecté au chat",
        description: `Bienvenue ${data.username}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    });

    newSocket.on('newMessage', (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('userJoined', (data) => {
      toast({
        title: `${data.username} a rejoint le chat`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    });

    newSocket.on('userLeft', (data) => {
      toast({
        title: `${data.username} a quitté le chat`,
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [username, toast]);

  const sendMessage = () => {
    if (socket && message.trim() && isConnected) {
      socket.emit('sendMessage', { text: message.trim() });
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  if (!username) {
    return (
      <Box p={8}>
        <Text>Veuillez vous connecter pour accéder au chat</Text>
      </Box>
    );
  }

  return (
    <Box maxW="800px" mx="auto" p={4} h="calc(100vh - 100px)">
      <VStack h="100%" spacing={4} align="stretch">
        {/* Header */}
        <Card>
          <CardBody>
            <HStack justify="space-between">
              <Heading size="md">Chat en temps réel</Heading>
              <Badge colorScheme={isConnected ? "green" : "red"}>
                {isConnected ? "En ligne" : "Hors ligne"}
              </Badge>
            </HStack>
          </CardBody>
        </Card>

        {/* Messages */}
        <Box flex="1" overflowY="auto">
          <VStack align="stretch" spacing={2}>
            {messages.map((msg) => (
              <Box key={msg.id} p={2}>
                <HStack align="start">
                  <Avatar size="sm" name={msg.username} />
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="blue.500">
                      {msg.username}
                    </Text>
                    <Text>{msg.text}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </VStack>
        </Box>

        {/* Input */}
        <Card>
          <CardBody>
            <HStack spacing={4}>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                disabled={!isConnected}
              />
              <Button
                onClick={sendMessage}
                disabled={!isConnected || !message.trim()}
                colorScheme="blue"
              >
                Envoyer
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default ChatPage;