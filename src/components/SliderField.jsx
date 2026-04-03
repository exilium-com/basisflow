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
  return (
    <Field
      label={null}
      className={cx(
        "gap-2 border border-(--line-soft) bg-(--white-soft) p-3",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label className={cx(fieldLabelClass, labelClassName)} htmlFor={id}>
          {label}
        </label>
        <span className="whitespace-nowrap text-base font-bold text-(--ink)">
          {valueLabel}
        </span>
      </div>
      <input id={id} className="slider-input" type="range" {...inputProps} />
    </Field>
  );
}
