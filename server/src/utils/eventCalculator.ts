import { getStockData } from '../index';  // ou le chemin vers ta fonction

export async function computeTargetPrice(
  symbol: string,
  impactPercent: number
): Promise<number> {
  const { price } = await getStockData(symbol);
  return price * (1 + impactPercent / 100);
}