import React, { useEffect, useState } from "react";
import accounts from "../services/accounts.service";
import { Position } from "../App";
import {
  Tag,
  Text,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Stack,
  StackDivider,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";

const format = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format;

function PositionsList() {
  const [isLoading, setIsLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    console.log("Initialisation PositionsList");
    
    const fetchData = async () => {
      try {
        console.log("Début du chargement des positions...");
        const { positions } = await accounts.getPortfolio();
        
        console.log("Positions reçues dans le composant:", positions);
        
        if (positions.length > 0) {
          console.log("Première position analysée:", {
            symbol: positions[0].symbol,
            quantity: positions[0].quantity,
            price: positions[0].purchasePrice
          });
        }
        
        setPositions(positions);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('portfolio-updated', handleUpdate);
    return () => window.removeEventListener('portfolio-updated', handleUpdate);
  }, []);

  return (
    <Card>
      <CardHeader>
        <Heading size="md">My Portfolio</Heading>
      </CardHeader>

      <CardBody pt="0">
        {isLoading ? (
          <Spinner size={"lg"} />
        ) : (
          <Stack divider={<StackDivider />} spacing="4">
            {positions.map((position) => {
              const marketChangePercent = position.regularMarketChangePercent || 0;
              const marketPrice = position.regularMarketPrice || 0;
              const purchasePrice = position.purchasePrice || 0;
              
              return (
                <Flex
                  justifyItems="space-between"
                  gap={4}
                  key={position.purchaseDate?.toString() || position.symbol}
                  as={Link}
                  to={"/stocks/" + position.symbol}
                >
                  <Stack flex="0.33">
                    <Heading size="xs" textTransform="uppercase">
                      {position.symbol}
                    </Heading>
                    <Text fontSize="sm">
                      {position.quantity || 0} share
                      {position.quantity === 1 ? "" : "s"}
                    </Text>
                  </Stack>
                  <Stack flex="0.33">
                    <Heading
                      fontSize="sm"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Gain/Loss
                    </Heading>
                    <Text fontSize="sm" fontWeight="500">
                      {format(
                        (marketPrice - purchasePrice) * (position.quantity || 0)
                      )}
                    </Text>
                  </Stack>
                  <Stack flex="0.33" alignItems={"end"}>
                    <Heading size="xs" textTransform="uppercase">
                      <Text fontSize="sm">
                        {format(marketPrice)}
                      </Text>
                    </Heading>
                    <Tag
                      size="sm"
                      colorScheme={marketChangePercent > 0 ? "green" : "red"}
                    >
                      {marketChangePercent > 0 ? "+" : ""}
                      {Math.abs(marketChangePercent).toFixed(2)}%
                    </Tag>
                  </Stack>
                </Flex>
              );
            })}
            {positions.length === 0 && (
              <Text fontSize="sm">
                You don't have any positions. Go make some trades!
              </Text>
            )}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}

export default PositionsList;






// import React, { useEffect, useState } from "react";
// import accounts from "../services/accounts.service";
// import { Position } from "../App";
// import {
// 	Tag,
// 	Text,
// 	Card,
// 	CardHeader,
// 	CardBody,
// 	Heading,
// 	Stack,
// 	StackDivider,
// 	Flex,
// 	Spinner,
// } from "@chakra-ui/react";
// import { Link } from "react-router-dom";

// const format = new Intl.NumberFormat("en-US", {
// 	style: "currency",
// 	currency: "USD",
// }).format;

// function PositionsList() {
// 	const [isLoading, setIsLoading] = useState(true);
// 	const [positions, setPositions] = useState<Position[]>([]);

// 	// Ajoutez ce useEffect au début du composant :
// 	useEffect(() => {
// 	console.log("Initialisation PositionsList");
	
// 	const fetchData = async () => {
// 		try {
// 		console.log("Début du chargement des positions...");
// 		const { positions } = await accounts.getPortfolio();
		
// 		console.log("Positions reçues dans le composant:", positions);
		
// 		if (positions.length > 0) {
// 			console.log("Première position analysée:", {
// 			symbol: positions[0].symbol,
// 			quantity: positions[0].quantity,
// 			price: positions[0].purchasePrice
// 			});
// 		}
		
// 		setPositions(positions);
// 		} catch (error) {
// 		console.error("Erreur lors du chargement:", error);
// 		} finally {
// 		setIsLoading(false);
// 		}
// 	};

// 	fetchData();
// 	}, []);

// 	// Modifiez la partie d'affichage pour ajouter un debug :
// 	{positions.length === 0 && !isLoading && (
// 	<>
// 		<Text fontSize="sm">
// 		You don't have any positions. Go make some trades!
// 		</Text>
// 		<Text fontSize="xs" color="gray.500" mt={2}>
// 		{positions.length} positions trouvées dans les données
// 		</Text>
// 	</>
// 	)}

// 	// Ajoutez ce useEffect pour écouter les mises à jour
// 	useEffect(() => {
// 	const handleUpdate = () => {
// 		accounts.getPortfolio().then(({ positions = [] }) => {
// 		console.log("Nouvelles positions:", positions); // Debug
// 		setPositions(positions);
// 		});
// 	};

//   window.addEventListener('portfolio-updated', handleUpdate);
//   return () => window.removeEventListener('portfolio-updated', handleUpdate);
// }, []);

// 	useEffect(() => {
// 		accounts.getPortfolio().then(({ positions = [] }) => {
// 			setPositions(positions);
// 			setIsLoading(false);
// 		});
// 	}, []);

// 	return (
// 		<Card>
// 			<CardHeader>
// 				<Heading size="md">My Portfolio</Heading>
// 			</CardHeader>

// 			<CardBody pt="0">
// 				{isLoading ? (
// 					<Spinner size={"lg"} />
// 				) : (
// 					<Stack divider={<StackDivider />} spacing="4">
// 						{positions.map((position) => {
// 							const marketChangePercent = position.regularMarketChangePercent || 0;
// 							const marketPrice = position.regularMarketPrice || 0;
// 							const purchasePrice = position.purchasePrice || 0;
							
// 							return (
// 								<Flex
// 									justifyItems="space-between"
// 									gap={4}
// 									key={position.purchaseDate?.toString() || position.symbol}
// 									as={Link}
// 									to={"/stocks/" + position.symbol}
// 								>
// 									<Stack flex="0.33">
// 										<Heading size="xs" textTransform="uppercase">
// 											{position.symbol}
// 										</Heading>
// 										<Text fontSize="sm">
// 											{position.quantity || 0} share
// 											{position.quantity === 1 ? "" : "s"}
// 										</Text>
// 									</Stack>
// 									<Stack flex="0.33">
// 										<Heading
// 											fontSize="sm"
// 											color="gray.500"
// 											textTransform="uppercase"
// 										>
// 											Gain/Loss
// 										</Heading>
// 										<Text fontSize="sm" fontWeight="500">
// 											{format(
// 												(marketPrice - purchasePrice) * (position.quantity || 0)
// 											)}
// 										</Text>
// 									</Stack>
// 									<Stack flex="0.33" alignItems={"end"}>
// 										<Heading size="xs" textTransform="uppercase">
// 											<Text fontSize="sm">
// 												{format(marketPrice)}
// 											</Text>
// 										</Heading>
// 										<Tag
// 											size="sm"
// 											colorScheme={marketChangePercent > 0 ? "green" : "red"}
// 										>
// 											{marketChangePercent > 0 ? "+" : ""}
// 											{Math.abs(marketChangePercent).toFixed(2)}%
// 										</Tag>
// 									</Stack>
// 								</Flex>
// 							);
// 						})}
// 						{positions.length === 0 && (
// 							<Text fontSize="sm">
// 								You don't have any positions. Go make some trades!
// 							</Text>
// 						)}
// 					</Stack>
// 				)}
// 			</CardBody>
// 		</Card>
// 	);
// }

// export default PositionsList;




