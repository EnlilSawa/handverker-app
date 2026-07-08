import { create } from 'zustand';
import { User, Job, Invoice, Company, JobStatus, InvoiceStatus, InvoiceLineItem, JobImage, JobNote, Customer, Quote, QuoteLine, QuoteStatus, AppNotification } from '../types';
import { supabase } from '../lib/supabase';
import { addDays } from '../utils/formatters';
import { generateInvoicePdfBase64 } from '../utils/generatePdf';

type RegisterResult = 'ok' | 'confirm_email' | 'error';

// Tilfeldig, ugjettbart filsti-token. Brukes for opplastinger så company_id/job_id
// IKKE bygges inn i offentlige storage-URL-er (audit #6 — ID-lekkasje).
function randomToken(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// ── DB row → TypeScript type mappers ──────────────────────────────────────

function mapJob(row: any): Job {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? '',
    address: row.address,
    description: row.description,
    assignedTechnicianId: row.assigned_technician_id ?? null,
    assignedTechnicianName: row.technician?.name ?? null,
    scheduledAt: row.scheduled_at,
    status: row.status,
    customerId: row.customer_id ?? null,
    hoursWorked: row.hours_worked != null ? Number(row.hours_worked) : undefined,
    materials: row.materials_cost != null ? Number(row.materials_cost) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    jobId: row.job_id ?? '',
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerEmail: row.customer_email ?? null,
    lineItems: row.line_items as InvoiceLineItem[],
    subtotalExVat: Number(row.subtotal_ex_vat),
    vat: Number(row.vat),
    total: Number(row.total),
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    note: row.note ?? null,
    emailStatus: row.email_status ?? null,
    reminderCount: row.reminder_count ?? 0,
    lastReminderSentAt: row.last_reminder_sent_at ?? null,
  };
}

function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    orgNumber: row.org_number ?? '',
    address: row.address ?? '',
    hourlyRate: Number(row.hourly_rate),
    calloutFee: Number(row.callout_fee),
    paymentTermsDays: Number(row.payment_terms_days),
    email: row.email ?? null,
    logoUrl: row.logo_url ?? null,
    accountNumber: row.account_number ?? null,
    trialEndsAt: row.trial_ends_at ?? undefined,
    subscriptionStatus: row.subscription_status ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
    notifyReminder3days: row.notify_reminder_3days ?? true,
    notifyDueToday: row.notify_due_today ?? true,
    notifyOverdue1day: row.notify_overdue_1day ?? true,
    notifyOverdue7days: row.notify_overdue_7days ?? true,
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    role: row.role,
  };
}

function mapQuote(row: any): Quote {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone ?? null,
    customerAddress: row.customer_address ?? null,
    title: row.title,
    description: row.description ?? null,
    lines: (row.lines ?? []) as QuoteLine[],
    subtotalExVat: Number(row.subtotal_ex_vat),
    vat: Number(row.vat),
    totalAmount: Number(row.total_amount),
    status: row.status as QuoteStatus,
    validUntil: row.valid_until,
    quoteNumber: row.quote_number ?? '',
    acceptedByName: row.accepted_by_name ?? null,
    acceptedAt: row.accepted_at ?? null,
    declinedReason: row.declined_reason ?? null,
    jobId: row.job_id ?? null,
    createdAt: row.created_at,
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    createdAt: row.created_at,
  };
}

function mapAppNotification(row: any): AppNotification {
  return {
    id: row.id,
    companyId: row.company_id,
    invoiceId: row.invoice_id ?? null,
    type: row.type,
    message: row.message,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

function mapJobImage(row: any): JobImage {
  return {
    id: row.id,
    jobId: row.job_id,
    companyId: row.company_id ?? null,
    imageUrl: row.image_url,
    label: row.label ?? null,
    note: row.note ?? null,
    uploadedBy: row.uploaded_by ?? null,
    uploadedAt: row.uploaded_at,
  };
}

// ── Store interface ────────────────────────────────────────────────────────

interface AppState {
  currentUser: User | null;
  companyId: string | null;
  users: User[];
  jobs: Job[];
  invoices: Invoice[];
  company: Company | null;
  quotes: Quote[];
  customers: Customer[];
  appNotifications: AppNotification[];
  pendingInvoicePreview: string | null;
  jobImages: Record<string, JobImage[]>;
  jobNotes: Record<string, JobNote[]>;
  loading: boolean;
  initialized: boolean;

  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadData: () => Promise<void>;
  initSession: () => Promise<void>;

  register: (name: string, email: string, phone: string, password: string) => Promise<RegisterResult>;
  setupCompany: (data: {
    name: string; orgNumber: string; address: string;
    hourlyRate: number; calloutFee: number; paymentTermsDays: number;
  }) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>, customerEmail?: string) => Promise<Job | null>;
  updateJobStatus: (jobId: string, status: JobStatus, hours?: number, materials?: number) => Promise<void>;
  assignTechnician: (jobId: string, technicianId: string | null, technicianName: string | null) => Promise<void>;

  generateInvoice: (jobId: string, hours: number, materials: number, note?: string, extraLines?: { description: string; amount: number }[]) => Promise<Invoice>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  sendInvoiceEmail: (invoiceId: string) => Promise<string>;
  sendPaymentReminder: (invoiceId: string) => Promise<void>;
  sendWelcomeEmail: () => Promise<void>;

  updateCompany: (updates: Partial<Company>) => Promise<void>;
  uploadCompanyLogo: (uri: string, mimeType: string) => Promise<void>;

  addTechnician: (name: string, email: string, phone: string, password: string) => Promise<void>;
  resetTechnicianPassword: (userId: string, newPassword: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  removeTechnician: (userId: string) => Promise<void>;

  updateJob: (jobId: string, updates: {
    customerName?: string; customerPhone?: string;
    address?: string; description?: string; scheduledAt?: string;
  }) => Promise<void>;

  setJobCustomerEmail: (jobId: string, email: string) => Promise<void>;

  loadQuotes: () => Promise<void>;
  createQuote: (data: Omit<Quote, 'id'|'companyId'|'quoteNumber'|'status'|'acceptedByName'|'acceptedAt'|'declinedReason'|'jobId'|'createdAt'>) => Promise<Quote>;
  updateQuoteStatus: (id: string, status: QuoteStatus, extra?: { acceptedByName?: string; declinedReason?: string }) => Promise<void>;
  convertQuoteToJob: (quoteId: string) => Promise<void>;
  sendQuoteEmail: (quoteId: string) => Promise<void>;

  loadCustomers: () => Promise<void>;
  createCustomer: (name: string, phone?: string, address?: string, email?: string) => Promise<Customer>;
  updateCustomer: (id: string, updates: { name?: string; phone?: string; email?: string; address?: string }) => Promise<void>;
  getOrCreateCustomer: (name: string, phone?: string, address?: string, email?: string) => Promise<string | null>;

  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setPendingInvoicePreview: (invoiceId: string | null) => void;
  updateNotificationSettings: (settings: {
    notifyReminder3days?: boolean;
    notifyDueToday?: boolean;
    notifyOverdue1day?: boolean;
    notifyOverdue7days?: boolean;
  }) => Promise<void>;

  loadJobImages: (jobId: string) => Promise<void>;
  uploadJobImage: (jobId: string, uri: string, mimeType: string, label?: 'før' | 'etter' | null, note?: string) => Promise<void>;

  loadJobNotes: (jobId: string) => Promise<void>;
  addJobNote: (jobId: string, content: string) => Promise<void>;
}

// ── Store implementation ───────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  companyId: null,
  users: [],
  jobs: [],
  invoices: [],
  company: null,
  quotes: [],
  customers: [],
  appNotifications: [],
  pendingInvoicePreview: null,
  jobImages: {},
  jobNotes: {},
  loading: false,
  initialized: false,

  initSession: async () => {
    // På web kan URL-tokens fra e-postbekreftelse trenge et øyeblikk å prosessere
    // før getSession() finner dem. onAuthStateChange i RootNavigator tar over
    // hvis SIGNED_IN eventet kommer etter initialized er satt.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await get().loadData();
    }
    set({ initialized: true });
  },

  register: async (name, email, phone, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { name, phone } },
      });
      set({ loading: false });
      if (error) return 'error';
      if (data.session) {
        await get().loadData();
        return 'ok';
      }
      return 'confirm_email';
    } catch {
      set({ loading: false });
      return 'error';
    }
  },

  setupCompany: async (data) => {
    const { error } = await supabase.rpc('setup_company', {
      p_name: data.name,
      p_org_number: data.orgNumber,
      p_address: data.address,
      p_hourly_rate: data.hourlyRate,
      p_callout_fee: data.calloutFee,
      p_payment_terms_days: data.paymentTermsDays,
    });
    if (error) throw new Error(error.message);
    await get().loadData();

    // Velkomst-e-post (ikke-blokkerende — onboarding fullføres uansett om e-post feiler).
    // Mottaker/bedrift utledes server-side fra JWT-en; ingen klient-oppgitte felter.
    get().sendWelcomeEmail().catch((e) => console.warn('Velkomst-e-post feilet:', e));
  },

  completeOnboarding: async () => {
    const { error } = await supabase.rpc('complete_onboarding');
    if (error) throw new Error(error.message);
    set((state) => ({
      company: state.company ? { ...state.company, onboardingCompleted: true } : state.company,
    }));
  },

  login: async (emailOrPhone, password) => {
    set({ loading: true });
    try {
      const input = emailOrPhone.trim();
      const isPhone = /^\+?[\d\s]+$/.test(input) && !input.includes('@');

      if (isPhone) {
        // Telefon-innlogging går via server-side edge function (audit #5): den slår
        // opp e-post + verifiserer passordet server-side og returnerer KUN en
        // session. Telefon→e-post eksponeres aldri som anonymt orakel.
        const { data, error } = await supabase.functions.invoke('phone-login', {
          body: { phone: input.replace(/\s/g, ''), password },
        });
        if (error || !data?.access_token) { set({ loading: false }); return false; }
        const { error: sessErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessErr) { set({ loading: false }); return false; }
        await get().loadData();
        set({ loading: false });
        return true;
      }

      // E-post + passord (uendret)
      const { error } = await supabase.auth.signInWithPassword({
        email: input.toLowerCase(),
        password,
      });
      if (error) { set({ loading: false }); return false; }
      await get().loadData();
      set({ loading: false });
      return true;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({
      currentUser: null,
      companyId: null,
      users: [],
      jobs: [],
      invoices: [],
      company: null,
    });
  },

  loadData: async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) return;

    const currentUser: User = {
      id: profileData.id,
      name: profileData.name,
      email: authData.user.email ?? profileData.email ?? '',
      phone: profileData.phone ?? '',
      role: profileData.role,
    };

    // Company hentes FØR vi setter state, slik at currentUser/companyId/company
    // settes atomisk i ett set(). Ellers finnes et mellomrender der companyId er
    // satt men company=null — som får RootNavigator-gaten til å bytte til
    // AdminNavigator et øyeblikk og unmounte onboarding-veiviseren (som da mister
    // suksess-steget og resettes til steg 1).
    let company = null;
    if (profileData.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .single();

      if (companyData) company = mapCompany(companyData);
    }

    set({ currentUser, companyId: profileData.company_id, company });

    // Jobs (RLS filters automatically: admin sees all, technician sees own)
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*, technician:profiles!assigned_technician_id(name)')
      .order('scheduled_at', { ascending: true });

    if (jobsData) set({ jobs: jobsData.map(mapJob) });

    // Admin only: invoices + team
    if (profileData.role === 'admin') {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesData) set({ invoices: invoicesData.map(mapInvoice) });

      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profileData.company_id);

      if (usersData) set({ users: usersData.map(mapUser) });

      // Load quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: false });
      if (quotesData) set({ quotes: quotesData.map(mapQuote) });

      // Load customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('name', { ascending: true });
      if (customersData) set({ customers: customersData.map(mapCustomer) });

      // Load in-app notifications
      const { data: notifData } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (notifData) set({ appNotifications: notifData.map(mapAppNotification) });
    }
  },

  loadQuotes: async () => {
    const { companyId } = get();
    if (!companyId) return;
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error && data) set({ quotes: data.map(mapQuote) });
  },

  createQuote: async (data) => {
    const { companyId } = get();
    const { data: qNum } = await supabase.rpc('next_quote_number', { p_company_id: companyId });
    const { data: row, error } = await supabase
      .from('quotes')
      .insert({
        company_id: companyId,
        customer_id: data.customerId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        customer_address: data.customerAddress || null,
        title: data.title,
        description: data.description || null,
        lines: data.lines,
        subtotal_ex_vat: data.subtotalExVat,
        vat: data.vat,
        total_amount: data.totalAmount,
        valid_until: data.validUntil,
        quote_number: qNum,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const quote = mapQuote(row);
    set((state) => ({ quotes: [quote, ...state.quotes] }));
    return quote;
  },

  updateQuoteStatus: async (id, status, extra) => {
    const { error } = await supabase
      .from('quotes')
      .update({
        status,
        ...(extra?.acceptedByName && { accepted_by_name: extra.acceptedByName, accepted_at: new Date().toISOString() }),
        ...(extra?.declinedReason !== undefined && { declined_reason: extra.declinedReason }),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === id ? {
          ...q,
          status,
          acceptedByName: extra?.acceptedByName ?? q.acceptedByName,
          acceptedAt: extra?.acceptedByName ? new Date().toISOString() : q.acceptedAt,
          declinedReason: extra?.declinedReason ?? q.declinedReason,
        } : q
      ),
    }));
  },

  convertQuoteToJob: async (quoteId) => {
    const { quotes } = get();
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error('Tilbud ikke funnet');
    // Bruk jobben addJob returnerer direkte — IKKE jobs[length-1] (skjørt mot
    // samtidig lasting/omsortering).
    const newJob = await get().addJob({
      customerName: quote.customerName,
      customerPhone: quote.customerPhone ?? '',
      address: quote.customerAddress ?? '',
      description: `${quote.title}\n\n${quote.description ?? ''}`.trim(),
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      scheduledAt: new Date().toISOString(),
      status: 'new',
    }, quote.customerEmail ?? undefined);
    if (newJob) {
      await supabase.from('quotes').update({ job_id: newJob.id }).eq('id', quoteId);
      set((state) => ({
        quotes: state.quotes.map((q) => q.id === quoteId ? { ...q, jobId: newJob.id } : q),
      }));
    }
  },

  sendQuoteEmail: async (quoteId) => {
    const { error } = await supabase.functions.invoke('send-quote-email', { body: { quoteId } });
    if (error) throw new Error(`E-post feilet: ${error.message}`);
  },

  loadCustomers: async () => {
    const { companyId } = get();
    if (!companyId) return;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (!error && data) set({ customers: data.map(mapCustomer) });
  },

  createCustomer: async (name, phone, address, email) => {
    const { companyId } = get();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const customer = mapCustomer(data);
    set((state) => ({ customers: [...state.customers, customer].sort((a, b) => a.name.localeCompare(b.name)) }));
    return customer;
  },

  updateCustomer: async (id, updates) => {
    const patch: Record<string, string | null> = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.phone !== undefined) patch.phone = updates.phone.trim() || null;
    if (updates.email !== undefined) patch.email = updates.email.trim() || null;
    if (updates.address !== undefined) patch.address = updates.address.trim() || null;

    const { error } = await supabase.from('customers').update(patch).eq('id', id);
    if (error) throw new Error(error.message);

    set((state) => ({
      customers: state.customers
        .map((c) =>
          c.id === id
            ? {
                ...c,
                ...(updates.name !== undefined && { name: updates.name.trim() }),
                ...(updates.phone !== undefined && { phone: updates.phone.trim() || null }),
                ...(updates.email !== undefined && { email: updates.email.trim() || null }),
                ...(updates.address !== undefined && { address: updates.address.trim() || null }),
              }
            : c
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  getOrCreateCustomer: async (name, phone, address, email) => {
    const { companyId, customers } = get();
    if (!companyId) return null;
    // Match by phone first, then by name
    const normalPhone = phone?.trim();
    const normalName = name?.trim();
    const normalEmail = email?.trim() || undefined;
    let existing = normalPhone
      ? customers.find((c) => c.phone === normalPhone)
      : customers.find((c) => c.name.toLowerCase() === normalName?.toLowerCase());
    if (!existing && normalPhone) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone', normalPhone)
        .limit(1)
        .maybeSingle();
      if (data) existing = mapCustomer(data);
    }
    if (existing) {
      // Fyll inn e-post på en eksisterende kunde som mangler den (brukes til
      // faktura-utsending). Overskriver ALDRI en e-post som allerede finnes.
      if (normalEmail && !existing.email) {
        try { await get().updateCustomer(existing.id, { email: normalEmail }); } catch {}
      }
      return existing.id;
    }
    // Create new
    try {
      const customer = await get().createCustomer(normalName ?? '', normalPhone, address, normalEmail);
      return customer.id;
    } catch { return null; }
  },

  addJob: async (jobData, customerEmail) => {
    const { companyId } = get();
    // Auto-create or link customer (med e-post hvis oppgitt — brukes til faktura)
    const customerId = await get().getOrCreateCustomer(
      jobData.customerName,
      jobData.customerPhone,
      jobData.address,
      customerEmail,
    );
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        customer_name: jobData.customerName,
        customer_phone: jobData.customerPhone,
        address: jobData.address,
        description: jobData.description,
        assigned_technician_id: jobData.assignedTechnicianId,
        scheduled_at: jobData.scheduledAt,
        status: jobData.status,
        customer_id: customerId,
      })
      .select('*, technician:profiles!assigned_technician_id(name)')
      .single();

    if (!error && data) {
      const job = mapJob(data);
      set((state) => ({ jobs: [...state.jobs, job] }));
      return job;
    }
    return null;
  },

  updateJobStatus: async (jobId, status, hours, materials) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({
        status,
        ...(hours != null && { hours_worked: hours }),
        ...(materials != null && { materials_cost: materials }),
      })
      .eq('id', jobId)
      .select('*, technician:profiles!assigned_technician_id(name)')
      .single();

    if (!error && data) {
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? mapJob(data) : j)),
      }));
    }

    if (status === 'completed') {
      try {
        await get().generateInvoice(jobId, hours ?? 1, materials ?? 0);
      } catch (invoiceError) {
        // Faktura feilet — rull tilbake jobbstatus til in_progress
        await supabase
          .from('jobs')
          .update({ status: 'in_progress', hours_worked: null, materials_cost: null })
          .eq('id', jobId);
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === jobId ? { ...j, status: 'in_progress' as const } : j
          ),
        }));
        throw invoiceError;
      }
    }
  },

  assignTechnician: async (jobId, technicianId, technicianName) => {
    const { error } = await supabase
      .from('jobs')
      .update({ assigned_technician_id: technicianId })
      .eq('id', jobId);

    if (error) throw new Error(error.message);

    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, assignedTechnicianId: technicianId, assignedTechnicianName: technicianName }
          : j
      ),
    }));
  },

  generateInvoice: async (jobId, hours, materials, note, extraLines) => {
    const { jobs, company, companyId } = get();
    const job = jobs.find((j) => j.id === jobId);
    if (!job || !company) throw new Error('Jobb ikke funnet');

    const { data: invoiceNumber } = await supabase.rpc('next_invoice_number', {
      company_id: companyId,
    });

    const lineItems: InvoiceLineItem[] = [
      {
        description: `Arbeidstimer (${hours}t × ${company.hourlyRate} kr)`,
        quantity: hours,
        unitPrice: company.hourlyRate,
        amount: hours * company.hourlyRate,
      },
    ];
    if (materials > 0) lineItems.push({ description: 'Materiell', amount: materials });
    if (extraLines?.length) lineItems.push(...extraLines);
    if (company.calloutFee > 0) lineItems.push({ description: 'Fremmøtegebyr', amount: company.calloutFee });

    const subtotalExVat = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const vat = Math.round(subtotalExVat * 25) / 100;
    const total = subtotalExVat + vat;

    // Hent kunde-e-post for påminnelser
    let customerEmail: string | null = null;
    if (job.customerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('email')
        .eq('id', job.customerId)
        .maybeSingle();
      customerEmail = cust?.email ?? null;
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        job_id: jobId,
        invoice_number: invoiceNumber,
        customer_name: job.customerName,
        customer_address: job.address,
        customer_email: customerEmail,
        line_items: lineItems,
        subtotal_ex_vat: subtotalExVat,
        vat,
        total,
        status: 'sent',
        due_date: addDays(company.paymentTermsDays),
        note: note?.trim() || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const invoice = mapInvoice(data);
    set((state) => ({ invoices: [invoice, ...state.invoices] }));

    // Send faktura-e-post automatisk (ikke-blokkerende). Status lagres på fakturaen;
    // feiler den, vises "Send på nytt" på fakturasiden.
    if (customerEmail) {
      get().sendInvoiceEmail(invoice.id).catch((e) => console.warn('Faktura-e-post feilet:', e));
    }

    return invoice;
  },

  sendInvoiceEmail: async (invoiceId) => {
    const { invoices, company, jobs, customers } = get();
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error('Faktura ikke funnet');

    // Mottaker = kundens NÅVÆRENDE e-post (kunden kan ha fått e-post lagt til etter
    // at fakturaen ble generert). Jobb → customer_id (eller telefon-match) → customers.email.
    const job = jobs.find((j) => j.id === invoice.jobId);
    const cust = job
      ? customers.find(
          (c) =>
            (job.customerId && c.id === job.customerId) ||
            (job.customerPhone && c.phone === job.customerPhone),
        )
      : undefined;
    const to = cust?.email || invoice.customerEmail || null;
    if (!to) throw new Error('Kunden har ingen e-postadresse. Legg den til på kunden først.');

    // Synk fakturaens mottaker i DB — edge-funksjonen sender til invoice.customer_email.
    if (to !== invoice.customerEmail) {
      await supabase.from('invoices').update({ customer_email: to }).eq('id', invoiceId);
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, customerEmail: to } : inv,
        ),
      }));
    }

    try {
      const pdfBase64 = await generateInvoicePdfBase64({ ...invoice, customerEmail: to }, company);
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId, pdfBase64 },
      });
      if (error) throw new Error(error.message);

      await supabase.from('invoices').update({ email_status: 'sent' }).eq('id', invoiceId);
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, emailStatus: 'sent' } : inv,
        ),
      }));
      return to;
    } catch (e) {
      await supabase.from('invoices').update({ email_status: 'failed' }).eq('id', invoiceId);
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, emailStatus: 'failed' } : inv,
        ),
      }));
      throw e;
    }
  },

  sendPaymentReminder: async (invoiceId) => {
    const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
      body: { invoiceId },
    });
    if (error) throw new Error(error.message);
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              reminderCount: data?.reminderCount ?? (inv.reminderCount ?? 0) + 1,
              lastReminderSentAt: data?.lastReminderSentAt ?? new Date().toISOString(),
            }
          : inv,
      ),
    }));
  },

  sendWelcomeEmail: async () => {
    // Ingen body — edge-funksjonen utleder mottaker/bedrift fra JWT-en (sendes
    // automatisk av supabase.functions.invoke) server-side.
    const { error } = await supabase.functions.invoke('send-welcome-email', { body: {} });
    if (error) throw new Error(error.message);
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    await supabase.from('invoices').update({ status }).eq('id', invoiceId);
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, status } : inv
      ),
    }));

    if (status === 'paid') {
      const { companyId } = get();
      const invoice = get().invoices.find((i) => i.id === invoiceId);
      if (invoice && companyId) {
        const { data: row } = await supabase
          .from('app_notifications')
          .insert({
            company_id: companyId,
            invoice_id: invoiceId,
            type: 'payment_received',
            message: `${invoice.customerName} har betalt faktura ${invoice.invoiceNumber}`,
          })
          .select()
          .single();
        if (row) {
          set((state) => ({
            appNotifications: [mapAppNotification(row), ...state.appNotifications],
          }));
        }
      }
    }
  },

  updateCompany: async (updates) => {
    const { companyId } = get();
    const { error } = await supabase
      .from('companies')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.orgNumber !== undefined && { org_number: updates.orgNumber }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.hourlyRate !== undefined && { hourly_rate: updates.hourlyRate }),
        ...(updates.calloutFee !== undefined && { callout_fee: updates.calloutFee }),
        ...(updates.paymentTermsDays !== undefined && { payment_terms_days: updates.paymentTermsDays }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.accountNumber !== undefined && { account_number: updates.accountNumber }),
      })
      .eq('id', companyId);

    if (error) throw new Error(error.message);

    set((state) => ({
      company: state.company ? { ...state.company, ...updates } : null,
    }));
  },

  uploadCompanyLogo: async (uri, mimeType) => {
    const { companyId, company } = get();
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Kunne ikke lese bildefilen');
    const blob = await response.blob();
    const contentType = (blob.type && blob.type !== 'application/octet-stream') ? blob.type : mimeType;
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    // Tilfeldig sti (ingen company_id i URL-en, audit #6). Token sikrer også unik
    // URL → unngår browser-cache av gammel logo.
    const filePath = `logos/${randomToken()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, blob, { contentType, upsert: false });
    if (storageError) throw new Error(`Lagring feilet: ${storageError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('companies')
      .update({ logo_url: publicUrl })
      .eq('id', companyId);
    if (dbError) throw new Error(dbError.message);

    // Slett gammel logo fra Storage (best effort)
    if (company?.logoUrl) {
      const oldPath = company.logoUrl.split('/company-logos/')[1];
      if (oldPath) supabase.storage.from('company-logos').remove([oldPath]).catch(() => {});
    }

    set((state) => ({
      company: state.company ? { ...state.company, logoUrl: publicUrl } : null,
    }));
  },

  addTechnician: async (name, email, phone, password) => {
    const { data, error } = await supabase.rpc('create_technician_with_password', {
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_password: password,
    });
    if (error) throw new Error(error.message);
    set((state) => ({ users: [...state.users, mapUser(data)] }));
  },

  resetTechnicianPassword: async (userId, newPassword) => {
    const { error } = await supabase.rpc('reset_technician_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    });
    if (error) throw new Error(error.message);
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  requestPasswordReset: async (email) => {
    // På web sender vi brukeren tilbake hit etter klikk i e-posten; Supabase fyrer
    // da et PASSWORD_RECOVERY-event som RootNavigator fanger og viser ny-passord-skjerm.
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) throw new Error(error.message);
  },

  removeTechnician: async (userId) => {
    // Bruker SECURITY DEFINER-RPC: løsner teknikeren fra jobber (FK-trygt), sletter
    // profil OG auth-bruker atomisk. Tidligere ble feilen fra en direkte
    // profiles-delete svelget (FK-brudd hvis teknikeren hadde jobber) → raden ble
    // fjernet lokalt men ikke i DB, og teknikeren kom tilbake ved neste innlogging.
    const { error } = await supabase.rpc('remove_technician', { p_user_id: userId });
    if (error) throw new Error(error.message);
    // Frigjorte jobber speiles lokalt (ellers viser jobbtavlen fortsatt teknikeren).
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      jobs: state.jobs.map((j) =>
        j.assignedTechnicianId === userId
          ? { ...j, assignedTechnicianId: null, assignedTechnicianName: null }
          : j,
      ),
    }));
  },

  loadNotifications: async () => {
    const { companyId } = get();
    if (!companyId) return;
    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) set({ appNotifications: data.map(mapAppNotification) });
  },

  markNotificationRead: async (id) => {
    await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    set((state) => ({
      appNotifications: state.appNotifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
    }));
  },

  markAllNotificationsRead: async () => {
    const { companyId, appNotifications } = get();
    if (!companyId) return;
    const unread = appNotifications.filter((n) => !n.readAt);
    if (!unread.length) return;
    const now = new Date().toISOString();
    await supabase
      .from('app_notifications')
      .update({ read_at: now })
      .eq('company_id', companyId)
      .is('read_at', null);
    set((state) => ({
      appNotifications: state.appNotifications.map((n) => ({ ...n, readAt: n.readAt ?? now })),
    }));
  },

  setPendingInvoicePreview: (invoiceId) => {
    set({ pendingInvoicePreview: invoiceId });
  },

  updateNotificationSettings: async (settings) => {
    const { companyId } = get();
    const dbFields: Record<string, boolean | undefined> = {};
    if (settings.notifyReminder3days !== undefined) dbFields.notify_reminder_3days = settings.notifyReminder3days;
    if (settings.notifyDueToday !== undefined) dbFields.notify_due_today = settings.notifyDueToday;
    if (settings.notifyOverdue1day !== undefined) dbFields.notify_overdue_1day = settings.notifyOverdue1day;
    if (settings.notifyOverdue7days !== undefined) dbFields.notify_overdue_7days = settings.notifyOverdue7days;
    const { error } = await supabase.from('companies').update(dbFields).eq('id', companyId);
    if (error) throw new Error(error.message);
    set((state) => ({
      company: state.company ? { ...state.company, ...settings } : null,
    }));
  },

  loadJobImages: async (jobId) => {
    // job-images-bucketen er privat (audit #6). Bildene hentes med korttidssignerte
    // URL-er fra edge-funksjonen `sign-job-images`, som autoriserer på firma og
    // signerer med service role. (`image_url` i svaret er allerede en signert URL.)
    const { data, error } = await supabase.functions.invoke('sign-job-images', {
      body: { jobId },
    });
    if (!error && data?.images) {
      set((state) => ({
        jobImages: { ...state.jobImages, [jobId]: data.images.map(mapJobImage) },
      }));
    }
    // Silently ignore — funksjon/tabell finnes kanskje ikke ennå
  },

  uploadJobImage: async (jobId, uri, mimeType, label, note) => {
    const { companyId, currentUser } = get();

    const response = await fetch(uri);
    if (!response.ok) throw new Error('Kunne ikke lese bildefilen');
    const blob = await response.blob();

    if (blob.size > 10 * 1024 * 1024) throw new Error('Bildet er for stort (maks 10MB)');

    const contentType = (blob.type && blob.type !== 'application/octet-stream')
      ? blob.type : (mimeType || 'image/jpeg');

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    // Tilfeldig, ugjettbar sti — ingen job_id i den offentlige URL-en (audit #6).
    const filePath = `${randomToken()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('job-images')
      .upload(filePath, blob, { contentType, upsert: false });

    if (storageError) throw new Error(`Lagring feilet: ${storageError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('job-images')
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('job_images')
      .insert({
        job_id: jobId,
        company_id: companyId,
        image_url: publicUrl,
        label: label ?? null,
        note: note?.trim() || null,
        uploaded_by: currentUser?.name ?? null,
      });

    if (dbError) throw new Error(`Database feilet: ${dbError.message}`);

    await get().loadJobImages(jobId);
  },

  updateJob: async (jobId, updates) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({
        ...(updates.customerName !== undefined && { customer_name: updates.customerName }),
        ...(updates.customerPhone !== undefined && { customer_phone: updates.customerPhone }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.scheduledAt !== undefined && { scheduled_at: updates.scheduledAt }),
      })
      .eq('id', jobId)
      .select('*, technician:profiles!assigned_technician_id(name)')
      .single();
    if (!error && data) {
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? mapJob(data) : j)),
      }));
    }
  },

  setJobCustomerEmail: async (jobId, email) => {
    const { jobs } = get();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const trimmed = email.trim();

    // Sørg for at jobben har en koblet kunde å henge e-posten på. Eldre jobber
    // (opprettet før auto-kobling) kan ha customer_id = null — da oppretter vi
    // kunden fra jobbens egne felter og kobler jobben til den.
    let customerId = job.customerId ?? null;
    if (!customerId) {
      customerId = await get().getOrCreateCustomer(
        job.customerName,
        job.customerPhone,
        job.address,
        trimmed || undefined,
      );
      if (customerId) {
        await supabase.from('jobs').update({ customer_id: customerId }).eq('id', jobId);
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, customerId } : j)),
        }));
      }
    }

    // Admin redigerer eksplisitt → sett e-posten (overskriver evt. eksisterende).
    if (customerId) {
      await get().updateCustomer(customerId, { email: trimmed });
    }
  },

  loadJobNotes: async (jobId) => {
    const { data, error } = await supabase
      .from('job_notes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      set((state) => ({
        jobNotes: {
          ...state.jobNotes,
          [jobId]: data.map((row: any) => ({
            id: row.id,
            jobId: row.job_id,
            content: row.content,
            authorName: row.author_name,
            authorRole: row.author_role ?? 'admin',
            createdAt: row.created_at,
          })),
        },
      }));
    }
    // Silently ignore if table doesn't exist yet
  },

  addJobNote: async (jobId, content) => {
    const { currentUser, companyId } = get();
    const { error } = await supabase
      .from('job_notes')
      .insert({
        job_id: jobId,
        company_id: companyId,
        content: content.trim(),
        author_name: currentUser?.name ?? 'Ukjent',
        author_role: currentUser?.role ?? 'admin',
      });
    if (error) throw new Error(error.message);
    // Last notater på nytt for korrekt rekkefølge og oppdatert store
    await get().loadJobNotes(jobId);
  },

}));
