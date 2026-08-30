export type EngineManifest = {
  id: string;

  name: string;

  version: string;

  category: string;

  icon: string;

  description: string;

  routes: string[];

  permissions: string[];

  dependencies: string[];
};