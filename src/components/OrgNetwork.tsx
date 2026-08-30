"use client";

import { useMemo, useState } from "react";
import type { Organization } from "@/lib/organizations";

/* ------------------------------------------------------------------ */
/*  Config & data                                                      */
/* ------------------------------------------------------------------ */

const GOLD = "#d4a84c";
const GOLD_SOFT = "#f0d78c";

type OrgStatus = "operational" | "warning" | "critical";

type Org = {
  name: string;
  location: string;
  status: OrgStatus;
  lat: number;  // latitude
  lon: number;  // longitude
};

// Best-effort city lookup so real org.location strings ("Nairobi, KE",
// "Kisumu", "Mombasa, Kenya") can be placed on the map without needing a
// dedicated lat/lon column on organizations. Orgs whose location doesn't
// match any entry here are still counted in totals but omitted from the map.
const CITY_COORDS: Record<string, [number, number]> = {
  nairobi: [-1.2921, 36.8219],
  mombasa: [-4.0435, 39.6682],
  kisumu: [-0.0917, 34.7680],
  nakuru: [-0.3031, 36.0800],
  eldoret: [0.5143, 35.2698],
  thika: [-1.0333, 37.0833],
  malindi: [-3.2192, 40.1169],
  kitale: [1.0157, 35.0062],
  nyeri: [-0.4201, 36.9476],
  meru: [0.0470, 37.6556],
  kakamega: [0.2827, 34.7519],
  garissa: [-0.4536, 39.6401],
  kampala: [0.3476, 32.5825],
  "dar es salaam": [-6.7924, 39.2083],
  kigali: [-1.9403, 29.8739],
  "addis ababa": [9.0250, 38.7469],
  lagos: [6.5244, 3.3792],
  johannesburg: [-26.2041, 28.0473],
  cairo: [30.0444, 31.2357],
  accra: [5.6037, -0.1870],
  dubai: [25.2048, 55.2708],
  london: [51.5072, -0.1276],
  "new york": [40.7128, -74.0060],
  mumbai: [19.0760, 72.8777],
  beijing: [39.9042, 116.4074],
};

function resolveCoords(location: string): [number, number] | null {
  const normalized = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) return coords;
  }
  return null;
}

const HUB = { name: "Aurevyn HQ", lat: -1.2921, lon: 36.8219 }; // Nairobi

const STATUS_COLORS: Record<OrgStatus, string> = {
  operational: GOLD,
  warning: "#f59e0b",
  critical: "#ef4444",
};

/* ------------------------------------------------------------------ */
/*  Helper: curved line between two points                             */
/* ------------------------------------------------------------------ */

// react-simple-maps Line is straight. For curved lines like your screenshot,
// we use a custom SVG path inside a Marker, or use a great-circle helper.
// For simplicity, we'll use straight lines with the dash animation which
// still looks great, OR we can compute a quadratic curve.

function curvedLinePath(
  from: [number, number],
  to: [number, number]
): string {
  // Simple quadratic curve with a bow
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bow = 15; // curvature amount
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const FILTER_STATUS: Record<string, OrgStatus | null> = {
  "All Organizations": null,
  Operational: "operational",
  Warning: "warning",
  Critical: "critical",
};

export default function OrgNetwork({ orgs }: { orgs: Organization[] }) {
  const [filter, setFilter] = useState("All Organizations");

  const plottedOrgs = useMemo<Org[]>(() => {
    const statusFilter = FILTER_STATUS[filter];
    return orgs
      .filter((o) => !statusFilter || o.status === statusFilter)
      .map((o) => {
        const coords = resolveCoords(o.location);
        if (!coords) return null;
        return {
          name: o.name,
          location: o.location,
          status: o.status,
          lat: coords[0],
          lon: coords[1],
        };
      })
      .filter((o): o is Org => o !== null);
  }, [orgs, filter]);

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #0c0c0c 0%, #0a0a0a 100%)",
        border: `1px solid ${GOLD}22`,
        borderRadius: 16,
        padding: 24,
        color: "#f5f0e0",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Keyframe animations */}
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(0.85); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes hubPulse {
          0%   { r: 6; opacity: 0.6; }
          100% { r: 20; opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
          position: "relative",
          zIndex: 4,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f5f0e0" }}>
            Organization Network
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a8f78" }}>
            Real-time connection map
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: "#141414",
            color: "#f5f0e0",
            border: `1px solid ${GOLD}33`,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option>All Organizations</option>
          <option>Operational</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
      </div>

      {/* Map Stage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "2 / 1",
          minHeight: 380,
          borderRadius: 12,
          overflow: "hidden",
          background: "#080808",
        }}
      >

        {plottedOrgs.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#9a8f78",
              zIndex: 3,
            }}
          >
            No organizations to show for this filter.
          </div>
        )}

        {/* HTML labels overlay (positioned via CSS, not SVG) */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {plottedOrgs.map((org, i) => {
            // Approximate label positions based on equirectangular projection
            // These are rough - you may need to tweak for your exact layout
            const labelPos = getLabelPosition(org.lat, org.lon);
            const labelBelow = org.lat < HUB.lat; // label below for southern nodes

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${labelPos.x}%`,
                  top: `${labelPos.y}%`,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  zIndex: 3,
                }}
              >
                {!labelBelow && (
                  <div
                    style={{
                      marginBottom: 10,
                      background: "rgba(10,10,10,0.9)",
                      padding: "3px 10px",
                      borderRadius: 8,
                      border: `1px solid ${GOLD}15`,
                      backdropFilter: "blur(4px)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#f5f0e0", fontWeight: 600 }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#9a8f78", marginTop: 1 }}>
                      {org.location}
                    </div>
                  </div>
                )}

                {/* Spacer for the dot itself */}
                <div style={{ height: 14 }} />

                {labelBelow && (
                  <div
                    style={{
                      marginTop: 10,
                      background: "rgba(10,10,10,0.9)",
                      padding: "3px 10px",
                      borderRadius: 8,
                      border: `1px solid ${GOLD}15`,
                      backdropFilter: "blur(4px)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#f5f0e0", fontWeight: 600 }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#9a8f78", marginTop: 1 }}>
                      {org.location}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: convert lat/lon to approximate percentage position           */
/*  for HTML label overlay. Matches the equirectangular projection.      */
/* ------------------------------------------------------------------ */

function getLabelPosition(lat: number, lon: number): { x: number; y: number } {
  // These offsets match the projectionConfig above:
  // scale: 160, center: [15, 5]
  // The map is roughly centered with Africa in the middle
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;

  // Fine-tune offsets for your specific container
  // You may need to adjust these based on your layout
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y)),
  };
}