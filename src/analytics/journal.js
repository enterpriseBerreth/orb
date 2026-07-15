export class TradeJournal {
  constructor({ persistence } = {}) { this.events = []; this.persistence = persistence; }
  record(type, payload = {}) {
    const event = { id: crypto.randomUUID(), at: new Date().toISOString(), type, ...payload };
    this.events.unshift(event);
    this.events = this.events.slice(0, 500);
    this.persistence?.recordEvent(event).catch((error) => console.error(JSON.stringify({ level: 'error', scope: 'journal', message: 'persistence-write-failed', error: error.message })));
    return event;
  }
  recent(limit = 50) { return this.events.slice(0, limit); }
}
