"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PageHeaderAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

export type PageHeaderValue = {
  title: string;
  subtitle?: string;
  actions?: PageHeaderAction[];
} | null;

type PageHeaderContextType = {
  header: PageHeaderValue;
  setHeader: (value: PageHeaderValue) => void;
};

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderValue>(null);

  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

// Individual pages call this inside a useEffect to override the auto-derived
// sidebar-based title, e.g.:
//   const { setHeader } = usePageHeader();
//   useEffect(() => { setHeader({ title: "Inventory", actions: [...] }); }, []);
// No page is required to adopt this yet — layout falls back to an auto title.
export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error("usePageHeader must be used inside PageHeaderProvider");
  }
  return context;
}