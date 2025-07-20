export type Trend = 'crash' | 'boom';

/**
 * @param trend  'crash' = –70 %, 'boom' = +70 %
 * @param pointsPerDay  12  => 1 pt toutes les 5 min (288 pts / jour)
 * @param startPrice    prix de départ (ex: 100 $)
 */
export function makeFakeSeries(
  trend: Trend,
  pointsPerDay = 12 * 24,     // 288 points = 1 jour complet
  days = 30,                  // 30 jours d’historique
  startPrice = 100
): Array<[number, number]> {
  const totalPoints = days * pointsPerDay;
  const now = Date.now();
  const res: Array<[number, number]> = [];

  // 1) Prix stable jusqu’à l’avant-dernier jour
  for (let i = 0; i < totalPoints - pointsPerDay; i++) {
    const timestamp = now - (totalPoints - 1 - i) * 5 * 60 * 1000;
    // petite vibration ±0.5 %
    const noise = (Math.random() - 0.5) * 1.1 * startPrice;
    res.push([timestamp, parseFloat((startPrice + noise).toFixed(2))]);
  }

  // 2) Dernier jour : chute ou boom de 70 %
  const endTarget = trend === 'crash' ? startPrice * 0.3 : startPrice * 1.7;
  const steps = pointsPerDay;
  const lastStable = res[res.length - 1][1];

  for (let j = 0; j < steps; j++) {
    const ratio = j / (steps - 1); // 0 → 1
    const price = lastStable + (endTarget - lastStable) * ratio;
    const timestamp = now - (steps - 3 - j) * 5 * 60 * 1000;
    res.push([timestamp, parseFloat(price.toFixed(2))]);
  }

  return res;
}