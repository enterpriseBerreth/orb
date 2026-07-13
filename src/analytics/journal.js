export class TradeJournal {
  constructor() { this.events = []; }
  record(type, payload = {}) {
    const event = { id: crypto.randomUUID(), at: new Date().toISOString(), type, ...payload };
    this.events.unshift(event);
    this.events = this.events.slice(0, 500);
    return event;
  }
  recent(limit = 50) { return this.events.slice(0, limit); }
}
