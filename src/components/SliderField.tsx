import React from "react";
import clsx from "clsx";
import { Field } from "./Field";

type SliderFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  id?: string;
  label: React.ReactNode;
  valueLabel: React.ReactNode;
  className?: string;
  labelClassName?: string;
};

export function SliderField({
  id,
  label,
  valueLabel,
  className = "",
  labelClassName = "",
  ...inputProps
}: SliderFieldProps) {
  const resolvedId = React.useId();
  const inputId = id ?? resolvedId;

  return (
    <Field
      label={
        <>
          <span>{label}</span>
          <span className="leading-5 whitespace-nowrap text-(--ink)">{valueLabel}</span>
        </>
      }
      htmlFor={inputId}
      className={clsx("gap-1", className)}
      labelClassName={clsx("flex min-h-4 items-center justify-between gap-4", labelClassName)}
    >
      <div
        className="flex min-h-10 items-center border border-l-4 border-(--line) border-l-(--teal-soft) bg-(--white)
          px-4"
      >
        <input id={inputId} className="slider-input w-full" type="range" {...inputProps} />
      </div>
    </Field>
  );
}
