import React, { useState } from 'react';
import {
  Box, Button, VStack, HStack, Text, Card, CardHeader, CardBody, Badge, Select, useToast
} from '@chakra-ui/react';
import api from '../services/api.service';

const MarketSimulator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedPrices, setSimulatedPrices] = useState({});
  const toast = useToast();

  const simulateEvent = async (type: string) => {
    setIsLoading(true);
    try {
      await api.post('/events/simulate', { type });
      
      toast({
        title: '🎯 Événement simulé!',
        description: `Simulation ${type} lancée`,
        status: 'success',
        duration: 3000
      });

      // Rafraîchir les prix
      refreshPrices();
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de simuler l\'événement',
        status: 'error',
        duration: 3000
      });
    }
    setIsLoading(false);
  };

  const refreshPrices = async () => {
    const symbols = ['NVDA', 'AAPL', 'TSLA', 'MSFT'];
    const newPrices = {};
    
    for (const symbol of symbols) {
      try {
        const response = await api.get(`/events/prices/${symbol}`);
        newPrices[symbol] = response.data;
      } catch {}
    }
    
    setSimulatedPrices(newPrices);
  };

  return (
    <Box p={4}>
      <Card>
        <CardHeader>
          <Text fontSize="xl" fontWeight="bold">🎮 Simulateur de Marché</Text>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} wrap="wrap">
              <Button 
                colorScheme="red" 
                onClick={() => simulateEvent('crash')}
                isLoading={isLoading}
              >
                💥 Crash Tech
              </Button>
              <Button 
                colorScheme="green" 
                onClick={() => simulateEvent('boom')}
                isLoading={isLoading}
              >
                🚀 Boom Tech
              </Button>
              <Button 
                colorScheme="purple" 
                onClick={refreshPrices}
                isLoading={isLoading}
              >
                🔄 Rafraîchir Prix
              </Button>
            </HStack>

            {Object.entries(simulatedPrices).map(([symbol, data]) => (
              <HStack key={symbol} justify="space-between" p={2} border="1px" borderRadius="md">
                <Text fontWeight="bold">{symbol}</Text>
                <VStack align="end" spacing={0}>
                  <Text fontSize="sm" color="gray.600">
                    Original: ${data.originalPrice?.toFixed(2)}
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    Simulé: ${data.simulatedPrice?.toFixed(2)}
                  </Text>
                  <Badge colorScheme={data.simulatedPrice > data.originalPrice ? "green" : "red"}>
                    {((data.simulatedPrice / data.originalPrice - 1) * 100).toFixed(1)}%
                  </Badge>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default MarketSimulator;