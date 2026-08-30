"use client";

import {
  useEffect,
  useState
} from "react";

interface ThreatNode {
  ip: string;
  country: string;
  risk: number;
  attacks: number;
}

export default function ThreatMap() {

  const [data,setData] =
    useState<ThreatNode[]>([]);

  useEffect(() => {

    const load = async () => {

      const res =
        await fetch(
          "/api/security/threat-map"
        );

      setData(
        await res.json()
      );
    };

    load();

    const interval =
      setInterval(
        load,
        3000
      );

    return () =>
      clearInterval(
        interval
      );

  }, []);

  return (
    <div
      style={{
        background:"#0f172a",
        border:"1px solid #1e293b",
        borderRadius:16,
        padding:20
      }}
    >
      <h3>
        Global Threat Map
      </h3>

      {data.map(node => (

        <div
          key={node.ip}
          style={{
            display:"flex",
            justifyContent:
              "space-between",
            marginTop:12
          }}
        >
          <span>
            {node.ip}
          </span>

          <span>
            Risk {node.risk}
          </span>

          <span>
            {node.attacks}
          </span>
        </div>

      ))}
    </div>
  );
}