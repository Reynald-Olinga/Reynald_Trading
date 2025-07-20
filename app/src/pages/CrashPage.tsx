// src/pages/CrashPage.tsx
import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import FakeStockChart from "../components/FakeStockChart";

export default function CrashPage() {
  return (
    <Box p={6}>
      {/* Titre général */}
      <Box fontSize="3xl" fontWeight="bold" mb={6} textAlign="center">
         COURS DE MARCHÉS FINANCIERS IMPORTANTS 
      </Box>

      {/* Grille 2 colonnes */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={8}>
        {/* Crash */}
        <Box>
          <Box fontSize="2xl" fontWeight="semibold" mb={4}>
            📉 
          </Box>
          <FakeStockChart trend="crash" />
        </Box>

        {/* Boom */}
        <Box>
          <Box fontSize="2xl" fontWeight="semibold" mb={4}>
            📈 
          </Box>
          <FakeStockChart trend="boom" />
        </Box>
      </SimpleGrid>
    </Box>
  );
}