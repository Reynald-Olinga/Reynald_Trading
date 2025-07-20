// ✅ Remplacez le contenu complet par :
import React, { useEffect, useRef, useState } from 'react';
import { Box, Link, Button, Flex } from '@chakra-ui/react';
import '@fontsource/bitcount'; // Police pixel art

type NewsMap = {
  news1: { title: string; url: string };
  news2: { title: string; url: string };
};

const newsMap: NewsMap = {
  news1: {
    title: '⚠️ URGENT : Les USA annoncent de nouveaux droits de douane sur les produits chinois.',
    url: 'https://www.china-briefing.com/news/trump-raises-tariffs-on-china-to-145-overview-and-trade-implications/',
  },
  news2: {
    title: '🔥 URGENT : La FED augmente ses taux de façon inattendue.',
    url: 'https://www.aberdeenadviser.com/en-gb/insights/us-fed-jumbo-rate-cut-and-portfolios',
  },
};

export default function GlobalNewsTicker() {
  const [visibleNews, setVisibleNews] = useState<keyof NewsMap | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleShowNews = (event: CustomEvent) => {
      setVisibleNews(event.detail);
      setIsAnimating(true);
    };

    window.addEventListener('show-news', handleShowNews);
    return () => window.removeEventListener('show-news', handleShowNews);
  }, []);

  const closeNews = () => {
    setVisibleNews(null);
    setIsAnimating(false);
  };

  if (!visibleNews || !newsMap[visibleNews]) return null;

  return (
    <Box
      position="fixed"
      top="0.5cm"
      left="0.5cm"
      right="0.5cm"
      h="80px"
      bgGradient="linear(to-r, #FF0000, #FF4500, #FF8C00, #FF0000)"
      bgSize="400% 100%"
      animation="gradient 2s ease-in-out infinite"
      borderRadius="lg"
      boxShadow="0 0 20px rgba(255,69,0,0.6)"
      zIndex={9999}
      fontFamily="Bitcount, monospace"
      fontWeight="bold"
      fontSize="xl"
      color="white"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px={4}
      cursor="pointer"
      onClick={() => closeNews()}
      _hover={{ animationDuration: '1s' }}
      sx={{
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      }}
    >
      <Link
        href={newsMap[visibleNews].url}
        isExternal
        whiteSpace="nowrap"
        color="white"
        textDecoration="none"
        _hover={{ textDecoration: 'none' }}
        fontSize="lg"
        style={{
          animation: isAnimating ? 'slide 15s linear infinite' : 'none',
        }}
        sx={{
          '@keyframes slide': {
            '0%': { transform: 'translateX(100vw)' },
            '100%': { transform: 'translateX(-100%)' },
          },
        }}
      >
        {newsMap[visibleNews].title}
      </Link>
      
      <Button
        size="sm"
        colorScheme="whiteAlpha"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          closeNews();
        }}
        _hover={{ bg: 'rgba(255,255,255,0.2)' }}
      >
        ✕
      </Button>
    </Box>
  );
}