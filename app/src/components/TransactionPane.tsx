import React, { useEffect, useState } from "react";
import accounts from "../services/accounts.service";
import {
  Text,
  useToast,
  Tabs,
  TabList,
  Tab,
  Stack,
  HStack,
  Spacer,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  TabPanels,
  TabPanel,
  Button,
  Center,
} from "@chakra-ui/react";
import { useLocation } from "react-router-dom";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function TransactionPane(props: { symbol: string; price: number }) {
  const [shares, setShares] = useState(1);
  const [buyingPower, setBuyingPower] = useState(0);
  const [availableShares, setAvailableShares] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const location = useLocation();
  const toast = useToast();

  // const submitTransaction = async (symbol: string, quantity: number, isBuy: boolean) => {
  //   setIsLoading(true);
    
  //   try {
  //     const response = await accounts.makeTransaction(symbol, quantity, isBuy ? "buy" : "sell");
      
  //     if (response.newCash !== undefined) {
  //       setBuyingPower(response.newCash);
  //     }
      
  //     const [freshBalance, freshShares] = await Promise.all([
  //       accounts.getBuyingPower(),
  //       accounts.getAvailableShares(symbol)
  //     ]);
      
  //     setBuyingPower(freshBalance);
  //     setAvailableShares(freshShares);

  //     window.dispatchEvent(new CustomEvent('portfolio-updated'));

  //     toast({
  //       title: "Succès",
  //       description: response.message || `Transaction ${isBuy ? 'achat' : 'vente'} réussie`,
  //       status: "success",
  //       duration: 2000,
  //       isClosable: true
  //     });

  //   } catch (error) {
  //     toast({
  //       title: "Erreur",
  //       description: error.message,
  //       status: "error",
  //       duration: 3000,
  //       isClosable: true
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  const submitTransaction = async (symbol: string, quantity: number, isBuy: boolean) => {
  setIsLoading(true);
  
  try {
    const response = await accounts.makeTransaction(symbol, quantity, isBuy ? "buy" : "sell");
    
    // Forcer un rafraîchissement complet
    const [updatedPortfolio, freshBalance, freshShares] = await Promise.all([
      accounts.getPortfolio(),
      accounts.getBuyingPower(),
      accounts.getAvailableShares(symbol)
    ]);

    setBuyingPower(freshBalance);
    setAvailableShares(freshShares);

    // Émettre deux événements différents pour plus de fiabilité
    window.dispatchEvent(new CustomEvent('portfolio-updated'));
    window.dispatchEvent(new CustomEvent('positions-updated'));

    toast({
      title: "Success",
      description: response.message || `Transaction ${isBuy ? 'buy' : 'sell'} completed`,
      status: "success",
      duration: 2000,
      isClosable: true
    });

  } catch (error: any) {
    console.error("Transaction error details:", {
      message: error.message,
      response: error.response?.data
    });

    toast({
      title: "Error",
      description: error.message || "Transaction failed",
      status: "error",
      duration: 3000,
      isClosable: true
    });
  } finally {
    setIsLoading(false);
  }
};



  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [power, shares] = await Promise.all([
          accounts.getBuyingPower(),
          accounts.getAvailableShares(props.symbol)
        ]);

        if (!isMounted) return;

        setBuyingPower(power);
        setAvailableShares(shares);
      } catch (error) {
        console.error("Error loading account data:", error);
        if (isMounted) {
          toast({
            title: "Error loading account data",
            description: error.message,
            status: "error",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [props.symbol, toast]);

  return (
    <>
      <Tabs>
        <TabList>
          <Tab>Buy {props.symbol}</Tab>
          <Tab>Sell {props.symbol}</Tab>
        </TabList>

        <Stack p="5">
          <HStack>
            <Text>Shares</Text>
            <Spacer />
            <NumberInput
              defaultValue={1}
              min={1}
              width="20"
              onChange={(valueString) => setShares(parseInt(valueString) || 1)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
          <HStack>
            <Text>Current Price</Text>
            <Spacer />
            <Text>{formatter.format(props.price)}</Text>
          </HStack>
          <Spacer />
          <Divider />
          <Spacer />
          <HStack fontWeight="bold">
            <Text>Estimated Total</Text>
            <Spacer />
            <Text>{formatter.format(props.price * shares)}</Text>
          </HStack>
        </Stack>

        <TabPanels>
          <TabPanel>
            <Button
              size="lg"
              width="100%"
              onClick={() => submitTransaction(props.symbol, shares, true)}
              isLoading={isLoading}
              isDisabled={props.price * shares > buyingPower}
            >
              Buy
            </Button>
            <Center mt={3} flexDirection="column">
              <Text fontWeight="bold" fontSize="sm">
                {formatter.format(buyingPower)} Buying Power Available
              </Text>
              {props.price * shares > buyingPower && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  Insufficient funds for this purchase
                </Text>
              )}
            </Center>
          </TabPanel>
          
          <TabPanel>
            <Button
              size="lg"
              width="100%"
              onClick={() => submitTransaction(props.symbol, shares, false)}
              isLoading={isLoading}
              isDisabled={availableShares === 0 || shares > availableShares}
            >
              Sell
            </Button>
            <Center mt={3} flexDirection="column">
              <Text fontWeight="bold" fontSize="sm">
                {availableShares} Shares Available
              </Text>
              {availableShares === 0 ? (
                <Text color="red.500" fontSize="xs" mt={1}>
                  You don't own any shares to sell
                </Text>
              ) : shares > availableShares && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  You only own {availableShares} shares
                </Text>
              )}
            </Center>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}

export default TransactionPane;




// import React, { useEffect, useState } from "react";
// import accounts from "../services/accounts.service";
// import {
//   Text,
//   useToast,
//   Tabs,
//   TabList,
//   Tab,
//   Stack,
//   HStack,
//   Spacer,
//   NumberInput,
//   NumberInputField,
//   NumberInputStepper,
//   NumberIncrementStepper,
//   NumberDecrementStepper,
//   Divider,
//   TabPanels,
//   TabPanel,
//   Button,
//   Center,
// } from "@chakra-ui/react";
// import { useLocation } from "react-router-dom";


// const formatter = new Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
// });

// function TransactionPane(props: { symbol: string; price: number }) {
//   const [shares, setShares] = useState(1);
//   const [buyingPower, setBuyingPower] = useState(0);
//   const [availableShares, setAvailableShares] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);

//   const location = useLocation();
//   const toast = useToast();


//   const submitTransaction = async (symbol: string, quantity: number, isBuy: boolean) => {
//   setIsLoading(true);
  
//     try {
//       // 1. Exécuter la transaction
//       const response = await accounts.makeTransaction(symbol, quantity, isBuy ? "buy" : "sell");
      
//       // 2. Mettre à jour l'UI immédiatement avec les valeurs de réponse
//       if (response.newCash !== undefined) {
//         setBuyingPower(response.newCash);
//       }
      
//       // 3. Forcer le rafraîchissement des données (solution de repli)
//       const [freshBalance, freshShares] = await Promise.all([
//         accounts.getBuyingPower(),
//         accounts.getAvailableShares(symbol)
//       ]);
      
//       setBuyingPower(freshBalance);
//       setAvailableShares(freshShares);

//       // 4. Feedback utilisateur
//       toast({
//         title: "Succès",
//         description: response.message || `Transaction ${isBuy ? 'achat' : 'vente'} réussie`,
//         status: "success",
//         duration: 2000,
//         isClosable: true
//       });

//     } catch (error) {
//       toast({
//         title: "Erreur",
//         description: error.message,
//         status: "error",
//         duration: 3000,
//         isClosable: true
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };


//   // Après chaque vente
//   const refreshPortfolio = async () => {
//     const freshData = await accounts.getPortfolio();
//     setPortfolio(freshData.positions); // Mise à jour du state
//   };

//   useEffect(() => {
//     let isMounted = true;

//     const loadData = async () => {
//       setIsLoading(true);
//       try {
//         const [power, shares] = await Promise.all([
//           accounts.getBuyingPower(),
//           accounts.getAvailableShares(props.symbol)
//         ]);

//         if (!isMounted) return;

//         setBuyingPower(power);
//         setAvailableShares(shares);
//       } catch (error) {
//         console.error("Error loading account data:", error);
//         if (isMounted) {
//           toast({
//             title: "Error loading account data",
//             description: error.message,
//             status: "error",
//           });
//         }
//       } finally {
//         if (isMounted) {
//           setIsLoading(false);
//         }
//       }
//     };

//     loadData();

//     return () => {
//       isMounted = false;
//     };
//   }, [props.symbol, toast]);

//   return (
//     <>
//       <Tabs>
//         <TabList>
//           <Tab>Buy {props.symbol}</Tab>
//           <Tab>Sell {props.symbol}</Tab>
//         </TabList>

//         <Stack p="5">
//           <HStack>
//             <Text>Shares</Text>
//             <Spacer />
//             <NumberInput
//               defaultValue={1}
//               min={1}
//               width="20"
//               onChange={(valueString) => setShares(parseInt(valueString) || 1)}
//             >
//               <NumberInputField />
//               <NumberInputStepper>
//                 <NumberIncrementStepper />
//                 <NumberDecrementStepper />
//               </NumberInputStepper>
//             </NumberInput>
//           </HStack>
//           <HStack>
//             <Text>Current Price</Text>
//             <Spacer />
//             <Text>{formatter.format(props.price)}</Text>
//           </HStack>
//           <Spacer />
//           <Divider />
//           <Spacer />
//           <HStack fontWeight="bold">
//             <Text>Estimated Total</Text>
//             <Spacer />
//             <Text>{formatter.format(props.price * shares)}</Text>
//           </HStack>
//         </Stack>

//         <TabPanels>
//           <TabPanel>
//             <Button
//               size="lg"
//               width="100%"
//               onClick={() => submitTransaction(props.symbol, shares, true)}
//               isLoading={isLoading}
//               isDisabled={props.price * shares > buyingPower}
//             >
//               Buy
//             </Button>
//             <Center mt={3} flexDirection="column">
//               <Text fontWeight="bold" fontSize="sm">
//                 {formatter.format(buyingPower)} Buying Power Available
//               </Text>
//               {props.price * shares > buyingPower && (
//                 <Text color="red.500" fontSize="xs" mt={1}>
//                   Insufficient funds for this purchase
//                 </Text>
//               )}
//             </Center>
//           </TabPanel>
          
//           <TabPanel>
//             <Button
//               size="lg"
//               width="100%"
//               onClick={() => submitTransaction(props.symbol, shares, false)}
//               isLoading={isLoading}
//               isDisabled={availableShares === 0 || shares > availableShares}
//             >
//               Sell
//             </Button>
//             <Center mt={3} flexDirection="column">
//               <Text fontWeight="bold" fontSize="sm">
//                 {availableShares} Shares Available
//               </Text>
//               {availableShares === 0 ? (
//                 <Text color="red.500" fontSize="xs" mt={1}>
//                   You don't own any shares to sell
//                 </Text>
//               ) : shares > availableShares && (
//                 <Text color="red.500" fontSize="xs" mt={1}>
//                   You only own {availableShares} shares
//                 </Text>
//               )}
//             </Center>
//           </TabPanel>
//         </TabPanels>
//       </Tabs>
//     </>
//   );
// }

// export default TransactionPane;






