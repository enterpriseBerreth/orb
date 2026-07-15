import pg from 'pg';
const { Pool } = pg;

export class NullPersistence {
  async initialize() {}
  async recordEvent() {}
  async upsertOpeningRange() {}
  async getOpeningRange() { return null; }
  async recentEvents() { return []; }
  async eventsForTradingDate() { return []; }
}

export class PostgresPersistence {
  constructor(connectionString) { this.pool = new Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } }); }
  async initialize() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS journal_events (
      id UUID PRIMARY KEY, occurred_at TIMESTAMPTZ NOT NULL, event_type TEXT NOT NULL, payload JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS journal_events_occurred_at_idx ON journal_events (occurred_at DESC);
    CREATE TABLE IF NOT EXISTS opening_ranges (
      trading_date DATE NOT NULL, symbol TEXT NOT NULL, high NUMERIC NOT NULL, low NUMERIC NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, symbol)
    );`);
  }
  async recordEvent(event) {
    const { id, at, type, ...payload } = event;
    await this.pool.query('INSERT INTO journal_events (id, occurred_at, event_type, payload) VALUES ($1, $2, $3, $4)', [id, at, type, JSON.stringify(payload)]);
  }
  async upsertOpeningRange(tradingDate, symbol, price) {
    await this.pool.query(`INSERT INTO opening_ranges (trading_date, symbol, high, low) VALUES ($1, $2, $3, $3)
      ON CONFLICT (trading_date, symbol) DO UPDATE SET high = GREATEST(opening_ranges.high, EXCLUDED.high), low = LEAST(opening_ranges.low, EXCLUDED.low), updated_at = NOW()`, [tradingDate, symbol, price]);
  }
  async getOpeningRange(tradingDate, symbol) {
    const { rows } = await this.pool.query('SELECT high, low FROM opening_ranges WHERE trading_date = $1 AND symbol = $2', [tradingDate, symbol]);
    return rows[0] ? { high: Number(rows[0].high), low: Number(rows[0].low) } : null;
  }
  async recentEvents(limit = 100) {
    const { rows } = await this.pool.query('SELECT id, occurred_at, event_type, payload FROM journal_events ORDER BY occurred_at DESC LIMIT $1', [limit]);
    return rows.map((row) => ({ id: row.id, at: row.occurred_at, type: row.event_type, ...row.payload }));
  }
  async eventsForTradingDate(tradingDate, limit = 5000) {
    const { rows } = await this.pool.query(`SELECT id, occurred_at, event_type, payload FROM journal_events
      WHERE (occurred_at AT TIME ZONE 'America/New_York')::date = $1
      ORDER BY occurred_at DESC LIMIT $2`, [tradingDate, limit]);
    return rows.map((row) => ({ id: row.id, at: row.occurred_at, type: row.event_type, ...row.payload }));
  }
}

export function createPersistence(connectionString) { return connectionString ? new PostgresPersistence(connectionString) : new NullPersistence(); }
