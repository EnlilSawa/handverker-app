// Native fallback — uses expo-print + expo-sharing
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Company } from '../types';
import { generateInvoiceHtml } from './invoiceHtml';

export async function viewInvoicePdf(invoice: Invoice, company: Company | null): Promise<void> {
  await Print.printAsync({ html: generateInvoiceHtml(invoice, company) });
}

export async function downloadInvoicePdf(invoice: Invoice, company: Company | null): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: generateInvoiceHtml(invoice, company),
    base64: false,
  });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Faktura ${invoice.invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
