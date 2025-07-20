import { 
  Box, 
  Flex, 
  Heading, 
  Text, 
  Button, 
  VStack, 
  HStack, 
  Card, 
  CardBody,
  Spinner,
  useToast,
  Spacer,
  useBreakpointValue,
  Link
} from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import PortfolioPreview from "../components/PortfolioPreview";
import {React, useState, useEffect} from "react";
import PositionsList from "../components/PositionsList";
import Newsfeed from "../components/Newsfeed";
import Watchlist from "../components/Watchlist";
import tokens from "../services/tokens.service";
import { Link as RouterLink } from "react-router-dom";
import { getBuyingPower } from "../services/accounts.service";
import { ChatIcon } from '@chakra-ui/icons';
import chatSocket from '../services/chat.websocket'


export default function Dashboard() {
  const isOnMobile = useBreakpointValue({ base: true, md: false });
  const [buyingPower, setBuyingPower] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBuyingPower = async () => {
    try {
      if (tokens.isAuthenticated()) {
        const power = await getBuyingPower();
        setBuyingPower(power);
      }
    } catch (error) {
      console.error("Error fetching buying power:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyingPower();

    const handleUpdate = () => {
      fetchBuyingPower();
    };

    window.addEventListener('portfolio-updated', handleUpdate);
    return () => window.removeEventListener('portfolio-updated', handleUpdate);
  }, []);

  
useEffect(() => {
  const handleNews = (data: { id: string }) => {
    console.log('📢 News reçue:', data.id);
    window.dispatchEvent(new CustomEvent('show-news', { detail: data.id }));
  };

  chatSocket.on('global-news', handleNews);
  return () => chatSocket.off('global-news', handleNews);
}, []);

  return (
    <Box className="Dashboard">
      <Flex direction={{ base: "column", md: "row" }} gap={5}>
        <Box flex="0.75">
          {tokens.isAuthenticated() ? (
            <>
              <PortfolioPreview buyingPower={buyingPower} loading={loading}/>
                <Flex align="center" gap={2}>
                  <Button
                    as={RouterLink}
                    to="/get-funds"
                    colorScheme="blue"
                    size="sm"
                  >
                    Add funds
                  </Button>
                  
                  <Button
                    as={RouterLink}
                    to="/chat"
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<ChatIcon />}
                  >
                    Chat
                  </Button>

                  <Button
                    as={RouterLink}
                    to="/crash"
                    colorScheme="green"
                    size="sm"
                  >
                    Yield Curve
                  </Button>

                  <Button
                    as={RouterLink}
                    to="/simulator"
                    colorScheme="purple"
                    size="sm"
                    leftIcon={<SettingsIcon />}
                  >
                    Settings
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => chatSocket.emit('news-trigger', { id: 'news1' })}
                  >
                    📢 News 1
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="orange"
                    onClick={() => chatSocket.emit('news-trigger', { id: 'news2' })}
                  >
                    📢 News 2
                  </Button>

                </Flex>
            </>
          ) : (
            <>
              <Heading as="h1" size="xl">
                Reynald_Trading
              </Heading>
              <Text fontSize="lg">
                <Link as={RouterLink} to="/signup">
                  Create an account
                </Link>{" "}
                or{" "}
                <Link as={RouterLink} to="/login">
                  login
                </Link>{" "}
                to get started!
              </Text>
            </>
          )}
          {!isOnMobile && (
            <>
              <Spacer height={10} />
              <Heading size="md">Stock Market News</Heading>
              <Spacer height={2} />
              <Newsfeed symbol={""} />
            </>
          )}
        </Box>
        <Box
          flex="0.25"
          borderWidth={{ base: 0, md: 1 }}
          borderRadius="md"
          p={{ base: 0, md: 3 }}
          height={"fit-content"}
        >
          {tokens.isAuthenticated() ? (
            <>
              <PositionsList />
              <Spacer h="3" />
              <Watchlist />
            </>
          ) : (
            <Box>
              <Heading as="h6" size="xs" textAlign={"center"}>
                Sign in to view positions and watchlist
              </Heading>
            </Box>
          )}
        </Box>
      </Flex>
      {isOnMobile && (
        <>
          <Spacer height={10} />
          <Heading size="md">Stock Market News</Heading>
          <Spacer height={2} />
          <Newsfeed symbol={""} />
        </>
      )}
    </Box>
  );
}


