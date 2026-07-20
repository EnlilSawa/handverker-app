// Native fallback — uses expo-print + expo-sharing
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Company } from '../types';
import { generateInvoiceHtml } from './invoiceHtml';

export async function viewInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<void> {
  await Print.printAsync({ html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber) });
}

// Returns the invoice PDF as base64 (no data: prefix) for e-mail attachment.
export async function generateInvoicePdfBase64(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<string> {
  const { base64 } = await Print.printToFileAsync({
    html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber),
    base64: true,
  });
  return base64 ?? '';
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: Company | null,
  linkedInvoiceNumber?: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: generateInvoiceHtml(invoice, company, linkedInvoiceNumber),
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
