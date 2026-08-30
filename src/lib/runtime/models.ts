export type Organization = {
  id: string;
  name: string;
  location: string;
  status: string;
  revenue: string;
  package: string;
  created_at?: string;
};

export type Blueprint = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  description: string;
};

export type Engine = {
  id: string;

  name: string;
  slug: string;

  version: string;
  category: string;

  icon: string;
  description: string;

  status?: string;
  tier?: string;

  routes?: string[];
  permissions?: string[];
  dependencies?: string[];
};

export type InstalledEngine = {
  id: string;

  org_id: string;
  engine_id: string;

  enabled: boolean;

  activated_at?: string;
  subscription_tier?: string;

  engines: Engine;
};

export type RuntimeState = {
  organization: Organization;
  blueprint: Blueprint;
  engines: InstalledEngine[];
};