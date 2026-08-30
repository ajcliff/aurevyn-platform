export const POS_ENGINE = {
  id: "pos",

  name: "Point of Sale",

  version: "1.0.0",

  category: "Retail",

  icon: "🛒",

  description:
    "Retail sales and checkout",

  routes: [
    "dashboard",
    "sales",
    "reports"
  ],

  permissions: [
    "inventory.read",
    "inventory.write",
    "finance.write"
  ],

  dependencies: [
    "inventory"
  ]
};