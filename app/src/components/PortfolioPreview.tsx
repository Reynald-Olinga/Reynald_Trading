import React, { useState, useEffect } from "react";
import {
    Box,
    Flex,
    Heading,
    Spacer,
    Spinner,
    Text,
    useToast,
} from "@chakra-ui/react";
import accounts from "../services/accounts.service";
import tokens from "../services/tokens.service";
import { useNavigate } from "react-router-dom";

const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

function PortfolioPreview({ buyingPower, loading }) {
    const [portfolioValue, setPortfolioValue] = useState(-1);
    const [prevCloseValue, setPrevCloseValue] = useState(0.0);
    const [investedAmount, setInvestedAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const toast = useToast();
    const navigate = useNavigate();

    const fetchPortfolio = async () => {
        console.log("Début du chargement du portfolio");
        setIsLoading(true);
        
        try {
            const portfolioData = await accounts.getPortfolio();
            console.log("Données complètes reçues:", portfolioData);

            const invested = portfolioData.positions.reduce((sum, pos) => {
                console.log(`Calcul position: ${pos.symbol} - ${pos.quantity} @ ${pos.purchasePrice}`);
                return sum + (pos.quantity * pos.purchasePrice);
            }, 0);

            console.log("Montant investi calculé:", invested);

            setPortfolioValue(portfolioData.portfolioValue);
            setPrevCloseValue(portfolioData.portfolioPrevCloseValue);
            setInvestedAmount(invested);
        } catch (err) {
            console.error("Erreur complète:", {
                error: err,
                response: err.response?.data
            });
            
            if (err.response && err.response.status === 401) {
                tokens.clearToken();
                toast({
                    title: "You are not logged in! Redirecting to login...",
                    status: "error",
                    isClosable: true,
                });
                navigate("/login");
            } else {
                console.error("Error fetching portfolio:", err);
                toast({
                    title: "Error loading portfolio data",
                    status: "error",
                    isClosable: true,
                });
            }
        } finally {
            setIsLoading(false);
            console.log("Chargement du portfolio terminé");
        }
    };

    useEffect(() => {
        fetchPortfolio();

        const handleUpdate = () => fetchPortfolio();
        window.addEventListener('portfolio-updated', handleUpdate);

        return () => {
            window.removeEventListener('portfolio-updated', handleUpdate);
        };
    }, []);

    return (
        <Flex className="PortfolioPreview">
            <Box flex="0.5">
                {isLoading ? (
                    <Spinner size={"lg"} />
                ) : (
                    <>
                        <Heading as="h4" size="sm" color="gray.500" fontWeight="600">
                            Total Investment
                        </Heading>
                        <Spacer h="1" />
                        <Heading as="h2" size="xl">
                            {formatter.format(investedAmount)}
                        </Heading>
                    </>
                )}
                {portfolioValue > 0 ? (
                    <Heading
                        as="h2"
                        size="md"
                        color={portfolioValue > prevCloseValue ? "green.500" : "red.500"}
                    >
                        {portfolioValue > prevCloseValue ? "▲" : "▼"}
                        <Text as="span" fontWeight="800" px="1">
                            {formatter.format(portfolioValue - prevCloseValue)}
                        </Text>
                        <Text as="span" fontWeight="500">
                            (
                            {(
                                100 *
                                ((portfolioValue - prevCloseValue) / prevCloseValue)
                            ).toFixed(
                                Math.abs(
                                    100 * ((portfolioValue - prevCloseValue) / prevCloseValue),
                                ) < 0.01
                                    ? 4
                                    : 2,
                            )}
                            %){" "}
                        </Text>
                    </Heading>
                ) : (
                    <Heading as="h2" size="md" fontWeight="normal">
                        Make some trades to get started!
                    </Heading>
                )}
            </Box>
            <Box flex="0.5">
                {loading ? (
                    <Spinner size={"lg"} />
                ) : (
                    <>
                        <Heading as="h4" size="sm" color="gray.500" fontWeight="600">
                            Cash (Buying Power)
                        </Heading>
                        <Spacer h="1" />
                        <Heading as="h2" size="xl">
                            {formatter.format(buyingPower)}
                        </Heading>
                    </>
                )}
            </Box>
        </Flex>
    );
}

export default PortfolioPreview;







// import React, { useState, useEffect } from "react";
// import {
//     Box,
//     Flex,
//     Heading,
//     Spacer,
//     Spinner,
//     Text,
//     useToast,
// } from "@chakra-ui/react";
// import accounts from "../services/accounts.service";
// import tokens from "../services/tokens.service";
// import { useNavigate } from "react-router-dom";

// const formatter = new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
// });

// function PortfolioPreview({ buyingPower, loading }) {
//     const [portfolioValue, setPortfolioValue] = useState(-1);
//     const [prevCloseValue, setPrevCloseValue] = useState(0.0);
//     const [investedAmount, setInvestedAmount] = useState(0);
//     const [isLoading, setIsLoading] = useState(true);

//     const toast = useToast();
//     const navigate = useNavigate();

//     const fetchPortfolio = async () => {
//         console.log("Début du chargement du portfolio");
//         setIsLoading(true);
        
//         try {
//             const portfolioData = await accounts.getPortfolio();
//             console.log("Données complètes reçues:", portfolioData);

//             const invested = portfolioData.positions.reduce((sum, pos) => {
//             console.log(`Calcul position: ${pos.symbol} - ${pos.quantity} @ ${pos.purchasePrice}`);
//             return sum + (pos.quantity * pos.purchasePrice);
//             }, 0);

//             console.log("Montant investi calculé:", invested);

//             setPortfolioValue(portfolioData.portfolioValue);
//             setPrevCloseValue(portfolioData.portfolioPrevCloseValue);
//             setInvestedAmount(invested);
//         } catch (err: any) {
//             console.error("Erreur complète:", {
//             error: err,
//             response: err.response?.data
//             });
            
//             if (err.response && err.response.status === 401) {
//             tokens.clearToken();
//             toast({
//                 title: "You are not logged in! Redirecting to login...",
//                 status: "error",
//                 isClosable: true,
//             });
//             navigate("/login");
//             } else {
//             console.error("Error fetching portfolio:", err);
//             toast({
//                 title: "Error loading portfolio data",
//                 status: "error",
//                 isClosable: true,
//             });
//             }
//         } finally {
//             setIsLoading(false);
//             console.log("Chargement du portfolio terminé");
//         }
//         };

//     useEffect(() => {
//         fetchPortfolio();

//         const handleFundsAdded = () => fetchPortfolio();
//         window.addEventListener('fundsAdded', handleFundsAdded);

//         return () => {
//             window.removeEventListener('fundsAdded', handleFundsAdded);
//         };
//     }, []);

//     return (
//         <Flex className="PortfolioPreview">
//             <Box flex="0.5">
//                 {isLoading ? (
//                     <Spinner size={"lg"} />
//                 ) : (
//                     <>
//                         <Heading as="h4" size="sm" color="gray.500" fontWeight="600">
//                             Total Investment
//                         </Heading>
//                         <Spacer h="1" />
//                         <Heading as="h2" size="xl">
//                             {formatter.format(investedAmount)}
//                         </Heading>
//                     </>
//                 )}
//                 {portfolioValue > 0 ? (
//                     <Heading
//                         as="h2"
//                         size="md"
//                         color={portfolioValue > prevCloseValue ? "green.500" : "red.500"}
//                     >
//                         {portfolioValue > prevCloseValue ? "▲" : "▼"}
//                         <Text as="span" fontWeight="800" px="1">
//                             {formatter.format(portfolioValue - prevCloseValue)}
//                         </Text>
//                         <Text as="span" fontWeight="500">
//                             (
//                             {(
//                                 100 *
//                                 ((portfolioValue - prevCloseValue) / prevCloseValue)
//                             ).toFixed(
//                                 Math.abs(
//                                     100 * ((portfolioValue - prevCloseValue) / prevCloseValue),
//                                 ) < 0.01
//                                     ? 4
//                                     : 2,
//                             )}
//                             %){" "}
//                         </Text>
//                     </Heading>
//                 ) : (
//                     <Heading as="h2" size="md" fontWeight="normal">
//                         Make some trades to get started!
//                     </Heading>
//                 )}
//             </Box>
//             <Box flex="0.5">
//                 {loading ? (
//                     <Spinner size={"lg"} />
//                 ) : (
//                     <>
//                         <Heading as="h4" size="sm" color="gray.500" fontWeight="600">
//                             Cash (Buying Power)
//                         </Heading>
//                         <Spacer h="1" />
//                         <Heading as="h2" size="xl">
//                             {formatter.format(buyingPower)}
//                         </Heading>
//                     </>
//                 )}
//             </Box>
//         </Flex>
//     );
// }

// export default PortfolioPreview;




