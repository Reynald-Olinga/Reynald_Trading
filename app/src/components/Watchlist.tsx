import React, { useEffect, useState } from "react";
import accounts from "../services/accounts.service";
import tokens from "../services/tokens.service";
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
    IconButton,
    useToast,
    Button,
    Box,
    Tooltip
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { DeleteIcon } from "@chakra-ui/icons"; // Nouveau

const format = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
}).format;

interface WatchlistItem {
    symbol: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
}

function Watchlist() {
    const [isLoading, setIsLoading] = useState(true);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState<string | null>(null); // État pour le loading
    const location = useLocation();
    const toast = useToast(); // Pour les notifications
    const [username, setUsername] = useState(tokens.getUsername());

    useEffect(() => {
        setUsername(tokens.getUsername());
    }, [location.pathname]);

    const fetchWatchlist = async () => {
        try {
            if (!username) {
                throw new Error("User not authenticated");
            }
            
            const data = await accounts.getWatchlist(username);
            const validItems = data.filter((item: any) => 
                item && typeof item === 'object' && item.symbol
            );
            setWatchlist(validItems);
            setError(null);
        } catch (err) {
            console.error("Failed to load watchlist:", err);
            setError(err instanceof Error ? err.message : "Failed to load watchlist");
            setWatchlist([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFromWatchlist = async (symbolToRemove: string) => {
        if (!username) return;

        setIsRemoving(symbolToRemove);
        
        try {
            await accounts.editWatchlist(username, symbolToRemove, "remove");
            
            // Mise à jour immédiate de l'UI
            setWatchlist(prev => prev.filter(item => item.symbol !== symbolToRemove));
            
            toast({
                title: `${symbolToRemove} retiré`,
                description: `${symbolToRemove} a été retiré de votre watchlist`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            
        } catch (error) {
            console.error("Failed to remove from watchlist:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la suppression",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsRemoving(null);
        }
    };

    // Rafraîchir la watchlist après suppression
    useEffect(() => {
        fetchWatchlist();
    }, [username]);

    if (error) {
        return (
            <Card>
                <CardBody>
                    <Text color="red.500">{error}</Text>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <Flex justify="space-between" align="center">
                    <Heading size="md">Watchlist</Heading>
                    <Text fontSize="sm" color="gray.500">
                        {watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'}
                    </Text>
                </Flex>
            </CardHeader>

            <CardBody pt="0">
                {isLoading ? (
                    <Flex justify="center">
                        <Spinner size="lg" />
                    </Flex>
                ) : (
                    <Stack divider={<StackDivider />} spacing="4">
                        {watchlist.map((stock) => {
                            if (!stock?.symbol) return null;
                            
                            const changePercent = stock.regularMarketChangePercent || 0;
                            const marketPrice = stock.regularMarketPrice || 0;
                            
                            return (
                                <Flex 
                                    gap={4} 
                                    key={stock.symbol} 
                                    align="center"
                                >
                                    <Flex 
                                        flex="1" 
                                        as={Link} 
                                        to={`/stocks/${stock.symbol}`}
                                        _hover={{ textDecoration: 'none' }}
                                    >
                                        <Stack flex="0.7">
                                            <Heading size="xs" textTransform="uppercase">
                                                {stock.symbol}
                                            </Heading>
                                            <Text
                                                fontSize="sm"
                                                whiteSpace="nowrap"
                                                overflow="hidden"
                                                textOverflow="ellipsis"
                                                maxWidth="150px"
                                            >
                                                {stock.longName || stock.symbol}
                                            </Text>
                                        </Stack>
                                        <Stack flex="0.3" alignItems="end">
                                            <Text fontSize="sm" fontWeight="bold">
                                                {marketPrice ? format(marketPrice) : 'N/A'}
                                            </Text>
                                            {!isNaN(changePercent) && (
                                                <Tag
                                                    size="sm"
                                                    w="fit-content"
                                                    colorScheme={changePercent > 0 ? "green" : "red"}
                                                >
                                                    {changePercent > 0 ? "+" : ""}
                                                    {Math.abs(changePercent).toFixed(2)}%
                                                </Tag>
                                            )}
                                        </Stack>
                                    </Flex>
                                    
                                    <Tooltip label={`Retirer ${stock.symbol}`}>
                                        <IconButton
                                            aria-label={`Remove ${stock.symbol}`}
                                            icon={<DeleteIcon />}
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleRemoveFromWatchlist(stock.symbol);
                                            }}
                                            isLoading={isRemoving === stock.symbol}
                                            isDisabled={!username}
                                        />
                                    </Tooltip>
                                </Flex>
                            );
                        })}
                        
                        {watchlist.length === 0 && !isLoading && (
                            <Flex direction="column" align="center" py={8}>
                                <Text fontSize="sm" color="gray.500" mb={2}>
                                    Votre watchlist est vide
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                    Recherchez des actions et cliquez sur "Ajouter à la watchlist"
                                </Text>
                            </Flex>
                        )}
                    </Stack>
                )}
            </CardBody>
        </Card>
    );
}

export default Watchlist;



