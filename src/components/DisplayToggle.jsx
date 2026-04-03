import React from "react";
import { SegmentedToggle } from "./SegmentedToggle";

export function DisplayToggle({ value, onChange }) {
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
