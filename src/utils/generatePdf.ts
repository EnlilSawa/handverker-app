// Native fallback — uses expo-print + expo-sharing
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Company } from '../types';
import { generateInvoiceHtml, InvoicePdfExtras } from './invoiceHtml';

export async function viewInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<void> {
  await Print.printAsync({ html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber, extras) });
}

// Returns the invoice PDF as base64 (no data: prefix) for e-mail attachment.
export async function generateInvoicePdfBase64(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<string> {
  const { base64 } = await Print.printToFileAsync({
    html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber, extras),
    base64: true,
  });
  return base64 ?? '';
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
  extras?: InvoicePdfExtras,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber, extras),
    base64: false,
  });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${invoice.creditsInvoiceId ? 'Kreditnota' : 'Faktura'} ${invoice.invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
