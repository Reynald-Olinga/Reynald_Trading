export class PriceCurveService {
  computeProgressivePrice(
    basePrice: number,
    targetPrice: number,
    startDate: Date,
    curveDuration: number, // minutes
    now = new Date()
  ): number {
    const elapsedMs = now.getTime() - startDate.getTime();
    const totalMs = curveDuration * 60 * 1000;
    const progress = Math.min(elapsedMs / totalMs, 1);

    // easing linéaire
    return basePrice + (targetPrice - basePrice) * progress;
  }
}