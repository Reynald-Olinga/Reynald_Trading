import React, { useState } from "react";
import {
  Box,
  Button,
  NumberInput,
  NumberInputField,
  HStack,
  Text,
  useToast
} from "@chakra-ui/react";

export default function AddFunds({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [amount, setAmount] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleAddFunds = async (customAmount?: number) => {
    setIsLoading(true);
    try {
      const finalAmount = customAmount || amount;
      const response = await fetch("/api/account/add-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: finalAmount })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      console.log(response.json);
      

      toast({
        title: "Success",
        description: `$${finalAmount} added to your account`,
        status: "success"
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Text mb={4} fontWeight="bold">Add Funds</Text>
      
      {/* Boutons rapides */}
      <HStack mb={4}>
        {[50, 100, 500].map((amt) => (
          <Button 
            key={amt} 
            onClick={() => handleAddFunds(amt)}
            isLoading={isLoading}
          >
            +${amt}
          </Button>
        ))}
      </HStack>

      {/* Formulaire personnalisé */}
      <HStack>
        <NumberInput
          min={10}
          max={10000}
          value={amount}
          onChange={(value) => setAmount(parseFloat(value))}
          width="150px"
        >
          <NumberInputField />
        </NumberInput>
        <Button 
          onClick={() => handleAddFunds()}
          isLoading={isLoading}
          colorScheme="green"
        >
          Add
        </Button>
      </HStack>
    </Box>
  );
}