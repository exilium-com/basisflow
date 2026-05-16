import clsx from "clsx";
import type React from "react";
import { NumberField } from "../Field";
import { ProjectedValueDisplay } from "../ProjectedValueDisplay";
import type { MetricDeltaValue } from "../MetricDelta";

type RowValueProjectionProps = {
  children: React.ReactNode;
  delta?: MetricDeltaValue;
  label: string;
  value: string;
};

type RowMoneyFieldProps = Omit<
  React.ComponentProps<typeof NumberField>,
  "frameClassName" | "inputClassName" | "mobileInline" | "prefix"
> & {
  muted?: boolean;
};

export function RowValueProjection({ children, delta, label, value }: RowValueProjectionProps) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {children}
      <ProjectedValueDisplay delta={delta} label={label} mobileInline value={value} />
    </div>
  );
}

export function RowMoneyField({ muted = false, ...props }: RowMoneyFieldProps) {
  return (
    <NumberField
      {...props}
      mobileInline
      prefix="$"
      frameClassName="px-2"
      inputClassName={clsx(muted && "text-ink-soft")}
    />
  );
}
