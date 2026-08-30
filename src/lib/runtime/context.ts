import type {
  Organization,
  InstalledEngine,
  Blueprint
} from "./models";

export type RuntimeContext = {
  organization: Organization;
  blueprint: Blueprint;
  engines: InstalledEngine[];
};