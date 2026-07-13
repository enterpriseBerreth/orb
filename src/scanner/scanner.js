export class MarketScanner {
  constructor({ minRelativeVolume = 1, topN = 10 } = {}) { this.minRelativeVolume = minRelativeVolume; this.topN = topN; }
  rank(snapshots) {
    return snapshots
      .filter((s) => s.liquidity === 'high' && s.relativeVolume >= this.minRelativeVolume)
      .map((s) => ({ ...s, score: Number((((s.expectedVolatility ?? 0) * 0.7) + (s.relativeVolume * Math.log10(s.volume) * 0.3)).toFixed(2)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.topN);
  }
}
