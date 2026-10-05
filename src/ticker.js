export class Ticker {
  constructor(onTick) {
    this.onTick = onTick;
    this.symbols = new Set();
    this.retry = 0;
  }

  connect() {
    this.ws = new WebSocket('wss://stream.binance.com:9443/stream');
    this.ws.onopen = () => {
      this.retry = 0;
      if (this.symbols.size) this._send('SUBSCRIBE', [...this.symbols]);
    };
    this.ws.onmessage = (e) => {
      const d = JSON.parse(e.data).data;
      if (!d || !d.s) return;
      const price = parseFloat(d.c);
      const open = parseFloat(d.o);
      this.onTick(d.s, price, ((price - open) / open) * 100);
    };
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retry++, 30000));
    };
  }

  add(sym) {
    const s = sym.toLowerCase() + '@miniTicker';
    this.symbols.add(s);
    if (this.ws?.readyState === 1) this._send('SUBSCRIBE', [s]);
  }

  remove(sym) {
    const s = sym.toLowerCase() + '@miniTicker';
    this.symbols.delete(s);
    if (this.ws?.readyState === 1) this._send('UNSUBSCRIBE', [s]);
  }

  _send(method, params) {
    this.ws.send(JSON.stringify({ method, params, id: Date.now() }));
  }
}