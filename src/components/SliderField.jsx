import React from "react";
import { Field, fieldLabelClass } from "./Field";
import { cx } from "../lib/cx";

export function SliderField({
  id,
  label,
  valueLabel,
  className = "",
  labelClassName = "",
  ...inputProps
}) {
  const resolvedId = React.useId();
  const inputId = id ?? resolvedId;

  return (
    <Field
      label={null}
      className={cx("gap-1", className)}
    >
      <div className="flex min-h-5 items-center justify-between gap-3">
        <label className={cx(fieldLabelClass, labelClassName)} htmlFor={inputId}>
          {label}
        </label>
        <span className="whitespace-nowrap text-sm leading-5 text-(--ink)">
          {valueLabel}
        </span>
      </div>
      <div
        className="flex min-h-10 items-center border border-l-4 border-(--line)
          border-l-(--teal-soft) bg-(--white) px-3"
      >
        <input id={inputId} className="slider-input w-full" type="range" {...inputProps} />
      </div>
    </Field>
  );
}
