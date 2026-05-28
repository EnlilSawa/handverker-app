import { create } from 'zustand';
import { User, Job, Invoice, Company, JobStatus, InvoiceStatus, InvoiceLineItem } from '../types';
import { addDays, todayISO } from '../utils/formatters';

const today = todayISO();

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Kjetil Hansen', email: 'kjetil@vvsservice.no', phone: '90000001', role: 'admin' },
  { id: 'u2', name: 'Magnus Olsen', email: 'magnus@vvsservice.no', phone: '90000002', role: 'technician' },
  { id: 'u3', name: 'Erik Berg', email: 'erik@vvsservice.no', phone: '90000003', role: 'technician' },
  { id: 'u4', name: 'Lars Johansen', email: 'lars@vvsservice.no', phone: '90000004', role: 'technician' },
];

const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    customerName: 'Anne Lindqvist',
    customerPhone: '91234567',
    address: 'Maridalsveien 45, 0458 Oslo',
    description: 'Lekkasje under kjøkkenbenk – vann renner ned i underskap.',
    assignedTechnicianId: 'u2',
    assignedTechnicianName: 'Magnus Olsen',
    scheduledAt: `${today}T09:00:00`,
    status: 'new',
    createdAt: `${today}T07:00:00`,
    updatedAt: `${today}T07:00:00`,
  },
  {
    id: 'j2',
    customerName: 'Per Andersen',
    customerPhone: '92345678',
    address: 'Bogstadveien 12, 0355 Oslo',
    description: 'Skifte varmtvannsbereder, 80L, gammel bereder lekker.',
    assignedTechnicianId: 'u3',
    assignedTechnicianName: 'Erik Berg',
    scheduledAt: `${today}T10:30:00`,
    status: 'in_progress',
    createdAt: `${today}T07:00:00`,
    updatedAt: `${today}T09:30:00`,
  },
  {
    id: 'j3',
    customerName: 'Hanne Mikkelsen',
    customerPhone: '93456789',
    address: 'Hegdehaugsveien 8, 0352 Oslo',
    description: 'Tett avløp på bad og gjenlukt fra sluk.',
    assignedTechnicianId: 'u2',
    assignedTechnicianName: 'Magnus Olsen',
    scheduledAt: `${today}T13:00:00`,
    status: 'new',
    createdAt: `${today}T07:00:00`,
    updatedAt: `${today}T07:00:00`,
  },
  {
    id: 'j4',
    customerName: 'Tor Haugen',
    customerPhone: '94567890',
    address: 'Frognerveien 55, 0266 Oslo',
    description: 'Installasjon av nytt dusjarrangement inkl. termostatbatteri.',
    assignedTechnicianId: 'u4',
    assignedTechnicianName: 'Lars Johansen',
    scheduledAt: `${today}T11:00:00`,
    status: 'completed',
    hoursWorked: 2.5,
    materials: 1200,
    createdAt: `${today}T07:00:00`,
    updatedAt: `${today}T14:00:00`,
  },
  {
    id: 'j5',
    customerName: 'Silje Dahl',
    customerPhone: '95678901',
    address: 'Drammensveien 102, 0273 Oslo',
    description: 'Trykktesting og inspeksjon av røranlegg etter kjellerstopp.',
    assignedTechnicianId: 'u3',
    assignedTechnicianName: 'Erik Berg',
    scheduledAt: `${today}T15:00:00`,
    status: 'new',
    createdAt: `${today}T08:00:00`,
    updatedAt: `${today}T08:00:00`,
  },
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2024-001',
    jobId: 'j4',
    customerName: 'Tor Haugen',
    customerAddress: 'Frognerveien 55, 0266 Oslo',
    lineItems: [
      { description: 'Arbeidstimer (2,5t × 895 kr)', quantity: 2.5, unitPrice: 895, amount: 2237.5 },
      { description: 'Materiell', amount: 1200 },
      { description: 'Fremmøtegebyr', amount: 350 },
    ],
    subtotalExVat: 3787.5,
    vat: 946.88,
    total: 4734.38,
    status: 'sent',
    dueDate: addDays(14),
    createdAt: `${today}T14:00:00`,
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2024-002',
    jobId: 'j0',
    customerName: 'Bjørn Nilsen',
    customerAddress: 'Slemdalsveien 70, 0373 Oslo',
    lineItems: [
      { description: 'Arbeidstimer (3t × 895 kr)', quantity: 3, unitPrice: 895, amount: 2685 },
      { description: 'Materiell', amount: 850 },
      { description: 'Fremmøtegebyr', amount: 350 },
    ],
    subtotalExVat: 3885,
    vat: 971.25,
    total: 4856.25,
    status: 'paid',
    dueDate: addDays(-5),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2024-003',
    jobId: 'j0b',
    customerName: 'Randi Sørensen',
    customerAddress: 'Kirkeveien 14, 0153 Oslo',
    lineItems: [
      { description: 'Arbeidstimer (1,5t × 895 kr)', quantity: 1.5, unitPrice: 895, amount: 1342.5 },
      { description: 'Fremmøtegebyr', amount: 350 },
    ],
    subtotalExVat: 1692.5,
    vat: 423.13,
    total: 2115.63,
    status: 'overdue',
    dueDate: addDays(-20),
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_COMPANY: Company = {
  name: 'VVS Service AS',
  orgNumber: '123 456 789',
  address: 'Industrivegen 1, 0150 Oslo',
  hourlyRate: 895,
  calloutFee: 350,
  paymentTermsDays: 14,
};

interface AppState {
  currentUser: User | null;
  users: User[];
  jobs: Job[];
  invoices: Invoice[];
  company: Company;
  invoiceCounter: number;

  login: (email: string, password: string) => boolean;
  logout: () => void;

  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJobStatus: (jobId: string, status: JobStatus, hours?: number, materials?: number) => void;

  generateInvoice: (jobId: string, hours: number, materials: number) => Invoice;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;

  updateCompany: (updates: Partial<Company>) => void;

  addTechnician: (name: string, email: string, phone: string) => void;
  removeTechnician: (userId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: MOCK_USERS,
  jobs: MOCK_JOBS,
  invoices: MOCK_INVOICES,
  company: MOCK_COMPANY,
  invoiceCounter: 4,

  login: (emailOrPhone, _password) => {
    const q = emailOrPhone.trim().toLowerCase();
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === q || u.phone === q
    );
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },

  logout: () => set({ currentUser: null }),

  addJob: (jobData) => {
    const job: Job = {
      ...jobData,
      id: `j${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ jobs: [...state.jobs, job] }));
  },

  updateJobStatus: (jobId, status, hours, materials) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status,
              hoursWorked: hours ?? j.hoursWorked,
              materials: materials ?? j.materials,
              updatedAt: new Date().toISOString(),
            }
          : j
      ),
    }));
    if (status === 'completed') {
      const job = get().jobs.find((j) => j.id === jobId);
      if (job) {
        get().generateInvoice(jobId, hours ?? 1, materials ?? 0);
      }
    }
  },

  generateInvoice: (jobId, hours, materials) => {
    const state = get();
    const job = state.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Jobb ikke funnet');

    const { company, invoiceCounter } = state;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(invoiceCounter).padStart(3, '0')}`;

    const lineItems: InvoiceLineItem[] = [
      {
        description: `Arbeidstimer (${hours}t × ${company.hourlyRate} kr)`,
        quantity: hours,
        unitPrice: company.hourlyRate,
        amount: hours * company.hourlyRate,
      },
    ];
    if (materials > 0) {
      lineItems.push({ description: 'Materiell', amount: materials });
    }
    if (company.calloutFee > 0) {
      lineItems.push({ description: 'Fremmøtegebyr', amount: company.calloutFee });
    }

    const subtotalExVat = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const vat = Math.round(subtotalExVat * 25) / 100;
    const total = subtotalExVat + vat;

    const invoice: Invoice = {
      id: `inv${Date.now()}`,
      invoiceNumber,
      jobId,
      customerName: job.customerName,
      customerAddress: job.address,
      lineItems,
      subtotalExVat,
      vat,
      total,
      status: 'sent',
      dueDate: addDays(company.paymentTermsDays),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      invoices: [...state.invoices, invoice],
      invoiceCounter: state.invoiceCounter + 1,
    }));

    return invoice;
  },

  updateInvoiceStatus: (invoiceId, status) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, status } : inv
      ),
    }));
  },

  updateCompany: (updates) => {
    set((state) => ({ company: { ...state.company, ...updates } }));
  },

  addTechnician: (name, email, phone) => {
    const user: User = {
      id: `u${Date.now()}`,
      name,
      email,
      phone,
      role: 'technician',
    };
    set((state) => ({ users: [...state.users, user] }));
  },

  removeTechnician: (userId) => {
    set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
  },
}));
