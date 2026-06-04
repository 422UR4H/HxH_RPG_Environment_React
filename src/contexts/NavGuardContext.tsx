import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";

type NavGuardFn = () => boolean | Promise<boolean>;

type NavGuardContextValue = {
  registerGuard: (fn: NavGuardFn | null) => void;
  confirmNavigation: () => Promise<boolean>;
};

const NavGuardContext = createContext<NavGuardContextValue | null>(null);

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<NavGuardFn | null>(null);

  const registerGuard = useCallback((fn: NavGuardFn | null) => {
    guardRef.current = fn;
  }, []);

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!guardRef.current) return true;
    return guardRef.current();
  }, []);

  const value = useMemo(
    () => ({ registerGuard, confirmNavigation }),
    [registerGuard, confirmNavigation],
  );

  return (
    <NavGuardContext.Provider value={value}>
      {children}
    </NavGuardContext.Provider>
  );
}

export function useNavGuard(): NavGuardContextValue {
  const ctx = useContext(NavGuardContext);
  if (!ctx) throw new Error("useNavGuard must be used inside NavGuardProvider");
  return ctx;
}
