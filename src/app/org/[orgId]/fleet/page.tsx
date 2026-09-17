"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, type Vehicle } from "@/lib/vehicles";
import {
  getDeliveryNotes,
  createDeliveryNote,
  updateDeliveryStatus,
  deleteDeliveryNote,
  type DeliveryNote,
  type DeliveryStatus,
} from "@/lib/deliveryNotes";
import { getWarehouses, type Warehouse } from "@/lib/warehouses";
import { getAllEmployees, type EmployeeProfile } from "@/lib/employeeHub";
import EmptyState from "@/components/EmptyState";

const VEHICLE_TYPES = ["van", "bike", "truck", "car", "other"];
const STATUS_FLOW: DeliveryStatus[] = ["pending", "dispatched", "in_transit", "delivered"];
const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  dispatched: "Dispatched",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: "var(--text-muted)",
  dispatched: "#f5a623",
  in_transit: "#3b82f6",
  delivered: "#3dd68c",
  cancelled: "#ef4444",
};

export default function FleetPage() {
  const { organization } = useEngine();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [vName, setVName] = useState("");
  const [vType, setVType] = useState("van");
  const [vPlate, setVPlate] = useState("");
  const [vCapacity, setVCapacity] = useState("");

  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [dCustomer, setDCustomer] = useState("");
  const [dWarehouseId, setDWarehouseId] = useState("");
  const [dVehicleId, setDVehicleId] = useState("");
  const [dDriverId, setDDriverId] = useState("");
  const [dItemName, setDItemName] = useState("");
  const [dItemQty, setDItemQty] = useState("1");
  const [dItems, setDItems] = useState<{ product_name: string; quantity: number }[]>([]);
  const [dNotes, setDNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [v, d, w, e] = await Promise.all([
      getVehicles(organization.id),
      getDeliveryNotes(organization.id),
      getWarehouses(organization.id),
      getAllEmployees(organization.id),
    ]);
    setVehicles(v);
    setDeliveries(d);
    setWarehouses(w);
    setEmployees(e);
    setLoading(false);
  }

  async function handleCreateVehicle() {
    if (!vName.trim()) return;
    await createVehicle({
      org_id: organization.id,
      name: vName,
      type: vType,
      plate_number: vPlate,
      capacity: vCapacity,
    });
    setVName("");
    setVType("van");
    setVPlate("");
    setVCapacity("");
    setShowNewVehicle(false);
    load();
  }

  async function handleRetireVehicle(v: Vehicle) {
    if (!confirm(`Mark "${v.name}" as inactive?`)) return;
    await updateVehicle(v.id, { status: v.status === "active" ? "inactive" : "active" });
    load();
  }

  function handleAddItem() {
    if (!dItemName.trim()) return;
    setDItems((prev) => [...prev, { product_name: dItemName, quantity: Number(dItemQty) || 1 }]);
    setDItemName("");
    setDItemQty("1");
  }

  function resetDeliveryForm() {
    setDCustomer("");
    setDWarehouseId("");
    setDVehicleId("");
    setDDriverId("");
    setDItems([]);
    setDItemName("");
    setDItemQty("1");
    setDNotes("");
  }

  async function handleCreateDelivery() {
    if (dItems.length === 0) {
      alert("Add at least one item to the delivery");
      return;
    }
    try {
      setSaving(true);
      await createDeliveryNote({
        org_id: organization.id,
        customer_name: dCustomer,
        warehouse_id: dWarehouseId || null,
        vehicle_id: dVehicleId || null,
        driver_employee_id: dDriverId || null,
        items: dItems,
        notes: dNotes,
      });
      resetDeliveryForm();
      setShowNewDelivery(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdvanceStatus(d: DeliveryNote) {
    const idx = STATUS_FLOW.indexOf(d.status);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
    await updateDeliveryStatus(d.id, organization.id, STATUS_FLOW[idx + 1]);
    load();
  }

  async function handleCancelDelivery(d: DeliveryNote) {
    if (!confirm(`Cancel delivery ${d.delivery_number}?`)) return;
    await updateDeliveryStatus(d.id, organization.id, "cancelled");
    load();
  }

  async function handleDeleteDelivery(d: DeliveryNote) {
    if (!confirm(`Delete delivery ${d.delivery_number}? This can't be undone.`)) return;
    await deleteDeliveryNote(d.id);
    load();
  }

  if (loading) return <div>Loading fleet...</div>;

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled");
  const pastDeliveries = deliveries.filter((d) => d.status === "delivered" || d.status === "cancelled");

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Fleet & Delivery</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Vehicles, drivers, and dispatch for {organization.name}.
          </p>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3>Vehicles</h3>
          <button style={buttonGold} onClick={() => setShowNewVehicle(true)}>+ Vehicle</button>
        </div>
        {vehicles.map((v) => (
          <div key={v.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr auto" }}>
            <span>{v.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{v.type}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.plate_number || "—"}</span>
            <span style={{ fontSize: 12, color: v.status === "active" ? "#3dd68c" : "var(--text-muted)", textTransform: "capitalize" }}>
              {v.status}
            </span>
            <button style={ghostButtonSm} onClick={() => handleRetireVehicle(v)}>
              {v.status === "active" ? "Mark Inactive" : "Mark Active"}
            </button>
          </div>
        ))}
        {vehicles.length === 0 && <EmptyState icon="🚐" message="No vehicles added yet." />}
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3>Active Deliveries</h3>
          <button style={buttonGold} onClick={() => setShowNewDelivery(true)}>+ Delivery</button>
        </div>
        {activeDeliveries.map((d) => (
          <div key={d.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto" }}>
            <span>{d.delivery_number}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.customer_name || "—"}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {d.vehicles?.name || "No vehicle"}{d.vehicles?.plate_number ? ` (${d.vehicles.plate_number})` : ""}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.employees?.full_name || "No driver"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[d.status] }}>
              {STATUS_LABELS[d.status]}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {STATUS_FLOW.indexOf(d.status) < STATUS_FLOW.length - 1 && (
                <button style={ghostButtonSm} onClick={() => handleAdvanceStatus(d)}>
                  Mark {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(d.status) + 1]]}
                </button>
              )}
              <button style={ghostButtonSm} onClick={() => handleCancelDelivery(d)}>Cancel</button>
            </span>
          </div>
        ))}
        {activeDeliveries.length === 0 && <EmptyState icon="🚚" message="No active deliveries." />}
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Delivery History</h3>
        {pastDeliveries.map((d) => (
          <div key={d.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr auto" }}>
            <span>{d.delivery_number}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.customer_name || "—"}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.vehicles?.name || "—"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[d.status] }}>
              {STATUS_LABELS[d.status]}
            </span>
            <button style={ghostButtonSm} onClick={() => handleDeleteDelivery(d)}>Delete</button>
          </div>
        ))}
        {pastDeliveries.length === 0 && <EmptyState icon="📜" message="No completed or cancelled deliveries yet." />}
      </div>

      {showNewVehicle && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Vehicle</h2>

            <label style={labelStyle}>Name</label>
            <input placeholder="e.g. Van 1" value={vName} onChange={(e) => setVName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Type</label>
            <select value={vType} onChange={(e) => setVType(e.target.value)} style={inputStyle}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
              ))}
            </select>

            <label style={labelStyle}>Plate Number</label>
            <input placeholder="e.g. KDA 123A" value={vPlate} onChange={(e) => setVPlate(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Capacity (optional)</label>
            <input placeholder="e.g. 500kg" value={vCapacity} onChange={(e) => setVCapacity(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewVehicle(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateVehicle}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}

      {showNewDelivery && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Delivery</h2>

            <label style={labelStyle}>Customer</label>
            <input placeholder="Who is this for?" value={dCustomer} onChange={(e) => setDCustomer(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Warehouse / Branch</label>
            <select value={dWarehouseId} onChange={(e) => setDWarehouseId(e.target.value)} style={inputStyle}>
              <option value="">Not specified</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Vehicle</label>
            <select value={dVehicleId} onChange={(e) => setDVehicleId(e.target.value)} style={inputStyle}>
              <option value="">Not assigned</option>
              {activeVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name}{v.plate_number ? ` (${v.plate_number})` : ""}</option>
              ))}
            </select>

            <label style={labelStyle}>Driver</label>
            <select value={dDriverId} onChange={(e) => setDDriverId(e.target.value)} style={inputStyle}>
              <option value="">Not assigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>

            <label style={labelStyle}>Items</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input placeholder="Product" value={dItemName} onChange={(e) => setDItemName(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 2 }} />
              <input type="number" placeholder="Qty" value={dItemQty} onChange={(e) => setDItemQty(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <button style={ghostButtonSm} onClick={handleAddItem}>Add</button>
            </div>
            {dItems.map((it, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
                {it.quantity} × {it.product_name}
              </div>
            ))}

            <label style={labelStyle}>Notes (optional)</label>
            <input placeholder="Any extra detail" value={dNotes} onChange={(e) => setDNotes(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => { setShowNewDelivery(false); resetDeliveryForm(); }}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateDelivery} disabled={saving}>
                {saving ? "Saving..." : "Create Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 6,
  fontSize: 13,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const ghostButtonSm: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: 460,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  maxHeight: "85vh",
  overflowY: "auto",
};
