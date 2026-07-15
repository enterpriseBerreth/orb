// A licensed earnings/news calendar provider must implement this interface before event-risk filtering is enforced.
export class EventCalendarProvider {
  async getEventRisk() { return { status: 'unavailable' }; }
}
