"use client";

import { InventoryProduct } from "@/lib/inventory";

type Props = {
  products: InventoryProduct[];
  addToCart: (product: InventoryProduct) => void;
  stockLevels?: Record<string, Record<string, number>>;
  selectedWarehouseId?: string;
};

const COLUMNS = "1fr 90px 120px";

// Dense rows rather than cards: more products on screen, one tap to add
export default function ProductGrid({ products, addToCart, stockLevels, selectedWarehouseId }: Props) {
  if (products.length === 0) {
    return <div style={{ color: "var(--text-muted)", padding: 20 }}>No products match.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`.pos-row:hover { background: var(--bg-elevated); }`}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: "6px 12px",
          fontSize: 11,
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span>Product</span>
        <span style={{ textAlign: "right" }}>Stock</span>
        <span style={{ textAlign: "right" }}>Price</span>
      </div>

      {products.map((product) => {
        const branchStock =
          selectedWarehouseId && stockLevels?.[product.id!]
            ? stockLevels[product.id!][selectedWarehouseId] ?? 0
            : Number(product.stock_quantity);
        const lowStock = branchStock <= Number(product.low_stock_threshold);

        return (
          <div
            key={product.id}
            className="pos-row"
            onClick={() => addToCart(product)}
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
              gap: 12,
              alignItems: "center",
              padding: "11px 12px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {product.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {product.sku}
                {product.category ? ` · ${product.category}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: lowStock ? "#ef4444" : "#3dd68c" }}>
              {branchStock}
            </div>
            <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700, color: "var(--gold)" }}>
              KES {Number(product.unit_price).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
