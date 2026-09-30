"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProducts,
  getLowStockProducts,
  getCategories,
  getInventoryValue,
  getMovements,
  archiveProduct,
  type InventoryProduct,
} from "@/lib/inventory";
import { getPendingApprovalsForOrg, type ApprovalRequest } from "@/lib/approvals";
import { getPricelistOverridesForProduct } from "@/lib/pricelists";
import { useEngine } from "@/lib/runtime/EngineContext";
import { createClient } from "@/lib/supabase";
import AddProductModal from "./components/AddProductModal";
import EditProductModal from "./components/EditProductModal";
import StockActions from "./components/StockActions";
import { exportToCSV } from "@/lib/csvExport";
import MovementHistory from "./components/MovementHistory";
import BatchManager from "./components/BatchManager";
import { getExpiringBatches } from "@/lib/inventoryBatches";
import s from "@/styles/layout.module.css";
import { getStockLevelsForProduct, type StockLevel } from "@/lib/warehouses";

type SortKey = "name" | "stock_asc" | "stock_desc" | "value_desc";
type PricelistOverride = { pricelistId: string; pricelistName: string; price: number };

const UNCATEGORIZED = "Uncategorized";

export default function InventoryDashboard() {
  const { organization } = useEngine();

  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [pricelistOverrides, setPricelistOverrides] = useState<PricelistOverride[]>([]);

  const [movements, setMovements] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [lowStock, setLowStock] = useState<InventoryProduct[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel("inventory-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_products", filter: `org_id=eq.${organization.id}` },
        () => loadInventory()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_movements", filter: `org_id=eq.${organization.id}` },
        () => getMovements(organization.id).then(setMovements)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_requests", filter: `org_id=eq.${organization.id}` },
        () => getPendingApprovalsForOrg(organization.id).then(setPendingApprovals)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  async function loadInventory() {
    try {
      const orgId = organization.id;
      const [productData, lowStockData, movementData, approvalsData, expiringData] = await Promise.all([
        getProducts(orgId),
        getLowStockProducts(orgId),
        getMovements(orgId),
        getPendingApprovalsForOrg(orgId),
        getExpiringBatches(orgId, 30),
      ]);
      setProducts(productData);
      setLowStock(lowStockData);
      setMovements(movementData);
      setPendingApprovals(approvalsData);
      setExpiringBatches(expiringData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleProductDetails(productId: string) {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }
    const [levels, overrides] = await Promise.all([
      getStockLevelsForProduct(productId),
      getPricelistOverridesForProduct(productId),
    ]);
    setStockLevels(levels);
    setPricelistOverrides(overrides);
    setExpandedProductId(productId);
  }

  async function handleArchive(product: InventoryProduct, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Archive "${product.name}"? It will be hidden from Inventory and POS but stock history is kept.`)) return;
    await archiveProduct(product.id!);
    loadInventory();
  }

  function handleExportCSV() {
    const rows = filteredProducts.map((p) => ({
      Name: p.name,
      SKU: p.sku,
      Category: p.category || "",
      Unit: p.unit || "",
      "Stock Quantity": p.stock_quantity,
      "Low Stock Threshold": p.low_stock_threshold,
      "Unit Price (KES)": p.unit_price,
      "Stock Value (KES)": (p.stock_quantity * p.unit_price).toFixed(2),
    }));

    exportToCSV(`inventory-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const categories = useMemo(() => getCategories(products), [products]);
  const totalValue = useMemo(() => getInventoryValue(products), [products]);
  const isSearching = search.trim().length > 0;

  const pendingRestockByProduct = useMemo(() => {
    const map = new Map<string, ApprovalRequest>();
    pendingApprovals
      .filter((a) => a.source === "auto_low_stock" && a.related_id)
      .forEach((a) => map.set(a.related_id!, a));
    return map;
  }, [pendingApprovals]);

  function sortList(list: InventoryProduct[]): InventoryProduct[] {
    switch (sortBy) {
      case "stock_asc":
        return [...list].sort((a, b) => a.stock_quantity - b.stock_quantity);
      case "stock_desc":
        return [...list].sort((a, b) => b.stock_quantity - a.stock_quantity);
      case "value_desc":
        return [...list].sort(
          (a, b) => b.stock_quantity * b.unit_price - a.stock_quantity * a.unit_price
        );
      default:
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const drawers = useMemo(() => {
    const groups = new Map<string, InventoryProduct[]>();
    for (const p of products) {
      const key = p.category?.trim() || UNCATEGORIZED;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return categories
      .concat(groups.has(UNCATEGORIZED) ? [UNCATEGORIZED] : [])
      .map((name) => {
        const items = groups.get(name) || [];
        return {
          name,
          count: items.length,
          value: items.reduce((sum, p) => sum + p.stock_quantity * p.unit_price, 0),
        };
      });
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase();
    return sortList(
      products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    );
  }, [products, search, sortBy]);

  const drawerProducts = useMemo(() => {
    if (!openCategory) return [];
    return sortList(
      products.filter((p) => (p.category?.trim() || UNCATEGORIZED) === openCategory)
    );
  }, [products, openCategory, sortBy]);

  if (loading) return <div style={{ padding: 24 }}>Loading inventory...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Products</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{products.length}</div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Stock Value</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>KES {totalValue.toLocaleString()}</div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Low Stock Alerts</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: lowStock.length > 0 ? "#ef4444" : "var(--green)" }}>
            {lowStock.length}
          </div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Categories</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{categories.length}</div>
        </div>
      </div>

      {expiringBatches.length > 0 && (
        <div style={{ background: "#ef444414", border: "1px solid #ef444440", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ef4444" }}>
          ⚠️ {expiringBatches.length} batch{expiringBatches.length === 1 ? "" : "es"} expiring within 30 days:{" "}
          {expiringBatches.slice(0, 3).map((b) => b.product_name).join(", ")}
          {expiringBatches.length > 3 ? ` +${expiringBatches.length - 3} more` : ""}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          className={s.input}
          placeholder="Search products or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "260px" }}
        />

        <select
          className={s.input}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          style={{ width: "180px" }}
        >
          <option value="name">Sort: Name</option>
          <option value="stock_asc">Sort: Stock (Low to High)</option>
          <option value="stock_desc">Sort: Stock (High to Low)</option>
          <option value="value_desc">Sort: Value (High to Low)</option>
        </select>

        <div style={{ flex: 1 }} />

        <button className={s.btnGhost} onClick={handleExportCSV}>Export CSV</button>
        <button className={s.btnGold} onClick={() => setShowAddModal(true)}>+ Product</button>
      </div>

      {isSearching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"} for "{search}"
          </div>
          {filteredProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              expanded={expandedProductId === product.id}
              onToggle={() => toggleProductDetails(product.id!)}
              onEdit={() => setEditingProduct(product)}
              onArchive={(e) => handleArchive(product, e)}
              pendingRestock={pendingRestockByProduct.get(product.id!)}
              movements={movements.filter((m) => m.product_id === product.id).slice(0, 5)}
              stockLevels={stockLevels}
              pricelistOverrides={pricelistOverrides}
              orgId={organization.id}
              onUpdated={loadInventory}
            />
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ color: "var(--text-muted)", padding: "20px" }}>No products match your search.</div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "12px" }}>
            {drawers.map((drawer) => (
              <div
                key={drawer.name}
                onClick={() => setOpenCategory(openCategory === drawer.name ? null : drawer.name)}
                className={s.card}
                style={{
                  padding: 14,
                  cursor: "pointer",
                  textAlign: "center",
                  borderColor: openCategory === drawer.name ? "var(--gold)" : undefined,
                }}
              >
                <div style={{ height: 3, width: 28, background: "var(--border)", borderRadius: 2, margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>{drawer.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {drawer.count} item{drawer.count === 1 ? "" : "s"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  KES {drawer.value.toLocaleString()}
                </div>
              </div>
            ))}
            {drawers.length === 0 && (
              <div style={{ color: "var(--text-muted)", padding: "20px", gridColumn: "1 / -1" }}>
                No products yet — add your first one to start a drawer.
              </div>
            )}
          </div>

          <div className={s.card}>
            {openCategory ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>{openCategory}</h3>
                  <button className={s.btnGhost} style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => setOpenCategory(null)}>
                    Close
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {drawerProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      expanded={expandedProductId === product.id}
                      onToggle={() => toggleProductDetails(product.id!)}
                      onEdit={() => setEditingProduct(product)}
                      onArchive={(e) => handleArchive(product, e)}
                      pendingRestock={pendingRestockByProduct.get(product.id!)}
                      movements={movements.filter((m) => m.product_id === product.id).slice(0, 5)}
                      stockLevels={stockLevels}
                      pricelistOverrides={pricelistOverrides}
                      orgId={organization.id}
                      onUpdated={loadInventory}
                      compact
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3>Low Stock Alerts</h3>
                {lowStock.length === 0 && <div>No alerts</div>}
                {lowStock.map((item) => (
                  <div key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>{item.name}</div>
                    <div style={{ color: "#ef4444", fontSize: "13px" }}>Remaining: {item.stock_quantity}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <AddProductModal open={showAddModal} onClose={() => setShowAddModal(false)} onCreated={loadInventory} />
      <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onUpdated={loadInventory} />
      <MovementHistory />
    </div>
  );
}

function ProductRow({
  product,
  expanded,
  onToggle,
  onEdit,
  onArchive,
  pendingRestock,
  movements,
  stockLevels,
  pricelistOverrides,
  orgId,
  onUpdated,
  compact,
}: {
  product: InventoryProduct;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onArchive: (e: React.MouseEvent) => void;
  pendingRestock?: ApprovalRequest;
  movements: any[];
  stockLevels: StockLevel[];
  pricelistOverrides: PricelistOverride[];
  orgId: string;
  onUpdated: () => void;
  compact?: boolean;
}) {
  const lowStock = Number(product.stock_quantity) <= Number(product.low_stock_threshold);

  return (
    <div className={s.card} style={{ padding: compact ? 10 : 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 14 }}>{product.name}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {product.sku}
            {!compact && product.category ? ` • ${product.category}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: lowStock ? "#ef4444" : "var(--green)" }}>
            {product.stock_quantity} {product.unit || ""}
          </div>
          <div style={{ fontSize: 12 }}>KES {Number(product.unit_price).toLocaleString()}</div>
        </div>
      </div>

      {pendingRestock && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#f5b942", background: "rgba(245,185,66,0.1)", border: "1px solid rgba(245,185,66,0.3)", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}>
          🔔 Restock pending
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: "var(--gold)", cursor: "pointer" }} onClick={onToggle}>
        {expanded ? "▲ hide details" : "▼ details"}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>By location</div>
            {stockLevels.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No location data yet.</div>}
            {stockLevels.map((sl) => (
              <div key={sl.id} style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span>{sl.warehouses?.name}</span>
                <span>{sl.quantity} {product.unit || "units"}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Pricelists</div>
            {pricelistOverrides.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No custom pricing set — base price applies everywhere.</div>}
            {pricelistOverrides.map((o) => (
              <div key={o.pricelistId} style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span>{o.pricelistName}</span>
                <span>KES {o.price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Recent movements</div>
            {movements.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No movements recorded yet.</div>}
            {movements.map((m) => (
              <div key={m.id} style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span>{m.type}</span>
                <span>{m.quantity} · {new Date(m.created_at).toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Batches & expiry</div>
            <BatchManager productId={product.id!} orgId={orgId} />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button className={s.btnGhost} style={{ padding: "2px 8px", fontSize: 12 }} onClick={onEdit}>Edit</button>
            <button className={s.btnGhost} style={{ padding: "2px 8px", fontSize: 12, color: "#ef4444", borderColor: "#ef4444" }} onClick={onArchive}>Archive</button>
          </div>

          <StockActions productId={product.id!} productName={product.name} orgId={orgId} onUpdated={onUpdated} />
        </div>
      )}
    </div>
  );
}