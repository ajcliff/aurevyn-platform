import POSDashboard
from "@/lib/engines/pos/POSDashboard";

import InventoryDashboard
from "@/lib/engines/inventory/InventoryDashboard";

export const EngineRegistry = {
  pos: POSDashboard,

  inventory: InventoryDashboard
};