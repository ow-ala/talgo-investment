export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount, currency = 'KSh') {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? '-' : '';
  const [whole, decimals] = Math.abs(value).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${currency}${grouped}.${decimals}`;
}

export function toNumber(raw) {
  const cleaned = String(raw ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}
