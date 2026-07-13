export class Broker {
  async account() { throw new Error('Broker.account must be implemented'); }
  async submit() { throw new Error('Broker.submit must be implemented'); }
  async cancel() { throw new Error('Broker.cancel must be implemented'); }
  async positions() { throw new Error('Broker.positions must be implemented'); }
}
