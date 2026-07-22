"use client";

import { useState } from "react";

// Curated accent colors for the public page header — every option is tested
// against the warm Kuleo base so a teacher can't pick something jarring.
const OPTIONS: { name: string; value: string }[] = [
  { name: "Kuleo sage", value: "" }, // default
  { name: "Terracotta", value: "#c98a5e" },
  { name: "Ocean", value: "#4a7a96" },
  { name: "Dusty rose", value: "#b0777d" },
  { name: "Plum", value: "#7d5a77" },
  { name: "Slate", value: "#5b6770" },
  { name: "Sand", value: "#b99b6b" },
];

const DEFAULT_SWATCH = "#5b7c6f"; // brand sage, shown for the default chip

export function BrandColorPicker({ initial }: { initial: string }) {
  const [selected, setSelected] = useState(
    OPTIONS.some((o) => o.value === initial) ? initial : "",
  );

  return (
    <div>
      <label className="label">Header color</label>
      <div className="flex flex-wrap items-center gap-2">
        {OPTIONS.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.name}
              type="button"
              title={o.name}
              aria-label={o.name}
              aria-pressed={active}
              onClick={() => setSelected(o.value)}
              className={`size-8 rounded-full border-2 transition-transform ${
                active
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: o.value || DEFAULT_SWATCH }}
            />
          );
        })}
      </div>
      <p className="hint">
        Tints your public page header.{" "}
        {OPTIONS.find((o) => o.value === selected)?.name ?? ""} selected.
      </p>
      <input type="hidden" name="brandColor" value={selected} />
    </div>
  );
}
