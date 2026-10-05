import { Ticker } from './ticker.js';
import { onTick, addRow, removeRow } from './render.js';

const ticker = new Ticker(onTick);
let coins = [];
let allSymbols = null;

async function addCoin(sym) {
  if (coins.includes(sym)) return;
  coins.push(sym);
  addRow(sym, removeCoin);
  ticker.add(sym);
  await window.api.set('coins', coins);
}

async function removeCoin(sym) {
  coins = coins.filter((c) => c !== sym);
  removeRow(sym);
  ticker.remove(sym);
  await window.api.set('coins', coins);
}

async function loadSymbols() {
  if (allSymbols) return allSymbols;
  const urls = [
    'https://api.binance.com/api/v3/ticker/price',
    'https://data-api.binance.vision/api/v3/ticker/price',
  ];
  for (const url of urls) {
    try {
      const data = await (await fetch(url)).json();
      allSymbols = data.map((d) => d.symbol).filter((s) => s.endsWith('USDT')).sort();
      return allSymbols;
    } catch {}
  }
  return [];
}

const searchBox = document.getElementById('search');
const input = document.getElementById('search-input');
const results = document.getElementById('results');

document.getElementById('add-btn').onclick = async () => {
  searchBox.hidden = !searchBox.hidden;
  if (searchBox.hidden) return;
  input.value = '';
  results.innerHTML = '';
  input.focus();
  await loadSymbols();
};

document.getElementById('quit-btn').onclick = () => window.api.quit();

async function showMatches() {
  const q = input.value.trim().toUpperCase();
  if (!q) { results.innerHTML = ''; return; }
  const list = await loadSymbols();
  const matches = list
    .filter((s) => s.replace('USDT', '').startsWith(q) && !coins.includes(s));
  results.innerHTML = matches
    .map((s) => `<div class="result" data-sym="${s}">${s.replace('USDT', '')}</div>`)
    .join('');
}

input.addEventListener('input', showMatches);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') searchBox.hidden = true;
  if (e.key === 'Enter') {
    const first = results.querySelector('.result');
    if (first) { addCoin(first.dataset.sym); searchBox.hidden = true; }
  }
});
results.addEventListener('click', (e) => {
  const sym = e.target.dataset.sym;
  if (sym) { addCoin(sym); searchBox.hidden = true; }
});

(async function init() {
  coins = await window.api.get('coins');
  coins.forEach((sym) => { addRow(sym, removeCoin); ticker.add(sym); });
  ticker.connect();
})();