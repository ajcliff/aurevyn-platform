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
import s from "@/styles/layout.module.css";
import { getStockLevelsForProduct, type StockLevel } from "@/lib/warehouses";

type SortKey = "name" | "stock_asc" | "stock_desc" | "value_desc";
type PricelistOverride = { pricelistId: string; pricelistName: string; price: number };

export default function InventoryDashboard() {
  const { organization } = useEngine();
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [pricingProductId, setPricingProductId] = useState<string | null>(null);
  const [movementProductId, setMovementProductId] = useState<string | null>(null);

  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [pricelistOverrides, setPricelistOverrides] = useState<PricelistOverride[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [lowStock, setLowStock] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

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
      const [productData, lowStockData, movementData, approvalsData] = await Promise.all([
        getProducts(orgId),
        getLowStockProducts(orgId),
        getMovements(orgId),
        getPendingApprovalsForOrg(orgId),
      ]);
      setProducts(productData);
      setLowStock(lowStockData);
      setMovements(movementData);
      setPendingApprovals(approvalsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWarehouseBreakdown(productId: string) {
    setPricingProductId(null);
    setMovementProductId(null);
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }
    const levels = await getStockLevelsForProduct(productId);
    setStockLevels(levels);
    setExpandedProductId(productId);
  }

  async function togglePricingBreakdown(productId: string) {
    setExpandedProductId(null);
    setMovementProductId(null);
    if (pricingProductId === productId) {
      setPricingProductId(null);
      return;
    }
    const overrides = await getPricelistOverridesForProduct(productId);
    setPricelistOverrides(overrides);
    setPricingProductId(productId);
  }

  function toggleMovementHistory(productId: string) {
    setExpandedProductId(null);
    setPricingProductId(null);
    setMovementProductId(movementProductId === productId ? null : productId);
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

  const pendingRestockByProduct = useMemo(() => {
    const map = new Map<string, ApprovalRequest>();
    pendingApprovals
      .filter((a) => a.source === "auto_low_stock" && a.related_id)
      .forEach((a) => map.set(a.related_id!, a));
    return map;
  }, [pendingApprovals]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case "stock_asc":
        list = [...list].sort((a, b) => a.stock_quantity - b.stock_quantity);
        break;
      case "stock_desc":
        list = [...list].sort((a, b) => b.stock_quantity - a.stock_quantity);
        break;
      case "value_desc":
        list = [...list].sort(
          (a, b) =>
            b.stock_quantity * b.unit_price - a.stock_quantity * a.unit_price
        );
        break;
      default:
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, search, categoryFilter, sortBy]);

  if (loading) return <div style={{ padding: 24 }}>Loading inventory...</div>;

return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", overflowY: "auto" }}>      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Total Products
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {products.length}
          </div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Stock Value
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            KES {totalValue.toLocaleString()}
          </div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Low Stock Alerts
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: lowStock.length > 0 ? "#ef4444" : "var(--green)",
            }}
          >
            {lowStock.length}
          </div>
        </div>

        <div className={s.card}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Categories
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {categories.length}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className={s.input}
          placeholder="Search products or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "260px" }}
        />

        <select
          className={s.input}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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

        <button className={s.btnGhost} onClick={handleExportCSV}>
          Export CSV
        </button>

        <button className={s.btnGold} onClick={() => setShowAddModal(true)}>
          + Product
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: "16px",
          }}
        >
          {filteredProducts.map((product) => {
            const pendingRestock = pendingRestockByProduct.get(product.id!);
            const productMovements = movements
              .filter((m) => m.product_id === product.id)
              .slice(0, 5);

            return (
<div key={product.id} className={s.card} style={{ padding: 14 }}>                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                    {product.name}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className={s.btnGhost}
                      style={{ padding: "2px 8px", fontSize: "12px" }}
                      onClick={() => setEditingProduct(product)}
                    >
                      Edit
                    </button>
                    <button
                      className={s.btnGhost}
                      style={{ padding: "2px 8px", fontSize: "12px", color: "#ef4444", borderColor: "#ef4444" }}
                      onClick={(e) => handleArchive(product, e)}
                    >
                      Archive
                    </button>
                  </div>
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  {product.sku}
                  {product.category ? ` • ${product.category}` : ""}
                </div>

                {pendingRestock && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "#f5b942",
                      background: "rgba(245,185,66,0.1)",
                      border: "1px solid rgba(245,185,66,0.3)",
                      borderRadius: 8,
                      padding: "4px 8px",
                      display: "inline-block",
                    }}
                  >
                    🔔 Restock request pending in Approvals
                  </div>
                )}

              <div
                  style={{ marginTop: "8px", fontSize: 13, cursor: "pointer" }}
                  onClick={() => toggleWarehouseBreakdown(product.id!)}
                >
                  Stock: {product.stock_quantity} {product.unit || ""}{" "}
                  <span style={{ fontSize: 11, color: "var(--gold)" }}>
                    {expandedProductId === product.id ? "▲ hide locations" : "▼ by location"}
                  </span>
                </div>

                {expandedProductId === product.id && (
                  <div style={{ marginTop: 6, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    {stockLevels.map((sl) => (
                      <div key={sl.id}>
                        {sl.warehouses?.name}: {sl.quantity} {product.unit || "units"}
                      </div>
                    ))}
                    {stockLevels.length === 0 && <div>No location data yet.</div>}
                  </div>
                )}

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 13 }}>
                  <span>KES {Number(product.unit_price).toLocaleString()}</span>                  <span
                    style={{ fontSize: 11, color: "var(--gold)", cursor: "pointer" }}
                    onClick={() => togglePricingBreakdown(product.id!)}
                  >
                    {pricingProductId === product.id ? "▲ hide pricing" : "💲 pricelists"}
                  </span>
                </div>

                {pricingProductId === product.id && (
                  <div style={{ marginTop: 6, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    {pricelistOverrides.map((o) => (
                      <div key={o.pricelistId} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{o.pricelistName}</span>
                        <span>KES {o.price.toLocaleString()}</span>
                      </div>
                    ))}
                    {pricelistOverrides.length === 0 && <div>No custom pricing set — base price applies everywhere.</div>}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: 13,
                    color:
                      Number(product.stock_quantity) <=
                      Number(product.low_stock_threshold)
                        ? "#ef4444"
                        : "var(--green)",
                  }}
                >
                  {Number(product.stock_quantity) <=
                  Number(product.low_stock_threshold)
                    ? "Low Stock"
                    : "In Stock"}
                </div>

                <div
                  style={{ marginTop: 6, fontSize: 11, color: "var(--gold)", cursor: "pointer" }}
                  onClick={() => toggleMovementHistory(product.id!)}
                >
                  {movementProductId === product.id ? "▲ hide recent movements" : "🕐 recent movements"}
                </div>

                {movementProductId === product.id && (
                  <div style={{ marginTop: 6, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    {productMovements.map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{m.type}</span>
                        <span>{m.quantity} · {new Date(m.created_at).toLocaleDateString("en-KE")}</span>
                      </div>
                    ))}
                    {productMovements.length === 0 && <div>No movements recorded yet.</div>}
                  </div>
                )}

                <StockActions
                  productId={product.id!}
                  productName={product.name}
                  orgId={organization.id}
                  onUpdated={loadInventory}
                />
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div style={{ color: "var(--text-muted)", padding: "20px" }}>
              No products match your search.
            </div>
          )}
        </div>

        <div className={s.card}>
          <h3>Low Stock Alerts</h3>

          {lowStock.length === 0 && <div>No alerts</div>}

          {lowStock.map((item) => (
            <div
              key={item.id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>{item.name}</div>
              <div style={{ color: "#ef4444", fontSize: "13px" }}>
                Remaining: {item.stock_quantity}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddProductModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={loadInventory}
      />

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdated={loadInventory}
      />

      <MovementHistory />
    </div>
  );
}
