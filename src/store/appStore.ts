import { create } from 'zustand';
import { User, Job, Invoice, Company, JobStatus, InvoiceStatus, InvoiceLineItem } from '../types';
import { supabase } from '../lib/supabase';
import { addDays } from '../utils/formatters';

type RegisterResult = 'ok' | 'confirm_email' | 'error';

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
    lineItems: row.line_items as InvoiceLineItem[],
    subtotalExVat: Number(row.subtotal_ex_vat),
    vat: Number(row.vat),
    total: Number(row.total),
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
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
    trialEndsAt: row.trial_ends_at ?? undefined,
    subscriptionStatus: row.subscription_status ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
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

// ── Store interface ────────────────────────────────────────────────────────

interface AppState {
  currentUser: User | null;
  companyId: string | null;
  users: User[];
  jobs: Job[];
  invoices: Invoice[];
  company: Company | null;
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
  createStripeCheckout: () => Promise<string>;

  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus, hours?: number, materials?: number) => Promise<void>;

  generateInvoice: (jobId: string, hours: number, materials: number) => Promise<Invoice>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;

  updateCompany: (updates: Partial<Company>) => Promise<void>;

  addTechnician: (name: string, email: string, phone: string) => Promise<void>;
  removeTechnician: (userId: string) => Promise<void>;
}

// ── Store implementation ───────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  companyId: null,
  users: [],
  jobs: [],
  invoices: [],
  company: null,
  loading: false,
  initialized: false,

  initSession: async () => {
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
  },

  createStripeCheckout: async () => {
    const { data, error } = await supabase.functions.invoke('create-stripe-checkout', { body: {} });
    if (error) throw new Error(error.message);
    return data.url as string;
  },

  login: async (emailOrPhone, password) => {
    set({ loading: true });
    try {
      let email = emailOrPhone.trim();

      // Phone number → look up email via DB function
      if (/^\+?[\d\s]+$/.test(email) && !email.includes('@')) {
        const { data: foundEmail } = await supabase.rpc('get_email_by_phone', {
          p_phone: email.replace(/\s/g, ''),
        });
        if (!foundEmail) { set({ loading: false }); return false; }
        email = foundEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
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

    set({ currentUser, companyId: profileData.company_id });

    // Company
    if (profileData.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .single();

      if (companyData) set({ company: mapCompany(companyData) });
    }

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
    }
  },

  addJob: async (jobData) => {
    const { companyId } = get();
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
      })
      .select('*, technician:profiles!assigned_technician_id(name)')
      .single();

    if (!error && data) {
      set((state) => ({ jobs: [...state.jobs, mapJob(data)] }));
    }
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
      await get().generateInvoice(jobId, hours ?? 1, materials ?? 0);
    }
  },

  generateInvoice: async (jobId, hours, materials) => {
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
    if (company.calloutFee > 0) lineItems.push({ description: 'Fremmøtegebyr', amount: company.calloutFee });

    const subtotalExVat = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const vat = Math.round(subtotalExVat * 25) / 100;
    const total = subtotalExVat + vat;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        job_id: jobId,
        invoice_number: invoiceNumber,
        customer_name: job.customerName,
        customer_address: job.address,
        line_items: lineItems,
        subtotal_ex_vat: subtotalExVat,
        vat,
        total,
        status: 'sent',
        due_date: addDays(company.paymentTermsDays),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const invoice = mapInvoice(data);
    set((state) => ({ invoices: [invoice, ...state.invoices] }));
    return invoice;
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    await supabase.from('invoices').update({ status }).eq('id', invoiceId);
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, status } : inv
      ),
    }));
  },

  updateCompany: async (updates) => {
    const { companyId } = get();
    await supabase
      .from('companies')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.orgNumber !== undefined && { org_number: updates.orgNumber }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.hourlyRate !== undefined && { hourly_rate: updates.hourlyRate }),
        ...(updates.calloutFee !== undefined && { callout_fee: updates.calloutFee }),
        ...(updates.paymentTermsDays !== undefined && { payment_terms_days: updates.paymentTermsDays }),
      })
      .eq('id', companyId);

    set((state) => ({
      company: state.company ? { ...state.company, ...updates } : null,
    }));
  },

  addTechnician: async (name, email, phone) => {
    const { error } = await supabase.functions.invoke('invite-technician', {
      body: { name, email, phone },
    });
    if (error) throw new Error(error.message);
  },

  removeTechnician: async (userId) => {
    await supabase.from('profiles').delete().eq('id', userId);
    set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
  },
}));
