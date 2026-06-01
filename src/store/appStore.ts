import { create } from 'zustand';
import { User, Job, Invoice, Company, JobStatus, InvoiceStatus, InvoiceLineItem, JobImage, JobNote, Customer } from '../types';
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
    lineItems: row.line_items as InvoiceLineItem[],
    subtotalExVat: Number(row.subtotal_ex_vat),
    vat: Number(row.vat),
    total: Number(row.total),
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    note: row.note ?? null,
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
    logoUrl: row.logo_url ?? null,
    accountNumber: row.account_number ?? null,
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

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    phone: row.phone ?? null,
    address: row.address ?? null,
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
  customers: Customer[];
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
  createStripeCheckout: () => Promise<string>;

  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus, hours?: number, materials?: number) => Promise<void>;
  assignTechnician: (jobId: string, technicianId: string | null, technicianName: string | null) => Promise<void>;

  generateInvoice: (jobId: string, hours: number, materials: number, note?: string, extraLines?: { description: string; amount: number }[]) => Promise<Invoice>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;

  updateCompany: (updates: Partial<Company>) => Promise<void>;
  uploadCompanyLogo: (uri: string, mimeType: string) => Promise<void>;

  addTechnician: (name: string, email: string, phone: string) => Promise<void>;
  removeTechnician: (userId: string) => Promise<void>;

  updateJob: (jobId: string, updates: {
    customerName?: string; customerPhone?: string;
    address?: string; description?: string; scheduledAt?: string;
  }) => Promise<void>;

  loadCustomers: () => Promise<void>;
  createCustomer: (name: string, phone?: string, address?: string) => Promise<Customer>;
  getOrCreateCustomer: (name: string, phone?: string, address?: string) => Promise<string | null>;

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
  customers: [],
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

      // Load customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('name', { ascending: true });
      if (customersData) set({ customers: customersData.map(mapCustomer) });
    }
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

  createCustomer: async (name, phone, address) => {
    const { companyId } = get();
    const { data, error } = await supabase
      .from('customers')
      .insert({ company_id: companyId, name: name.trim(), phone: phone?.trim() || null, address: address?.trim() || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const customer = mapCustomer(data);
    set((state) => ({ customers: [...state.customers, customer].sort((a, b) => a.name.localeCompare(b.name)) }));
    return customer;
  },

  getOrCreateCustomer: async (name, phone, address) => {
    const { companyId, customers } = get();
    if (!companyId) return null;
    // Match by phone first, then by name
    const normalPhone = phone?.trim();
    const normalName = name?.trim();
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
    if (existing) return existing.id;
    // Create new
    try {
      const customer = await get().createCustomer(normalName ?? '', normalPhone, address);
      return customer.id;
    } catch { return null; }
  },

  addJob: async (jobData) => {
    const { companyId } = get();
    // Auto-create or link customer
    const customerId = await get().getOrCreateCustomer(
      jobData.customerName,
      jobData.customerPhone,
      jobData.address
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
        note: note?.trim() || null,
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
    const { error } = await supabase
      .from('companies')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.orgNumber !== undefined && { org_number: updates.orgNumber }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.hourlyRate !== undefined && { hourly_rate: updates.hourlyRate }),
        ...(updates.calloutFee !== undefined && { callout_fee: updates.calloutFee }),
        ...(updates.paymentTermsDays !== undefined && { payment_terms_days: updates.paymentTermsDays }),
        ...(updates.accountNumber !== undefined && { account_number: updates.accountNumber }),
      })
      .eq('id', companyId);

    if (error) throw new Error(error.message);

    set((state) => ({
      company: state.company ? { ...state.company, ...updates } : null,
    }));
  },

  uploadCompanyLogo: async (uri, mimeType) => {
    const { companyId } = get();
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Kunne ikke lese bildefilen');
    const blob = await response.blob();
    const contentType = (blob.type && blob.type !== 'application/octet-stream') ? blob.type : mimeType;
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filePath = `${companyId}/logo.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, blob, { contentType, upsert: true });
    if (storageError) throw new Error(`Lagring feilet: ${storageError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('companies')
      .update({ logo_url: publicUrl })
      .eq('id', companyId);
    if (dbError) throw new Error(dbError.message);

    set((state) => ({
      company: state.company ? { ...state.company, logoUrl: publicUrl } : null,
    }));
  },

  addTechnician: async (name, email, phone) => {
    const { data, error } = await supabase.rpc('add_technician_to_team', {
      p_name: name,
      p_email: email,
      p_phone: phone,
    });
    if (error) throw new Error(error.message);
    set((state) => ({ users: [...state.users, mapUser(data)] }));
  },

  removeTechnician: async (userId) => {
    await supabase.from('profiles').delete().eq('id', userId);
    set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
  },

  loadJobImages: async (jobId) => {
    const { data, error } = await supabase
      .from('job_images')
      .select('*')
      .eq('job_id', jobId)
      .order('uploaded_at', { ascending: true });
    if (!error && data) {
      set((state) => ({
        jobImages: { ...state.jobImages, [jobId]: data.map(mapJobImage) },
      }));
    }
    // Silently ignore — table may not exist yet if migration hasn't run
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
    const filePath = `${jobId}/${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('job-images')
      .upload(filePath, blob, { contentType, upsert: false });

    if (storageError) throw new Error(`Lagring feilet: ${storageError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('job-images')
      .getPublicUrl(filePath);

    const { data, error: dbError } = await supabase
      .from('job_images')
      .insert({
        job_id: jobId,
        company_id: companyId,
        image_url: publicUrl,
        label: label ?? null,
        note: note?.trim() || null,
        uploaded_by: currentUser?.name ?? null,
      })
      .select()
      .single();

    if (dbError) throw new Error(`Database feilet: ${dbError.message}`);

    if (data) {
      set((state) => ({
        jobImages: {
          ...state.jobImages,
          [jobId]: [...(state.jobImages[jobId] ?? []), mapJobImage(data)],
        },
      }));
    }
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

  loadJobNotes: async (jobId) => {
    const { data, error } = await supabase
      .from('job_notes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      set((state) => ({
        jobNotes: {
          ...state.jobNotes,
          [jobId]: data.map((row: any) => ({
            id: row.id,
            jobId: row.job_id,
            content: row.content,
            authorName: row.author_name,
            createdAt: row.created_at,
          })),
        },
      }));
    }
    // Silently ignore if table doesn't exist yet
  },

  addJobNote: async (jobId, content) => {
    const { currentUser, companyId } = get();
    const { data, error } = await supabase
      .from('job_notes')
      .insert({
        job_id: jobId,
        company_id: companyId,
        content: content.trim(),
        author_name: currentUser?.name ?? 'Ukjent',
      })
      .select()
      .single();
    if (!error && data) {
      const note: JobNote = {
        id: data.id,
        jobId: data.job_id,
        content: data.content,
        authorName: data.author_name,
        createdAt: data.created_at,
      };
      set((state) => ({
        jobNotes: {
          ...state.jobNotes,
          [jobId]: [...(state.jobNotes[jobId] ?? []), note],
        },
      }));
    }
  },

}));
