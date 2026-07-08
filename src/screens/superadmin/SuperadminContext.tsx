import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  SuperadminCompany,
  SuperadminMetrics,
  UpdateCompanyPatch,
  BillingStatus,
  fetchCompanies,
  fetchMetrics,
  setBillingStatus as apiSetBillingStatus,
  updateCompany as apiUpdateCompany,
  setArchived as apiSetArchived,
  deleteCompany as apiDeleteCompany,
} from '../../lib/superadminApi';

interface SuperadminValue {
  metrics: SuperadminMetrics | null;
  companies: SuperadminCompany[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBillingStatus: (companyId: string, status: BillingStatus) => Promise<void>;
  updateCompany: (companyId: string, patch: UpdateCompanyPatch) => Promise<void>;
  archiveCompany: (companyId: string, archived: boolean) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  getCompany: (companyId: string) => SuperadminCompany | undefined;
}

const Ctx = createContext<SuperadminValue | null>(null);

export function SuperadminProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<SuperadminMetrics | null>(null);
  const [companies, setCompanies] = useState<SuperadminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, c] = await Promise.all([fetchMetrics(), fetchCompanies()]);
      setMetrics(m);
      setCompanies(c);
    } catch (e: any) {
      setError(e?.message ?? 'Kunne ikke laste superadmin-data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setBillingStatus = useCallback(
    async (companyId: string, status: BillingStatus) => {
      await apiSetBillingStatus(companyId, status);
      await refresh();
    },
    [refresh],
  );

  const updateCompany = useCallback(
    async (companyId: string, patch: UpdateCompanyPatch) => {
      await apiUpdateCompany(companyId, patch);
      await refresh();
    },
    [refresh],
  );

  const archiveCompany = useCallback(
    async (companyId: string, archived: boolean) => {
      await apiSetArchived(companyId, archived);
      await refresh();
    },
    [refresh],
  );

  const deleteCompany = useCallback(
    async (companyId: string) => {
      await apiDeleteCompany(companyId);
      await refresh();
    },
    [refresh],
  );

  const getCompany = useCallback(
    (companyId: string) => companies.find((c) => c.id === companyId),
    [companies],
  );

  return (
    <Ctx.Provider
      value={{
        metrics,
        companies,
        loading,
        error,
        refresh,
        setBillingStatus,
        updateCompany,
        archiveCompany,
        deleteCompany,
        getCompany,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSuperadmin(): SuperadminValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSuperadmin må brukes innenfor SuperadminProvider');
  return v;
}
