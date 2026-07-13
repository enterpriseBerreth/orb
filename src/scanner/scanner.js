export class MarketScanner {
  constructor({ minRelativeVolume = 1 } = {}) { this.minRelativeVolume = minRelativeVolume; }
  rank(snapshots) {
    return snapshots
      .filter((s) => s.liquidity === 'high' && s.relativeVolume >= this.minRelativeVolume)
      .map((s) => ({ ...s, score: Number((s.relativeVolume * Math.log10(s.volume)).toFixed(2)) }))
      .sort((a, b) => b.score - a.score);
  }
}
