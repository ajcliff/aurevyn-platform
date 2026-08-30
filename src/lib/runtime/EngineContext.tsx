"use client";
import {
  createContext,
  useContext
} from "react";
import type {
  Organization,
  InstalledEngine
} from "./models";
import type { MyMembership } from "./getMyMembership";

type EngineContextType = {
  organization: Organization;
  installedEngines: InstalledEngine[];
  membership: MyMembership;
};

const EngineContext =
  createContext
   < EngineContextType | undefined
  >(undefined);

export function EngineProvider({
  children,
  organization,
  installedEngines,
  membership
}: {
  children: React.ReactNode;
  organization: Organization;
  installedEngines: InstalledEngine[];
  membership: MyMembership;
}) {
  return (
    <EngineContext.Provider
      value={{
        organization,
        installedEngines,
        membership
      }}
    >
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  const context =
    useContext(EngineContext);
  if (!context) {
    throw new Error(
      "useEngine must be used inside EngineProvider"
    );
  }
  return context;
}