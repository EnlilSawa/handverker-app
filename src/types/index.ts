export type UserRole = 'admin' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export type JobStatus = 'new' | 'in_progress' | 'completed';

export interface Job {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  description: string;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  scheduledAt: string;
  status: JobStatus;
  customerId?: string | null;
  hoursWorked?: number;
  materials?: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'sent' | 'paid' | 'overdue';

export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string;
  customerName: string;
  customerAddress: string;
  customerEmail?: string | null;
  lineItems: InvoiceLineItem[];
  subtotalExVat: number;
  vat: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  note?: string | null;
}

export interface QuoteLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Quote {
  id: string;
  companyId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string | null;
  title: string;
  description: string | null;
  lines: QuoteLine[];
  subtotalExVat: number;
  vat: number;
  totalAmount: number;
  status: QuoteStatus;
  validUntil: string;
  quoteNumber: string;
  acceptedByName: string | null;
  acceptedAt: string | null;
  declinedReason: string | null;
  jobId: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export type AppNotificationType = 'overdue_7days' | 'payment_received';

export interface AppNotification {
  id: string;
  companyId: string;
  invoiceId: string | null;
  type: AppNotificationType;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface JobImage {
  id: string;
  jobId: string;
  companyId: string | null;
  imageUrl: string;
  label: 'før' | 'etter' | null;
  note: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface JobNote {
  id: string;
  jobId: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

export interface Company {
  id?: string;
  name: string;
  orgNumber: string;
  address: string;
  hourlyRate: number;
  calloutFee: number;
  paymentTermsDays: number;
  logoUrl?: string | null;
  accountNumber?: string | null;
  trialEndsAt?: string;
  subscriptionStatus?: SubscriptionStatus;
  onboardingCompleted?: boolean;
  notifyReminder3days?: boolean;
  notifyDueToday?: boolean;
  notifyOverdue1day?: boolean;
  notifyOverdue7days?: boolean;
}
