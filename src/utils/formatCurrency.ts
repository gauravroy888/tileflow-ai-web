export const formatCurrency = (value: number | null | undefined, currency?: string): string => {
  if (value == null || isNaN(Number(value))) return '—';
  
  const curr = (currency || 'INR').trim();
  const upper = curr.toUpperCase();

  const map: Record<string, { locale: string; code: string }> = {
    USD: { locale: 'en-US', code: 'USD' },
    '$': { locale: 'en-US', code: 'USD' },
    EUR: { locale: 'de-DE', code: 'EUR' },
    '€': { locale: 'de-DE', code: 'EUR' },
    GBP: { locale: 'en-GB', code: 'GBP' },
    '£': { locale: 'en-GB', code: 'GBP' },
    INR: { locale: 'en-IN', code: 'INR' },
    '₹': { locale: 'en-IN', code: 'INR' },
    CAD: { locale: 'en-CA', code: 'CAD' },
    AUD: { locale: 'en-AU', code: 'AUD' },
    AED: { locale: 'ar-AE', code: 'AED' },
  };

  const matched = map[upper] || map[curr];

  try {
    if (matched) {
      return new Intl.NumberFormat(matched.locale, {
        style: 'currency',
        currency: matched.code,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      }).format(value);
    }
    
    if (/^[A-Z]{3}$/.test(upper)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: upper,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      }).format(value);
    }

    return `${curr} ${value.toLocaleString()}`;
  } catch {
    return `${curr} ${value}`;
  }
};
