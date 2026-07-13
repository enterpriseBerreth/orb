import { SimulatedMarketDataFeed } from '../data/simulated-feed.js';
import { Backtester } from './backtester.js';
const feed = new SimulatedMarketDataFeed(['ES']);
const result = new Backtester().run(await feed.getBars('ES', 60));
console.log(JSON.stringify(result, null, 2));
