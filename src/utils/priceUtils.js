// utils/priceUtils.js
// Small display helpers for service prices (Indian digit grouping, no Intl dependency).

export const formatINR = (value) => {
    const num = Number(value) || 0;
    const [int, dec] = num.toFixed(Number.isInteger(num) ? 0 : 2).split('.');
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3);
    const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
    return `₹${grouped}${dec ? `.${dec}` : ''}`;
};

export const formatMinutes = (minutes) => {
    const m = Math.round(Number(minutes) || 0);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} hr ${r} min` : `${h} hr`;
};
