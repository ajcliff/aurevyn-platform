export const INVENTORY_ENGINE = {
  id: "inventory",

  name: "Inventory",

  version: "1.0.0",

  category: "Operations",

  icon: "📦",

  description:
    "Stock and warehouse management",

  routes: [
    "products",
    "movements",
    "alerts"
  ],

  permissions: [
    "inventory.read",
    "inventory.write"
  ],

  dependencies: []
};