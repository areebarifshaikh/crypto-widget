const rows = new Map();
const prices = {};
const dirty = new Set();
const STALE_MS = 10_000;

export function onTick(sym, price, change) {
  prices[sym] = { price, change, ts: Date.now() };
  dirty.add(sym);
}

const fmt = (p) => {
  let min, max;
  if (p > 1000)    { min = 2; max = 2; }   // above 1000: 2 decimals
  else if (p >= 1) { min = 3; max = 3; }   // 1 to 1000: 3 decimals
  else             { min = 4; max = 8; }   // below 1: 4 to 8 decimals

  return p.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
};
 
export function addRow(sym, onRemove) {
  const el = document.createElement('div');
  el.className = 'row stale';
  el.innerHTML = `<span class="sym">${sym.replace('USDT', '')}</span>
                  <span class="price">…</span><span class="chg"></span>`;
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); onRemove(sym); });
  document.getElementById('list').append(el);
  rows.set(sym, { el, priceEl: el.children[1], chgEl: el.children[2], lastPrice: null });
}

export function removeRow(sym) {
  rows.get(sym)?.el.remove();
  rows.delete(sym);
  delete prices[sym];
  dirty.delete(sym);
}

function paint() {
  const now = Date.now();
  for (const sym of dirty) {
    const row = rows.get(sym);
    if (!row) continue;
    const { price, change } = prices[sym];
    row.priceEl.textContent = fmt(price);
    row.chgEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    row.chgEl.className = `chg ${change >= 0 ? 'up' : 'down'}`;
    if (row.lastPrice != null && price !== row.lastPrice) {
      const c = price > row.lastPrice ? 'rgba(61,220,132,.25)' : 'rgba(255,92,92,.25)';
      row.el.animate([{ background: c }, { background: 'transparent' }], 500);
    }
    row.lastPrice = price;
  }
  dirty.clear();
  for (const [sym, row] of rows) {
    const t = prices[sym]?.ts;
    row.el.classList.toggle('stale', !t || now - t > STALE_MS);
  }
}

let timer = setInterval(paint, 1000);
export const setRefresh = (ms) => { clearInterval(timer); timer = setInterval(paint, ms); };