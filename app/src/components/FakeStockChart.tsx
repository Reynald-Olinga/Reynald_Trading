import React, { useMemo } from "react";
import * as Highcharts from "highcharts/highstock";
import highchartsAccessibility from "highcharts/modules/accessibility";
import HighchartsReact from "highcharts-react-official";
import { Box, useTheme } from "@chakra-ui/react";
import { makeFakeSeries, Trend } from "../utils/fakeData";

highchartsAccessibility(Highcharts);



interface Props {
  trend: Trend; // "crash" | "boom"
}

export default function FakeStockChart({ trend }: Props) {
  const accentColor =
    useTheme()["components"]["Link"]["baseStyle"]["color"].split(".")[0];
  const chartAccentColor = `var(--chakra-colors-${accentColor}-500)`;

  const data = useMemo(() => makeFakeSeries(trend), [trend]);

  const options: Highcharts.Options = {
    rangeSelector: {
      allButtonsEnabled: true,
      inputStyle: { color: chartAccentColor, fontWeight: "bold" },
      buttons: [
        { type: "day", count: 1, text: "1d", title: "View 1 day" },
        { type: "day", count: 5, text: "5d", title: "View 5 days" },
        { type: "month", count: 1, text: "1m", title: "View 1 month" },
        { type: "month", count: 6, text: "6m", title: "View 6 months" },
        { type: "ytd", text: "YTD", title: "View year to date" },
        { type: "year", count: 1, text: "1y", title: "View 1 year" },
        { type: "all", text: "All", title: "View all" },
      ],
    },
    colors: [chartAccentColor],
    title: { text: "" },
    yAxis: [
      {
        height: "75%",
        labels: {
          formatter: ({ value }) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value as number),
          x: -5,
          align: "left",
        },
        title: { text: " " },
      },
    ],
    plotOptions: {
      series: { showInNavigator: true, gapSize: 0 },
    },
    chart: {
      height: 600,
      borderRadius: 10,
      style: {
        fontFamily: "'Manrope Variable', sans-serif",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    xAxis: { type: "datetime" },
    navigator: {
      maskFill: "rgb(49, 130, 206, 0.25)",
      series: {
        color: chartAccentColor,
        fillOpacity: 0.1,
        lineWidth: 2,
      },
    },
    series: [
      {
        name: "Price",
        type: "spline",
        id: "stock_chart",
        data,
        lineWidth: 2,
        tooltip: { valueDecimals: 2 },
      },
    ],
  };

  return (
    <Box>
      <HighchartsReact
        constructorType="stockChart"
        highcharts={Highcharts}
        options={options}
      />
    </Box>
  );
}