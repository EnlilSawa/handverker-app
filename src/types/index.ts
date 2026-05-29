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
  lineItems: InvoiceLineItem[];
  subtotalExVat: number;
  vat: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface JobImage {
  id: string;
  jobId: string;
  companyId: string | null;
  imageUrl: string;
  label: 'før' | 'etter' | null;
  uploadedAt: string;
}

export interface JobNote {
  id: string;
  jobId: string;
  content: string;
  authorName: string;
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
  trialEndsAt?: string;
  subscriptionStatus?: SubscriptionStatus;
  onboardingCompleted?: boolean;
}
