// Intl.NumberFormat('nb-NO') bruker U+2212 (typografisk minus) for negative tall og
// NBSP/NNBSP som tusenskilletegn. jsPDF-standardfontene (WinAnsi-koding) mangler
// U+2212 → PDF-en viser søppeltegn (f.eks. «"5 700 kr»). Normaliser til vanlig
// bindestrek (U+002D) og vanlig mellomrom — visuelt identisk, trygt overalt.
export const toPdfSafeNumber = (s: string): string =>
  s.replace(/\u2212/g, '-').replace(/[\u00A0\u202F]/g, ' ');

export const formatCurrency = (amount: number): string => {
  return (
    toPdfSafeNumber(
      new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount),
    ) + ' kr'
  );
};

// Beløp på faktura-PDF/HTML — samme Intl-opsjoner som PDF/HTML-malene alltid har
// brukt (viser ører når de finnes), men med pdf-trygge tegn.
export const formatInvoiceAmount = (amount: number): string =>
  toPdfSafeNumber(new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(amount)) +
  ' kr';

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (dateStr: string): string => {
  return `${formatShortDate(dateStr)} kl. ${formatTime(dateStr)}`;
};

export const todayISO = (): string => new Date().toISOString().split('T')[0];

export const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const isToday = (dateStr: string): boolean => {
  return dateStr.startsWith(todayISO());
};

export const isThisMonth = (dateStr: string): boolean => {
  const now = new Date();
  const date = new Date(dateStr);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};
