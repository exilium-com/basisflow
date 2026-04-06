import React from "react";
import { SegmentedToggle } from "./SegmentedToggle";

type DisplayToggleProps = {
  value: "nominal" | "real";
  onChange: (value: "nominal" | "real") => void;
};

export function DisplayToggle({ value, onChange }: DisplayToggleProps) {
  return (
    <SegmentedToggle
      ariaLabel="Display mode"
      value={value}
      onChange={onChange}
      options={[
        { value: "nominal", label: "Nominal" },
        { value: "real", label: "Real" },
      ]}
    />
  );
}
