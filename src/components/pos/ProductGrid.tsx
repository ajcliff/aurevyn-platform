"use client";

import { InventoryProduct } from "@/lib/inventory";

type Props = {
  products: InventoryProduct[];
  addToCart: (product: InventoryProduct) => void;
  stockLevels?: Record<string, Record<string, number>>;
  selectedWarehouseId?: string;
};

export default function ProductGrid({
  products,
  addToCart,
  stockLevels,
  selectedWarehouseId,
}: Props) {
  return (
    <div
      style={{
        overflowY: "auto",
        maxHeight: "calc(100vh - 220px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(220px,1fr))",
          gap: "12px",
        }}
      >
        {products.map((product) => {
          const branchStock =
            selectedWarehouseId && stockLevels?.[product.id!]
              ? stockLevels[product.id!][selectedWarehouseId] ?? 0
              : Number(product.stock_quantity);

          const lowStock = branchStock <= Number(product.low_stock_threshold);

          return (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                {product.name}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                SKU: {product.sku}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                {product.category}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  fontSize: "18px",
                  color: "var(--gold)",
                  fontWeight: 700,
                }}
              >
                KES {Number(product.unit_price).toLocaleString()}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: lowStock ? "#ef4444" : "#3dd68c",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Stock: {branchStock}{selectedWarehouseId ? " (this branch)" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}