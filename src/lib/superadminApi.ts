import { supabase } from './supabase';

// ── Superadmin-gate (klient) ─────────────────────────────────────────────────
// Styrer KUN om "Admin"-lenken/siden vises. Reell tilgang håndheves server-side
// av is_superadmin() inni hver RPC (se supabase/migration_v17.sql).
export const SUPERADMIN_EMAIL = (process.env.EXPO_PUBLIC_SUPERADMIN_EMAIL ?? '')
  .toLowerCase()
  .trim();

export function isSuperadminEmail(email?: string | null): boolean {
  if (!SUPERADMIN_EMAIL || !email) return false;
  return email.toLowerCase().trim() === SUPERADMIN_EMAIL;
}

// ── Typer ────────────────────────────────────────────────────────────────────
export type BillingStatus = 'ikke_fakturert' | 'fakturert' | 'betalt';
export type Plan = 'liten' | 'middels' | 'stor';
export type SubStatus = 'trial' | 'active' | 'expired' | 'canceled';

export interface SuperadminMetrics {
  activeCount: number;
  trialCount: number;
  canceledCount: number;
  mrr: number;
}

export interface SuperadminCompany {
  id: string;
  name: string;
  orgNumber: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  plan: Plan | null;
  monthlyAmount: number;
  subscriptionStatus: SubStatus;
  billingStatus: BillingStatus;
  createdAt: string;
  trialEndsAt: string | null;
  nextInvoiceDate: string | null;
  lastInvoicedDate: string | null;
  lastPaidDate: string | null;
  archivedAt: string | null;
  technicianCount: number;
  adminCount: number;
  jobCount: number;
  invoiceCount: number;
}

// ── Etiketter / standardpriser (samsvarer med efero.app/priser) ──────────────
export const PLAN_LABELS: Record<Plan, string> = {
  liten: 'Liten',
  middels: 'Middels',
  stor: 'Stor',
};

export const PLAN_PRICES: Record<Plan, number> = {
  liten: 399,
  middels: 899,
  stor: 1499,
};

export const SUB_STATUS_LABELS: Record<SubStatus, string> = {
  trial: 'Prøveperiode',
  active: 'Aktiv',
  expired: 'Utløpt',
  canceled: 'Sagt opp',
};

export const BILLING_LABELS: Record<BillingStatus, string> = {
  ikke_fakturert: 'Ikke fakturert',
  fakturert: 'Fakturert',
  betalt: 'Betalt',
};

// ── Mappere ──────────────────────────────────────────────────────────────────
function mapCompany(row: any): SuperadminCompany {
  return {
    id: row.id,
    name: row.name,
    orgNumber: row.org_number ?? null,
    contactPerson: row.contact_person ?? null,
    contactEmail: row.contact_email ?? null,
    plan: (row.subscription_plan ?? null) as Plan | null,
    monthlyAmount: Number(row.monthly_amount ?? 0),
    subscriptionStatus: (row.subscription_status ?? 'trial') as SubStatus,
    billingStatus: (row.billing_status ?? 'ikke_fakturert') as BillingStatus,
    createdAt: row.created_at,
    trialEndsAt: row.trial_ends_at ?? null,
    nextInvoiceDate: row.next_invoice_date ?? null,
    lastInvoicedDate: row.last_invoiced_date ?? null,
    lastPaidDate: row.last_paid_date ?? null,
    archivedAt: row.archived_at ?? null,
    technicianCount: Number(row.technician_count ?? 0),
    adminCount: Number(row.admin_count ?? 0),
    jobCount: Number(row.job_count ?? 0),
    invoiceCount: Number(row.invoice_count ?? 0),
  };
}

// ── RPC-innpakkere ───────────────────────────────────────────────────────────
export async function fetchMetrics(): Promise<SuperadminMetrics> {
  const { data, error } = await supabase.rpc('superadmin_metrics');
  if (error) throw new Error(error.message);
  return {
    activeCount: Number(data?.active_count ?? 0),
    trialCount: Number(data?.trial_count ?? 0),
    canceledCount: Number(data?.canceled_count ?? 0),
    mrr: Number(data?.mrr ?? 0),
  };
}

export async function fetchCompanies(): Promise<SuperadminCompany[]> {
  const { data, error } = await supabase.rpc('superadmin_companies');
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(mapCompany);
}

export async function setBillingStatus(
  companyId: string,
  status: BillingStatus,
): Promise<void> {
  const { error } = await supabase.rpc('superadmin_set_billing_status', {
    p_company_id: companyId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export interface UpdateCompanyPatch {
  plan?: Plan;
  monthlyAmount?: number;
  subscriptionStatus?: SubStatus;
  extendTrialDays?: number;
  nextInvoiceDate?: string;
}

export async function updateCompany(
  companyId: string,
  patch: UpdateCompanyPatch,
): Promise<void> {
  const { error } = await supabase.rpc('superadmin_update_company', {
    p_company_id: companyId,
    p_plan: patch.plan ?? null,
    p_monthly_amount: patch.monthlyAmount ?? null,
    p_subscription_status: patch.subscriptionStatus ?? null,
    p_extend_trial_days: patch.extendTrialDays ?? null,
    p_next_invoice_date: patch.nextInvoiceDate ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setArchived(companyId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.rpc('superadmin_set_archived', {
    p_company_id: companyId,
    p_archived: archived,
  });
  if (error) throw new Error(error.message);
}

export async function deleteCompany(companyId: string): Promise<void> {
  const { error } = await supabase.rpc('superadmin_delete_company', {
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
}

export interface CreateCompanyInput {
  companyName: string;
  contactName: string;
  adminEmail: string;
  password: string;
  orgNumber?: string;
  hourlyRate?: number;
  plan?: Plan;
  monthlyAmount?: number;
}

export async function createCompany(
  input: CreateCompanyInput,
): Promise<{ companyId: string; email: string; companyName: string }> {
  const { data, error } = await supabase.rpc('superadmin_create_company', {
    p_company_name: input.companyName,
    p_contact_name: input.contactName,
    p_admin_email: input.adminEmail,
    p_password: input.password,
    p_org_number: input.orgNumber?.trim() || null,
    p_hourly_rate: input.hourlyRate ?? 0,
    p_subscription_plan: input.plan ?? null,
    p_monthly_amount: input.monthlyAmount ?? 0,
  });
  if (error) throw new Error(error.message);
  return { companyId: data.company_id, email: data.email, companyName: data.company_name };
}

export async function sendCustomerInvite(input: {
  email: string;
  password: string;
  companyName: string;
  contactName?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-customer-invite', {
    body: {
      email: input.email,
      password: input.password,
      companyName: input.companyName,
      contactName: input.contactName ?? '',
    },
  });
  if (error) throw new Error(await edgeErrorMessage(error));
}

// supabase.functions.invoke gir en intetsigende «Edge Function returned a non-2xx
// status code». Den ekte feilen ligger i respons-body → hent den fram.
async function edgeErrorMessage(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return body.error;
    }
  } catch {
    /* faller tilbake til generisk melding */
  }
  return error?.message ?? 'Ukjent feil ved sending';
}

// Leselig midlertidig passord (uten tvetydige tegn som 0/O/1/l/I).
export function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  let out = '';
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// Send innlogging på nytt til en allerede opprettet kunde: tilbakestiller
// admin-passordet til et nytt midlertidig passord og sender innloggings-e-posten.
// Returnerer e-post + det nye passordet så eieren også kan dele det manuelt.
export async function resendCustomerLogin(
  companyId: string,
): Promise<{ email: string; password: string; companyName: string }> {
  const password = generateTempPassword();
  const { data, error } = await supabase.rpc('superadmin_reset_company_login', {
    p_company_id: companyId,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  const email = data.email as string;
  const companyName = data.company_name as string;
  await sendCustomerInvite({
    email,
    password,
    companyName,
    contactName: (data.contact_name as string) ?? '',
  });
  return { email, password, companyName };
}

export async function exportCompanyData(companyId: string): Promise<any> {
  const { data, error } = await supabase.rpc('superadmin_export_company', {
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ── CSV-eksport (web) ────────────────────────────────────────────────────────
export function companiesToCsv(rows: SuperadminCompany[]): string {
  const header = [
    'Bedriftsnavn',
    'Org.nr',
    'Kontaktperson',
    'E-post',
    'Pakke',
    'Beløp (kr/mnd)',
    'Abonnement',
    'Faktureringsstatus',
    'Faktureringsdato',
    'Sist fakturert',
    'Sist betalt',
  ];
  const esc = (val: string | number | null | undefined): string => {
    const s = val == null ? '' : String(val);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((c) =>
    [
      c.name,
      c.orgNumber,
      c.contactPerson,
      c.contactEmail,
      c.plan ? PLAN_LABELS[c.plan] : '',
      c.monthlyAmount,
      SUB_STATUS_LABELS[c.subscriptionStatus],
      BILLING_LABELS[c.billingStatus],
      c.nextInvoiceDate ?? '',
      c.lastInvoicedDate ?? '',
      c.lastPaidDate ?? '',
    ]
      .map(esc)
      .join(';'),
  );
  // Semikolon-separert + BOM → åpner rett i norsk Excel.
  return '﻿' + [header.join(';'), ...lines].join('\r\n');
}

// Faktura-CSV fra rå eksport-rader (snake_case fra superadmin_export_company).
// Semikolon + BOM → åpner rett i norsk Excel for kundens regnskap.
export function invoicesToCsv(rows: any[]): string {
  const header = [
    'Fakturanr', 'Dato', 'Kunde', 'E-post', 'Beløp eks. mva', 'MVA', 'Total', 'Status', 'Forfall', 'Notat',
  ];
  const esc = (val: unknown): string => {
    const s = val == null ? '' : String(val);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const day = (d: unknown) => (d ? String(d).slice(0, 10) : '');
  const lines = rows.map((r) =>
    [
      r.invoice_number, day(r.created_at), r.customer_name, r.customer_email,
      r.subtotal_ex_vat, r.vat, r.total, r.status, day(r.due_date), r.note,
    ].map(esc).join(';'),
  );
  return '﻿' + [header.join(';'), ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): boolean {
  return downloadBlob(filename, csv, 'text/csv;charset=utf-8;');
}

export function downloadJson(filename: string, obj: unknown): boolean {
  return downloadBlob(filename, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8;');
}

function downloadBlob(filename: string, content: string, mime: string): boolean {
  if (typeof document === 'undefined') return false; // ikke web
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
