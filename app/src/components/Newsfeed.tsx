import React, { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Text,
    SimpleGrid,
    Heading,
    Stack,
    Link,
    Spinner,
    useTheme,
    CardFooter,
    Tag,
    HStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import api from "../services/api.service";


interface NewsItem {
    title: string;
    description: string;
    publishedAt: string;
    symbols: string[];
    source: string;
    sourceUrl: string;
}

function timeSince(date: string) {
    const now = Date.now();
    const seconds = Math.floor((now - new Date(date).getTime()) / 1000);
    const intervals = [
        { name: "years", seconds: 31536000 },
        { name: "months", seconds: 2592000 },
        { name: "days", seconds: 86400 },
        { name: "hours", seconds: 3600 },
        { name: "minutes", seconds: 60 },
        { name: "seconds", seconds: 1 },
    ];

    for (const interval of intervals) {
        const value = Math.floor(seconds / interval.seconds);
        if (value >= 1) {
            return `${value} ${interval.name} ago`;
        }
    }

    return "Just now";
}

function Newsfeed(props: { symbol: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [news, setNews] = useState<NewsItem[]>([]);
    const toast = useToast();
    const accentColor =
        useTheme()["components"]["Link"]["baseStyle"]["color"].split(".")[0];

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await api.get("/news/" + (props.symbol || ""));
                console.log("News fetched:", response.data);
                // Validation des données reçues
                let validNews = Array.isArray(response.data) 
                    ? response.data
                        .slice(0, 9)
                        .filter((item: any) => 
                            item?.title && 
                            item?.sourceUrl && 
                            item?.publishedAt
                        ).map((item: any) => ({
                            title: item?.title || "No title",
                            description: item?.title || "No description",
                            publishedAt: new Date(item?.publishedAt) || new Date().toISOString(),
                            symbols: item?.symbols || [],
                            source: item?.sourceUrl || "Unknown",
                            sourceUrl: item?.sourceUrl || "#"}))
                    : [];

                
                validNews = response.data.slice(0,9).map((item: any) => ({
                    title: item?.category || "No title",
                    description: item?.headline || "No description",
                    publishedAt: new Date(item?.datetime) || new Date().toISOString(),
                    symbols: item?.symbols || [],
                    source: item?.source || "Unknown",
                    sourceUrl: item?.url || "#",
                }));
                
                setNews(validNews);
            } catch (error) {
                console.error("Failed to fetch news:", error);
                
                // Afficher une notification à l'utilisateur
                toast({
                    title: "Error loading news",
                    description: "Could not load news feed. Please try again later.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                
                setNews([]); // Retourner un tableau vide en cas d'erreur
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, [props.symbol, toast]);

    if (isLoading) {
        return (
            <Stack align="center" justify="center" h="100%">
                <Spinner />
            </Stack>
        );
    }

    if (news.length === 0 && !isLoading) {
        return (
            <Stack align="center" justify="center" h="100%">
                <Text>No news available at the moment</Text>
            </Stack>
        );
    }

    return (
        <SimpleGrid
            spacing={1}
            templateColumns="repeat(auto-fill, minmax(250px, 1fr))"
            gap={5}
        >
            {news.map((item, i) => (
                <Card maxW="sm" h="100%" key={`${item.title}-${i}`}>
                    <CardHeader fontSize="sm" pb={2} display="flex" gap="2">
                        <Text whiteSpace="nowrap">{timeSince(item.publishedAt)}</Text>
                        <Text
                            color={`${accentColor}.500`}
                            fontWeight="500"
                            textOverflow="ellipsis"
                            overflow="hidden"
                            whiteSpace="nowrap"
                        >
                            {item.source}
                        </Text>
                    </CardHeader>
                    <Link
                        href={item.sourceUrl}
                        color="inherit"
                        isExternal
                        _hover={{ textDecoration: "none" }}
                    >
                        <CardBody pt={0} h="100%">
                            <Stack>
                                <Heading
                                    size="sm"
                                    textOverflow="ellipsis"
                                    display="-webkit-box"
                                    overflow="hidden"
                                    css={{
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    {item.title}
                                </Heading>
                                <Text
                                    size="sm"
                                    textOverflow="ellipsis"
                                    display="-webkit-box"
                                    overflow="hidden"
                                    css={{
                                        WebkitLineClamp: 6,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    {item.description}
                                </Text>
                            </Stack>
                        </CardBody>
                    </Link>
                    {item.symbols?.length > 0 && (
                        <CardFooter as={Stack}>
                            <Text fontSize="sm" fontWeight="500" mr="2">
                                Symbols:
                            </Text>
                            <br />
                            <HStack flexWrap="wrap">
                                {item.symbols.map((symbol) => (
                                    <Tag
                                        as={Link}
                                        href={"/stocks/" + symbol}
                                        key={symbol}
                                        colorScheme={accentColor}
                                        size="sm"
                                    >
                                        {symbol}
                                    </Tag>
                                ))}
                            </HStack>
                        </CardFooter>
                    )}
                </Card>
            ))}
        </SimpleGrid>
    );
}

export default Newsfeed;