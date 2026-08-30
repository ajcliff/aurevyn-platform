"use client";

import EngineCard from "./EngineCard";

import type {
  InstalledEngine
} from "@/lib/runtime/models";

type Props = {
  engines: InstalledEngine[];
  activeEngine: string | null;
  onSelect: (id: string) => void;
};

export default function EngineLauncher({
  engines,
  activeEngine,
  onSelect
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill,minmax(220px,1fr))",
        gap: "12px"
      }}
    >
      {engines.map((engine) => (
        <EngineCard
          key={engine.engines.id}
          icon={engine.engines.icon}
          name={engine.engines.name}
          category={engine.engines.category}
          active={
            activeEngine === engine.engines.id
          }
          onClick={() =>
            onSelect(engine.engines.id)
          }
        />
      ))}
    </div>
  );
}