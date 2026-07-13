export function calculateMetrics(orders = []) {
  const filled = orders.filter((order) => order.status === 'filled');
  const pnl = filled.reduce((sum, order) => sum + (order.realizedPnl ?? 0), 0);
  return { totalOrders: orders.length, filledOrders: filled.length, realizedPnl: Number(pnl.toFixed(2)), winRate: 0 };
}
