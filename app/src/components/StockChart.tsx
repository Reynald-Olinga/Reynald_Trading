// src/components/StockChart.tsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import * as Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { Box, HStack, Button, useTheme } from "@chakra-ui/react";
import marketWebSocket from "../services/market.websocket";
import highchartsAccessibility from "highcharts/modules/accessibility";
import api from "../services/api.service";
import styles from "./StockChart.module.css";

highchartsAccessibility(Highcharts);

export interface Candle {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type ViewMode = "live" | "crash" | "boom";

export default function StockChart({ symbol }: { symbol: string }) {
  const [candles, setCandles] = useState<Highcharts.SeriesCandlestickDataOptions[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const theme = useTheme();


  

  /* -------------------------------------------------
   * 1. Génère des faux chandeliers pour le dernier jour
   * ------------------------------------------------- */
  const fakeCandles = useMemo(() => {
    const now = Date.now();
    const pointsPerDay = 288;
    const startPrice = 100;
    const targetPrice = viewMode === "crash" ? startPrice * 0.3 : startPrice * 1.7;

    const arr: Highcharts.SeriesCandlestickDataOptions[] = [];

    for (let i = 0; i < pointsPerDay; i++) {
      const ratio = i / (pointsPerDay - 1);
      const currentPrice = startPrice + (targetPrice - startPrice) * ratio;

      const open  = currentPrice;
      const close = currentPrice + (Math.random() - 0.5) * 0.02 * currentPrice;
      const high  = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
      const low   = Math.min(open, close) - Math.random() * 0.01 * currentPrice;

      arr.push([
        now - (pointsPerDay - 1 - i) * 5 * 60 * 1000,
        parseFloat(open.toFixed(2)),
        parseFloat(high.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(close.toFixed(2))
      ]);
    }
    return arr;
  }, [viewMode]);

  /* -------------------------------------------------
   * 2. Construction des options dynamiques
   * ------------------------------------------------- */
  const options = useMemo((): Highcharts.Options => {
    const accentColor =
      (theme.components?.Link?.baseStyle?.color as string)?.split(".")?.[0] || "blue";
    const chartAccentColor = `var(--chakra-colors-${accentColor}-500)`;

    const data = viewMode === "live" ? candles : fakeCandles;

    // Calcul simple : 12 px par défaut (tu peux ajuster)
    const plotWidth = chartRef.current?.chart?.plotWidth ?? 600;
    const gap = 2;
    const candleWidth = Math.floor((plotWidth - 24 * gap) / 25);

    return {
      rangeSelector: {
        allButtonsEnabled: true,
        buttons: [
          { type: "day", count: 1, text: "1d" },
          { type: "day", count: 5, text: "5d" },
          { type: "month", count: 1, text: "1m" },
          { type: "ytd", text: "YTD" },
          { type: "all", text: "All" }
        ]
      },
      title: { text: viewMode === "live" ? symbol : `${viewMode.toUpperCase()} scenario` },
      yAxis: [
        {
          labels: { format: "{value:.5f} $" },
          height: "85%",
          minPadding: 0.1,
          maxPadding: 0.1,
        },
      ],
      xAxis: {
        type: "datetime",
        min: Date.now() - 50 * 5 * 60 * 1000,
        max: Date.now(),
      },
      series: [
        {
          name: viewMode === "live" ? symbol : viewMode,
          type: "candlestick",
          data,
          color: "#ef5350",
          lineColor: "#ef5350",
          upColor: "#26a69a",
          upLineColor: "#26a69a",
          dataGrouping: { enabled: false },
          pointWidth: candleWidth,
          pointPadding: 0.1,
          groupPadding: 0.1,
          whiskerLength: "70%",
          whiskerWidth: 2,
          animation: {
            duration: 1000,
            easing: "easeIn",
          },
        },
      ],
      chart: {
        height: 600,
        borderRadius: 10,
        backgroundColor: "transparent",
        events: {
          load() {
            const chart = this;
            // On observe la série pour injecter les classes
            chart.series[0].points.forEach((p, idx, arr) => {
              if (idx === arr.length - 1) p.graphic?.addClass("highcharts-point-incoming");
            });
          },
        },
      },
      credits: { enabled: false },
    };
  }, [candles, fakeCandles, viewMode, theme, symbol]);

  /* -------------------------------------------------
   * 3. WebSocket uniquement en mode live
   * ------------------------------------------------- */
  useEffect(() => {

    setCandles([]);
    marketWebSocket.connect();

    const handleCandle = (data: Candle) => {
      const point: Highcharts.SeriesCandlestickDataOptions = [
        data.timestamp,
        data.open,
        data.high,
        data.low,
        data.close,
      ];
      setCandles((prev) => {
        const updated = [...prev, point];
        const sliced = updated.slice(-25);
        const chart = chartRef.current?.chart;
        if (chart && updated.length > 25) {
          const removed = chart.series[0].points[0];
          if (removed) {
            removed.graphic?.animate({ opacity: 0 }, { duration: 700 }, () => {
              removed.remove(false); // retire le point sans redraw
            });
          }
        }
        return sliced;
      });

      // ----------------------------------------------
      // 1. Récupérer la référence au graphique
      const chart = chartRef.current?.chart;
      if (!chart) return;

      // 2. Calculer les nouvelles bornes
      //    On veut toujours les 25 dernières minutes (5 min par bougie)
      const newest = data.timestamp;
      const oldest = newest - 24 * 5 * 60 * 1000; // 24 inter-bougie gaps

      // 3. Glisser la fenêtre avec animation
      chart.xAxis[0].setExtremes(oldest, newest, true, {
        duration: 1000, // ms
        easing:   "easeOutQuart"
      });
    };

    const handleHistorical = (candles: Candle[]) => {
      // const points = candles.map((c) => [c.timestamp, c.open, c.high, c.low, c.close]);
      const points = candles
      .sort((a, b) => a[0] - b[0]) 
      .map((c) => [c.timestamp, c.open, c.high, c.low, c.close]);
      setCandles(points);
    };

    marketWebSocket.on("historical", handleHistorical);
    marketWebSocket.on("candle", handleCandle);

    setTimeout(() => marketWebSocket.subscribe(symbol), 1000);

    return () => {
      marketWebSocket.unsubscribe(symbol);
      marketWebSocket.off("candle", handleCandle);
      marketWebSocket.off("historical", handleHistorical);
    };
  }, [symbol, viewMode]);

  /* -------------------------------------------------
   * 4. Rendu
   * ------------------------------------------------- */
  return (
    <Box width="100%" height="600px" bg="white" borderRadius="lg" boxShadow="lg" p={4}>
      <HStack spacing={2} mb={3}>
        <Button
          colorScheme={viewMode === "crash" ? "red" : "gray"}
          size="sm"
          onClick={() => setViewMode("crash")}
        >
          💥
        </Button>
        <Button
          colorScheme={viewMode === "boom" ? "green" : "gray"}
          size="sm"
          onClick={() => setViewMode("boom")}
        >
          🚀
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode("live")}
          isDisabled={viewMode === "live"}
        >
          Retour Live
        </Button>
      </HStack>

      <HighchartsReact
        constructorType="stockChart"
        highcharts={Highcharts}
        options={options}
        ref={chartRef}
      />
    </Box>
  );
}



































// // src/components/StockChart.tsx
// import React, { useEffect, useState, useRef, useMemo } from "react";
// import * as Highcharts from "highcharts/highstock";
// import HighchartsReact from "highcharts-react-official";
// import { Box, HStack, Button, useTheme } from "@chakra-ui/react";
// import marketWebSocket from "../services/market.websocket";
// import highchartsAccessibility from "highcharts/modules/accessibility";
// import api from "../services/api.service";

// highchartsAccessibility(Highcharts);


// const [activeNews, setActiveNews] = useState<0 | 1 | 2>(0);

// export interface Candle {
//   symbol: string;
//   timestamp: number;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// type ViewMode = "live" | "crash" | "boom";

// export default function StockChart({ symbol }: { symbol: string }) {
//   const [candles, setCandles] = useState<Highcharts.SeriesCandlestickDataOptions[]>([]);
//   const [viewMode, setViewMode] = useState<ViewMode>("live");
//   const chartRef = useRef<HighchartsReact.RefObject>(null);
//   const theme = useTheme();

//   /* -------------------------------------------------
//    * 1. Génère des faux chandeliers pour le dernier jour
//    * ------------------------------------------------- */
//   const fakeCandles = useMemo(() => {
//     const now = Date.now();
//     const pointsPerDay = 288;
//     const startPrice = 100;
//     const targetPrice = viewMode === "crash" ? startPrice * 0.3 : startPrice * 1.7;

//     const arr: Highcharts.SeriesCandlestickDataOptions[] = [];

//     for (let i = 0; i < pointsPerDay; i++) {
//       const ratio = i / (pointsPerDay - 1);
//       const currentPrice = startPrice + (targetPrice - startPrice) * ratio;

//       const open  = currentPrice;
//       const close = currentPrice + (Math.random() - 0.5) * 0.02 * currentPrice;
//       const high  = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
//       const low   = Math.min(open, close) - Math.random() * 0.01 * currentPrice;

//       arr.push([
//         now - (pointsPerDay - 1 - i) * 5 * 60 * 1000,
//         parseFloat(open.toFixed(2)),
//         parseFloat(high.toFixed(2)),
//         parseFloat(low.toFixed(2)),
//         parseFloat(close.toFixed(2))
//       ]);
//     }
//     return arr;
//   }, [viewMode]);

//   /* -------------------------------------------------
//    * 2. Construction des options dynamiques
//    * ------------------------------------------------- */
//   const options = useMemo((): Highcharts.Options => {
//     const accentColor =
//       (theme.components?.Link?.baseStyle?.color as string)?.split(".")?.[0] || "blue";
//     const chartAccentColor = `var(--chakra-colors-${accentColor}-500)`;

//     const data = viewMode === "live" ? candles : fakeCandles;

//     // Calcul simple : 12 px par défaut (tu peux ajuster)
//     const plotWidth = chartRef.current?.chart?.plotWidth ?? 600;
//     const gap = 2;
//     const candleWidth = Math.floor((plotWidth - 24 * gap) / 25);

//     return {
//       rangeSelector: {
//         allButtonsEnabled: true,
//         buttons: [
//           { type: "day", count: 1, text: "1d" },
//           { type: "day", count: 5, text: "5d" },
//           { type: "month", count: 1, text: "1m" },
//           { type: "ytd", text: "YTD" },
//           { type: "all", text: "All" }
//         ]
//       },
//       title: { text: viewMode === "live" ? symbol : `${viewMode.toUpperCase()} scenario` },
//       yAxis: [
//         {
//           labels: { format: "{value:.5f} $" },
//           height: "95%",
//           minPadding: 0.01,
//           maxPadding: 0.01,
//         },
//       ],
//       xAxis: {
//         type: "datetime",
//         min: Date.now() - 50 * 5 * 60 * 1000,
//         max: Date.now(),
//       },
//       series: [
//         {
//           name: viewMode === "live" ? symbol : viewMode,
//           type: "candlestick",
//           data,
//           color: "#ef5350",
//           lineColor: "#ef5350",
//           upColor: "#26a69a",
//           upLineColor: "#26a69a",
//           dataGrouping: { enabled: false },
//           pointWidth: candleWidth,
//           pointPadding: 0.01,
//           groupPadding: 0.01,
//           whiskerLength: "95%",
//           whiskerWidth: 15,
//           animation: {
//             duration: 1000,
//             easing: "easeIn",
//           },
//         },
//       ],
//       chart: {
//         height: 600,
//         borderRadius: 10,
//         backgroundColor: "transparent",
//       },
//       credits: { enabled: false },
//     };
//   }, [candles, fakeCandles, viewMode, theme, symbol]);

//   /* -------------------------------------------------
//    * 3. WebSocket uniquement en mode live
//    * ------------------------------------------------- */
//   useEffect(() => {
//     if (viewMode !== "live") return;

//     setCandles([]);
//     marketWebSocket.connect();

//     const handleCandle = (data: Candle) => {
//       const point: Highcharts.SeriesCandlestickDataOptions = [
//         data.timestamp,
//         data.open,
//         data.high,
//         data.low,
//         data.close,
//       ];
//       setCandles((prev) => {
//         const updated = [...prev, point];
//         return updated.slice(-25);
//       });
//     };

//     const handleHistorical = (candles: Candle[]) => {
//       const points = candles.map((c) => [c.timestamp, c.open, c.high, c.low, c.close]);
//       setCandles(points);
//     };

//     marketWebSocket.on("historical", handleHistorical);
//     marketWebSocket.on("candle", handleCandle);

//     setTimeout(() => marketWebSocket.subscribe(symbol), 1000);

//     return () => {
//       marketWebSocket.unsubscribe(symbol);
//       marketWebSocket.off("candle", handleCandle);
//       marketWebSocket.off("historical", handleHistorical);
//     };
//   }, [symbol, viewMode]);

//   /* -------------------------------------------------
//    * 4. Rendu
//    * ------------------------------------------------- */
//   return (
//     <Box width="100%" height="600px" bg="white" borderRadius="lg" boxShadow="lg" p={4}>
//       <HStack spacing={2} mb={3}>
//         <Button
//           colorScheme={viewMode === "crash" ? "red" : "gray"}
//           size="sm"
//           onClick={() => setViewMode("crash")}
//         >
//           💥
//         </Button>
//         <Button
//           colorScheme={viewMode === "boom" ? "green" : "gray"}
//           size="sm"
//           onClick={() => setViewMode("boom")}
//         >
//           🚀
//         </Button>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => setViewMode("live")}
//           isDisabled={viewMode === "live"}
//         >
//           Retour Live
//         </Button>
//       </HStack>

//       <HighchartsReact
//         constructorType="stockChart"
//         highcharts={Highcharts}
//         options={options}
//         ref={chartRef}
//       />
//     </Box>
//   );
// }







































// // src/components/StockChart.tsx
// import React, { useEffect, useState, useRef, useMemo } from "react";
// import * as Highcharts from "highcharts/highstock";
// import HighchartsReact from "highcharts-react-official";
// import { Box, HStack, Button, useTheme } from "@chakra-ui/react";
// import marketWebSocket from "../services/market.websocket";
// import highchartsAccessibility from "highcharts/modules/accessibility";
// import api from "../services/api.service";

// highchartsAccessibility(Highcharts);

// export interface Candle {
//   symbol: string;
//   timestamp: number;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// type ViewMode = "live" | "crash" | "boom";

// export default function StockChart({ symbol }: { symbol: string }) {
//   const [candles, setCandles] = useState<Highcharts.SeriesCandlestickDataOptions[]>([]);
//   const [viewMode, setViewMode] = useState<ViewMode>("live");
//   const chartRef = useRef<HighchartsReact.RefObject>(null);
//   const theme = useTheme();

//   /* -------------------------------------------------
//    * 1. Génère des faux chandeliers pour le dernier jour
//    * ------------------------------------------------- */
//   const fakeCandles = useMemo(() => {
//     const now = Date.now();
//     const pointsPerDay = 288; // 5-min candles for 24h
//     const startPrice = 100;
//     const targetPrice = viewMode === "crash" ? startPrice * 0.3 : startPrice * 1.7;

//     const arr: Highcharts.SeriesCandlestickDataOptions[] = [];

//     for (let i = 0; i < pointsPerDay; i++) {
//       const ratio = i / (pointsPerDay - 1);
//       const currentPrice = startPrice + (targetPrice - startPrice) * ratio;

//       const open  = currentPrice;
//       const close = currentPrice + (Math.random() - 0.5) * 0.02 * currentPrice;
//       const high  = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
//       const low   = Math.min(open, close) - Math.random() * 0.01 * currentPrice;

//       arr.push([
//         now - (pointsPerDay - 1 - i) * 5 * 60 * 1000,
//         parseFloat(open.toFixed(2)),
//         parseFloat(high.toFixed(2)),
//         parseFloat(low.toFixed(2)),
//         parseFloat(close.toFixed(2))
//       ]);
//     }
//     return arr;
//   }, [viewMode]);

//   /* -------------------------------------------------
//    * 2. Construction des options dynamiques
//    * ------------------------------------------------- */
//   const options = useMemo((): Highcharts.Options => {
//     const accentColor =
//       (theme.components?.Link?.baseStyle?.color as string)?.split(".")?.[0] || "blue";
//     const chartAccentColor = `var(--chakra-colors-${accentColor}-500)`;

//     const data =
//       viewMode === "live"
//         ? candles
//         : fakeCandles;

//     return {
//       rangeSelector: {
//         allButtonsEnabled: true,
//         buttons: [
//           { type: "day", count: 1, text: "1d" },
//           { type: "day", count: 5, text: "5d" },
//           { type: "month", count: 1, text: "1m" },
//           { type: "ytd", text: "YTD" },
//           { type: "all", text: "All" }
//         ]
//       },
//       title: { text: viewMode === "live" ? symbol : `${viewMode.toUpperCase()} scenario` },
//       yAxis: [{ labels: { format: "{value:.5f} $" }, height: "85%", minPadding: 0.01, maxPadding: 0.01 }],
//       xAxis: {
//               type: "datetime",
//               min: Date.now() - 50 * 5 * 60 * 1000, // 50 dernières bougies
//               max: Date.now(),
//             },
//       // series: [
//       //   {
//       //     name: viewMode === "live" ? symbol : viewMode,
//       //     type: "candlestick",
//       //     data,
//       //     color: "#ef5350",
//       //     lineColor: "#ef5350",
//       //     upColor: "#26a69a",
//       //     upLineColor: "#26a69a",
//       //     dataGrouping: { enabled: false },
//       //     animation: {
//       //       duration: 400,
//       //       easing: 'ease', 
//       //     },
//       //     pointWidth: 4,      // <-- Ajouté
//       //     pointPadding: .2, 
//       //   },
//       // ],

//       series: [
//         {
//           name: viewMode === "live" ? symbol : viewMode,
//           type: "candlestick",
//           data,
//           color: "#ef5350",
//           lineColor: "#ef5350",
//           upColor: "#26a69a",
//           upLineColor: "#26a69a",
//           dataGrouping: { enabled: false },

//           /* 🎯 Candle geometry */
//           pointWidth: candleWidth,        // ⬅️ plus large (essayez 10 à 15)
//           pointPadding: 0.01,    // ⬅️ un peu d’espace entre elles
//           groupPadding: 0.01,     // ⬅️ léger écart à gauche/droite du groupe
//           whiskerLength: "70%",  // ⬅️ mèches bien visibles sans trop dépasser
//           whiskerWidth: 2,       // ⬅️ mèches plus épaisses
          
//           /* 🎯 Smooth entry animation */
//           animation: {
//             duration: 1000,
//             easing: "easeIn",
//           },
//         },
//       ],

//       chart: {
//         height: 600,
//         borderRadius: 10,
//         backgroundColor: "transparent"
//       },
//       credits: { enabled: false }
//     };
//   }, [candles, fakeCandles, viewMode, theme, symbol]);

//   /* -------------------------------------------------
//    * 3. WebSocket uniquement en mode live
//    * ------------------------------------------------- */
//   useEffect(() => {
//     if (viewMode !== "live") return;

//     setCandles([]);
//     marketWebSocket.connect();

//     const handleCandle = (data: Candle) => {
//       const point: Highcharts.SeriesCandlestickDataOptions = [
//         data.timestamp,
//         data.open,
//         data.high,
//         data.low,
//         data.close,
//       ];
//       setCandles((prev) => {
//         const updated = [...prev, point];
//         return updated.slice(-25); // Garde seulement les 25 dernières
//       });
//     };

//     const handleHistorical = (candles: Candle[]) => {
//       const points = candles.map((c) => [c.timestamp, c.open, c.high, c.low, c.close]);
//       setCandles(points);
//     };

//     marketWebSocket.on("historical", handleHistorical);
//     marketWebSocket.on("candle", handleCandle);

//     setTimeout(() => marketWebSocket.subscribe(symbol), 1000);

//     return () => {
//       marketWebSocket.unsubscribe(symbol);
//       marketWebSocket.off("candle", handleCandle);
//       marketWebSocket.off("historical", handleHistorical);
//     };
//   }, [symbol, viewMode]);



//   /*---------------------------------------------------
//    * useEffect pour le defilement du graphe 
//    *---------------------------------------------------*/
//     useEffect(() => {
//   if (viewMode !== "live") return;

//   const chart = chartRef.current?.chart;
//   if (!chart) return;

//   // Obtenir la dernière bougie
//   const lastCandle = candles[candles.length - 1];
//   if (!lastCandle) return;

//   const lastTime = (lastCandle as any)[0]; // Timestamp de la dernière bougie

//   // Ajuster la vue pour montrer les 50 dernières bougies
//   const visibleRange = 25 * 5 * 60 * 1000; // 25 bougies x 5 min
//   const min = lastTime - visibleRange;
//   const max = lastTime;

//   chart.xAxis[0].setExtremes(min, max, true, false, {
//     duration: 800,
//     easing: 'easeIn',
//   });

//   const series = chart.series[0];
//     if (series && candles.length > 0) {
//       series.setData(candles, true, {
//         duration: 800,
//         easing: 'ease',
//       });
//     }

// }, [candles, viewMode]);

//   useEffect(() => {
//     const handleResize = () => chartRef.current?.chart?.reflow();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

  
//   /* --- Largeur d’une bougie pour 25 exactement --- */
//   const candleWidth = useMemo(() => {
//     const chart = chartRef.current?.chart;
//     if (!chart) return 12; // fallback

//     const plotWidth = chart.plotWidth;               // largeur utile en px
//     const gap = 2;                                   // petit espace entre 2 bougies
//     return Math.floor((plotWidth - 24 * gap) / 25);  // 25 bougies + 24 gaps
//   }, [chartRef.current?.chart]);


//   /* -------------------------------------------------
//    * 4. Rendu
//    * ------------------------------------------------- */
//   return (
//     <Box width="100%" height="600px" bg="white" borderRadius="lg" boxShadow="lg" p={4}>
//       <HStack spacing={2} mb={3}>
//         <Button
//           colorScheme={viewMode === "crash" ? "red" : "gray"}
//           size="sm"
//           onClick={() => setViewMode("crash")}
//         >
//           💥 
//         </Button>
//         <Button
//           colorScheme={viewMode === "boom" ? "green" : "gray"}
//           size="sm"
//           onClick={() => setViewMode("boom")}
//         >
//           🚀 
//         </Button>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => setViewMode("live")}
//           isDisabled={viewMode === "live"}
//         >
//           Retour Live
//         </Button>
//       </HStack>

//       <HighchartsReact
//         constructorType="stockChart"
//         highcharts={Highcharts}
//         options={options}
//         ref={chartRef}
//       />
//     </Box>
//   );
// }











































// // src/components/StockChart.tsx
// import React, { useEffect, useState, useRef, useMemo } from "react";
// import * as Highcharts from "highcharts/highstock";
// import HighchartsReact from "highcharts-react-official";
// import { Box, HStack, Button, useTheme } from "@chakra-ui/react";
// import marketWebSocket from "../services/market.websocket";
// import highchartsAccessibility from "highcharts/modules/accessibility";
// import api from "../services/api.service";
// import { makeFakeSeries } from "../utils/fakeData";

// highchartsAccessibility(Highcharts);

// export interface Candle {
//   symbol: string;
//   timestamp: number;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// type ViewMode = "live" | "crash" | "boom";

// export default function StockChart({ symbol }: { symbol: string }) {
//   const [candles, setCandles] = useState<Highcharts.SeriesCandlestickDataOptions[]>([]);
//   const [viewMode, setViewMode] = useState<ViewMode>("live");
//   const chartRef = useRef<HighchartsReact.RefObject>(null);
//   const theme = useTheme();

//   /* ---------- données fictives ---------- */
//   const crashData = useMemo(() => makeFakeSeries("crash"), []);
//   const boomData  = useMemo(() => makeFakeSeries("boom"),  []);

//   /* ---------- options dynamiques ---------- */
//   const buildOptions = (mode: ViewMode): Highcharts.Options => {
//     switch (mode) {
//       case "crash":
//       case "boom": {
//         const data = mode === "crash" ? crashData : boomData;
//         return {
//           rangeSelector: {
//             allButtonsEnabled: true,
//             buttons: [
//               { type: "day", count: 1, text: "1d" },
//               { type: "day", count: 5, text: "5d" },
//               { type: "month", count: 1, text: "1m" },
//               { type: "ytd", text: "YTD" },
//               { type: "all", text: "All" }
//             ]
//           },
//           title: { text: mode === "crash" ? "Crash -70 %" : "Boom +70 %" },
//           yAxis: [
//             { labels: { format: "{value:.2f} $" }, height: "75%" }
//           ],
//           xAxis: { type: "datetime" },
//           series: [
//             {
//               name: mode === "crash" ? "Crash" : "Boom",
//               type: "line",
//               data,
//               color: mode === "crash" ? "#ef5350" : "#26a69a",
//               lineWidth: 2,
//               dataGrouping: { enabled: false }
//             }
//           ],
//           chart: {
//             height: 600,
//             borderRadius: 10,
//             backgroundColor: "transparent"
//           },
//           credits: { enabled: false },
//           navigator: { enabled: false }
//         };
//       }

//       default: // live
//         return {
//           rangeSelector: {
//             allButtonsEnabled: true,
//             buttons: [
//               { type: "day", count: 1, text: "1d" },
//               { type: "day", count: 5, text: "5d" },
//               { type: "month", count: 1, text: "1m" },
//               { type: "ytd", text: "YTD" },
//               { type: "all", text: "All" }
//             ]
//           },
//           title: { text: symbol },
//           yAxis: [{ labels: { format: "{value:.2f} $" }, height: "75%" }],
//           xAxis: { type: "datetime" },
//           series: [
//             {
//               name: symbol,
//               type: "candlestick",
//               data: candles,
//               color: "#ef5350",
//               lineColor: "#ef5350",
//               upColor: "#26a69a",
//               upLineColor: "#26a69a",
//               dataGrouping: { enabled: false }
//             }
//           ],
//           chart: {
//             height: 600,
//             borderRadius: 10,
//             backgroundColor: "transparent"
//           },
//           credits: { enabled: false }
//         };
//     }
//   };

//   /* ---------- gestionnaires ---------- */
//   const handleCrash = () => setViewMode("crash");
//   const handleBoom  = () => setViewMode("boom");
//   const handleLive  = () => setViewMode("live");

//   /* ---------- WebSocket / historique ---------- */
//   useEffect(() => {
//     if (viewMode !== "live") return; // pas de WebSocket si on est en mode fictif

//     setCandles([]);
//     marketWebSocket.connect();

//     const handleCandle = (data: any) => {
//       if (!data || typeof data.timestamp !== "number") return;
//       const point: Highcharts.SeriesCandlestickDataOptions = [
//         data.timestamp,
//         data.open,
//         data.high,
//         data.low,
//         data.close
//       ];
//       setCandles((prev) => [...prev, point]);
//     };

//     const handleHistorical = (candles: Candle[]) => {
//       if (!Array.isArray(candles)) return;
//       const points = candles.map((c) => [
//         c.timestamp,
//         c.open,
//         c.high,
//         c.low,
//         c.close
//       ]);
//       setCandles(points);
//     };

//     marketWebSocket.on("historical", handleHistorical);
//     marketWebSocket.on("candle", handleCandle);

//     setTimeout(() => marketWebSocket.subscribe(symbol), 1000);

//     return () => {
//       marketWebSocket.unsubscribe(symbol);
//       marketWebSocket.off("candle", handleCandle);
//       marketWebSocket.off("historical", handleHistorical);
//     };
//   }, [symbol, viewMode]);

//   /* ---------- rendu ---------- */
//   return (
//     <Box width="100%" height="600px" bg="white" borderRadius="lg" boxShadow="lg" p={4}>
//       <HStack spacing={2} mb={3}>
//         <Button
//           colorScheme={viewMode === "crash" ? "red" : "gray"}
//           size="sm"
//           onClick={handleCrash}
//         >
//           💥 Crash
//         </Button>
//         <Button
//           colorScheme={viewMode === "boom" ? "green" : "gray"}
//           size="sm"
//           onClick={handleBoom}
//         >
//           🚀 Boom
//         </Button>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleLive}
//           isDisabled={viewMode === "live"}
//         >
//           Retour Live
//         </Button>
//       </HStack>

//       <HighchartsReact
//         constructorType="stockChart"
//         highcharts={Highcharts}
//         options={buildOptions(viewMode)}
//         ref={chartRef}
//       />
//     </Box>
//   );
// }


// import React, { useState, useRef, useEffect } from "react";
// import * as Highcharts from "highcharts/highstock";
// import highchartsAccessibility from "highcharts/modules/accessibility";
// import HighchartsReact from "highcharts-react-official";
// import axios from "axios";
// import { useLocation } from "react-router-dom";
// import { Box, Spinner, useTheme } from "@chakra-ui/react";
// // import { useColorMode } from "@chakra-ui/react";

// const formatter = new Intl.NumberFormat("en-US", {
// 	style: "currency",
// 	currency: "USD",
// });

// export default function StockChart(props: { symbol: string }) {
// 	const location = useLocation();
// 	const [isLoading, setIsLoading] = useState(true);

// 	const accentColor =
// 		useTheme()["components"]["Link"]["baseStyle"]["color"].split(".")[0];
// 	const chartAccentColor = "var(--chakra-colors-" + accentColor + "-500)";

// 	const zoomBtnClick = function (this: any) {
// 		let thisBtn = this as {
// 			click: () => void;
// 			text: string;
// 		};
// 		fetchStockData(thisBtn.text);
// 	};

// 	const [options, setOptions] = useState<Highcharts.Options>({
// 		rangeSelector: {
// 			allButtonsEnabled: true,
// 			inputStyle: {
// 				color: chartAccentColor,
// 				fontWeight: "bold",
// 			},
// 			buttons: [
// 				{
// 					type: "day",
// 					count: 1,
// 					text: "1d",
// 					title: "View 1 day",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "day",
// 					count: 5,
// 					text: "5d",
// 					title: "View 5 days",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "month",
// 					count: 1,
// 					text: "1m",
// 					title: "View 1 month",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "month",
// 					count: 6,
// 					text: "6m",
// 					title: "View 6 months",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "ytd",
// 					text: "YTD",
// 					title: "View year to date",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "year",
// 					count: 1,
// 					text: "1y",
// 					title: "View 1 year",
// 					events: { click: zoomBtnClick },
// 				},
// 				{
// 					type: "all",
// 					text: "All",
// 					title: "View all",
// 					events: { click: zoomBtnClick },
// 				},
// 			],
// 		},
// 		colors: [chartAccentColor],
// 		title: {
// 			text: "",
// 		},
// 		yAxis: [
// 			{
// 				height: "75%",
// 				labels: {
// 					formatter: (point: any) => formatter.format(point.value as number),
// 					x: -5,
// 					align: "left",
// 				},
// 				title: {
// 					text: " ",
// 				},
// 			},
// 		],
// 		plotOptions: {
// 			series: {
// 				showInNavigator: true,
// 				gapSize: 0,
// 			},
// 		},
// 		chart: {
// 			height: 600,
// 			borderRadius: 10,
// 			// backgroundColor: "transparent",

// 			style: {
// 				fontFamily: "'Manrope Variable', sans-serif",
// 				fontWeight: "600",
// 				color: "red",
// 			},
// 		},
// 		credits: {
// 			enabled: false,
// 		},
// 		xAxis: {
// 			type: "datetime",
// 		},
// 		navigator: {
// 			maskFill: "rgb(49, 130, 206, 0.25)",
// 			series: {
// 				color: chartAccentColor,
// 				fillOpacity: 0.1,
// 				lineWidth: 2,
// 			},
// 		},
// 	} as any);

// 	const fetchStockData = (period: string = "1m") => {
// 		setIsLoading(true);
// 		axios
// 			.get(`/api/stocks/${props.symbol}/historical?period=` + period)
// 			.then((res) => {
// 				// if (chartComponentRef !== null) {
// 				// chartComponentRef.current!.chart!.series[0]!.setData(res.data);
// 				// } else {
// 				setOptions({
// 					...options,
// 					series: [
// 						{
// 							name: "Price",
// 							type: "spline",
// 							id: "stock_chart",

// 							data: res.data,
// 							lineWidth: 2,
// 							tooltip: {
// 								valueDecimals: 2,
// 							},
// 						},
// 					],
// 				});
// 				// }
// 				setIsLoading(false);
// 			});
// 	};

// 	const chartComponentRef = useRef<HighchartsReact.RefObject>(null);

// 	highchartsAccessibility(Highcharts);

// 	// useEffect(() => {
// 	// 	options.chart!.style!.color = colorMode === "light" ? "black" : "white";
// 	// 	chartComponentRef.current?.chart?.update(options);
// 	// 	console.log("updates");
// 	// }, [colorMode]);

// 	useEffect(() => {
// 		fetchStockData();
// 	}, [location]);

// 	return (
// 		<>
// 			{isLoading && <Spinner />}
// 			<Box display={isLoading ? "none" : "block"}>
// 				<HighchartsReact
// 					constructorType={"stockChart"}
// 					highcharts={Highcharts}
// 					options={options}
// 					ref={chartComponentRef}
// 				/>
// 			</Box>
// 		</>
// 	);
// }
