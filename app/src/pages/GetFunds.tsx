import React, { useState, useEffect } from 'react';
import { 
  Box,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Text,
  useToast,
  Heading,
  Spinner
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';

export default function GetFunds() {
  const [amount, setAmount] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const username = localStorage.getItem('username');
      const jwt = localStorage.getItem('jwt');
      
      if (!username || !jwt) {
        navigate('/login');
        return;
      }

      try {
        const response = await api.get('/user/buying-power', {
          headers: { Authorization: `Bearer ${jwt}` }
        });
        setBalance(response.data.buyingPower || 0);
      } catch (error) {
        console.error("Error loading balance", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [navigate]);

  const handleAddFunds = async (customAmount?: number) => {
    const finalAmount = customAmount || amount;
    const username = localStorage.getItem('username');
    const jwt = localStorage.getItem('jwt');
    
    if (!username || !jwt) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/account/add-funds', {
        username,
        amount: finalAmount
      }, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      setBalance(response.data.newBalance);
      toast({
        title: "Succès",
        description: `$${finalAmount} ajoutés à votre compte`,
        status: "success",
        duration: 5000,
        isClosable: true,
        onCloseComplete: () => navigate("/")
      });
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.error || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={6} maxWidth="500px" margin="0 auto">
      <Heading mb={6} size="lg">Ajouter des fonds</Heading>
      
      <VStack spacing={6} align="stretch">
        <Box p={4} borderWidth="1px" borderRadius="lg">
          <Text fontWeight="bold">Solde actuel: ${balance.toFixed(2)}</Text>
        </Box>

        <Text fontSize="lg" fontWeight="semibold">Montant à ajouter:</Text>
        
        <HStack spacing={3} wrap="wrap">
          {[50, 100, 500, 1000].map((amt) => (
            <Button
              key={amt}
              id={`amount-btn-${amt}`}
              name={`amount-${amt}`}
              onClick={() => handleAddFunds(amt)}
              isLoading={isLoading}
              flex="1"
              minWidth="100px"
              colorScheme="blue"
            >
              +${amt}
            </Button>
          ))}
        </HStack>

        <Text textAlign="center">ou</Text>

        <NumberInput
          value={amount}
          min={10}
          max={1000000000000}
          onChange={(valueString) => setAmount(parseFloat(valueString) || 0)}
        >
          <NumberInputField 
            id="transaction-amount"
            name="transactionAmount"
            //autoComplete="transaction-amount"
          />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>

        <Button
          id="confirm-button"
          name="confirmButton"
          onClick={() => handleAddFunds()}
          isLoading={isLoading}
          colorScheme="green"
          size="lg"
        >
          Confirmer l'ajout
        </Button>
      </VStack>
    </Box>
  );
}
