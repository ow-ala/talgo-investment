import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadLoans, loadSettings, saveLoans, saveSettings } from './lib/storage';
import { applyInput, createLoan, newId, statsOf } from './lib/loans';
import { round2 } from './lib/money';
import { todayISO } from './lib/dates';
import {
  cancelNotifications,
  configureNotifications,
  ensurePermissions,
  resyncLoan,
  setUpAndroidChannel,
} from './lib/notifications';

configureNotifications();

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState({ granted: false, canAskAgain: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [storedLoans, storedSettings] = await Promise.all([loadLoans(), loadSettings()]);
      if (!alive) return;
      setLoans(storedLoans);
      setSettings(storedSettings);
      setReady(true);
      setUpAndroidChannel();
      setPermission(await ensurePermissions());
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) saveLoans(loans);
  }, [loans, ready]);

  useEffect(() => {
    if (ready && settings) saveSettings(settings);
  }, [settings, ready]);

  const requestPermission = useCallback(async () => {
    const response = await ensurePermissions();
    setPermission(response);
    return response;
  }, []);

  const upsertLoan = useCallback(
    async (input, id) => {
      const existing = id ? loans.find((loan) => loan.id === id) : null;
      const draft = existing ? applyInput(existing, input) : createLoan(input);
      const saved = await resyncLoan(draft, settings);
      setLoans((prev) => (existing ? prev.map((loan) => (loan.id === id ? saved : loan)) : [saved, ...prev]));
      return saved;
    },
    [loans, settings],
  );

  const deleteLoan = useCallback(
    async (id) => {
      const loan = loans.find((item) => item.id === id);
      if (loan) await cancelNotifications(loan.notificationIds);
      setLoans((prev) => prev.filter((item) => item.id !== id));
    },
    [loans],
  );

  const recordPayment = useCallback(
    async (id, amount, note) => {
      const loan = loans.find((item) => item.id === id);
      if (!loan) return;
      const updated = {
        ...loan,
        payments: [
          ...(loan.payments || []),
          { id: newId(), amount: round2(amount), note: String(note || '').trim(), date: todayISO(), createdAt: new Date().toISOString() },
        ],
        updatedAt: new Date().toISOString(),
      };
      const saved = await resyncLoan(updated, settings);
      setLoans((prev) => prev.map((item) => (item.id === id ? saved : item)));
    },
    [loans, settings],
  );

  const removePayment = useCallback(
    async (id, paymentId) => {
      const loan = loans.find((item) => item.id === id);
      if (!loan) return;
      const updated = {
        ...loan,
        payments: (loan.payments || []).filter((payment) => payment.id !== paymentId),
        updatedAt: new Date().toISOString(),
      };
      const saved = await resyncLoan(updated, settings);
      setLoans((prev) => prev.map((item) => (item.id === id ? saved : item)));
    },
    [loans, settings],
  );

  const resyncAll = useCallback(async () => {
    if (!settings) return 0;
    const next = [];
    for (const loan of loans) {
      next.push(await resyncLoan(loan, settings));
    }
    setLoans(next);
    return next.reduce((total, loan) => total + (loan.notificationIds?.length || 0), 0);
  }, [loans, settings]);

  const replaceAll = useCallback(
    async (nextLoans, nextSettings) => {
      await cancelNotifications(loans.flatMap((loan) => loan.notificationIds || []));
      setSettings((prev) => ({ ...prev, ...nextSettings }));
      const synced = [];
      const mergedSettings = { ...settings, ...nextSettings };
      for (const loan of nextLoans) {
        synced.push(await resyncLoan({ ...loan, notificationIds: [] }, mergedSettings));
      }
      setLoans(synced);
      return synced.length;
    },
    [loans, settings],
  );

  const stats = useMemo(() => statsOf(loans), [loans]);

  const value = useMemo(
    () => ({
      ready,
      loans,
      stats,
      settings,
      permission,
      requestPermission,
      upsertLoan,
      deleteLoan,
      recordPayment,
      removePayment,
      resyncAll,
      replaceAll,
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
    }),
    [ready, loans, stats, settings, permission, requestPermission, upsertLoan, deleteLoan, recordPayment, removePayment, resyncAll, replaceAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
