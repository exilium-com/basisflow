import React from "react";
import { cx } from "../lib/cx";

export const fieldLabelClass =
  "text-sm text-(--ink-soft)";

const inputBaseClassName =
  "w-full min-w-0 border-0 bg-transparent p-0 text-base font-semibold text-(--ink) outline-none";

const selectClassName =
  "w-full min-w-0 appearance-none border-0 bg-transparent p-0 pr-6 text-base font-semibold text-(--ink) outline-none";

const textAreaClassName =
  "min-h-60 w-full resize-y border border-(--line) bg-(--white) px-3 py-3 font-mono text-sm font-semibold leading-6 text-(--ink) outline-none";

const inputFrameClassName =
  "relative flex min-h-10 items-center border border-(--line) border-l-4 border-l-(--teal-soft) bg-(--white) px-3 transition-colors focus-within:border-(--teal) focus-within:border-l-(--teal)";
const invalidInputFrameClassName = "border-(--danger) border-l-(--danger)";
const affixClassName = "flex-none text-sm font-extrabold text-(--ink-soft)";
const checkboxLabelClassName =
  "flex min-h-8 w-full min-w-0 items-center gap-2 text-base font-semibold text-(--ink)";

export function Field({
  label,
  htmlFor,
  className = "",
  labelClassName = "",
  children,
}) {
  return (
    <div className={cx("grid min-w-0 gap-1", className)}>
      {label ? (
        <label
          className={cx(fieldLabelClass, labelClassName)}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function InputFrame({
  prefix = null,
  suffix = null,
  invalid = false,
  className = "",
  children,
}) {
  return (
    <div
      className={cx(
        inputFrameClassName,
        invalid && invalidInputFrameClassName,
        className,
      )}
    >
      {prefix ? (
        <span className={cx(affixClassName, "mr-1.5 ml-0.5")}>{prefix}</span>
      ) : null}
      {children}
      {suffix ? (
        <span className={cx(affixClassName, "ml-1.5")}>{suffix}</span>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  htmlFor,
  type = "text",
  prefix = null,
  suffix = null,
  invalid = false,
  className = "",
  labelClassName = "",
  frameClassName = "",
  inputClassName = "",
  ...inputProps
}) {
  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      className={className}
      labelClassName={labelClassName}
    >
      <InputFrame
        prefix={prefix}
        suffix={suffix}
        invalid={invalid}
        className={frameClassName}
      >
        <input
          id={htmlFor}
          type={type}
          className={cx(inputBaseClassName, inputClassName)}
          {...inputProps}
        />
      </InputFrame>
    </Field>
  );
}

export function NumberField({
  label,
  htmlFor,
  prefix = null,
  suffix = null,
  invalid = false,
  compact = false,
  className = "",
  labelClassName = "",
  frameClassName = "",
  inputClassName = "",
  ...inputProps
}) {
  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      className={className}
      labelClassName={labelClassName}
    >
      <InputFrame
        prefix={prefix}
        suffix={suffix}
        invalid={invalid}
        className={cx(compact && "min-h-9 px-2", frameClassName)}
      >
        <input
          id={htmlFor}
          type="number"
          className={cx(inputBaseClassName, compact && "text-sm", inputClassName)}
          {...inputProps}
        />
      </InputFrame>
    </Field>
  );
}

export function SelectField({
  label,
  htmlFor,
  invalid = false,
  className = "",
  labelClassName = "",
  frameClassName = "",
  children,
  ...inputProps
}) {
  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      className={className}
      labelClassName={labelClassName}
    >
      <InputFrame invalid={invalid} className={frameClassName}>
        <select id={htmlFor} className={selectClassName} {...inputProps}>
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 text-sm font-bold text-(--ink-soft)"
        >
          ▾
        </span>
      </InputFrame>
    </Field>
  );
}

export function CheckboxField({
  label,
  htmlFor,
  invalid = false,
  className = "",
  labelClassName = "",
  frameClassName = "",
  inputClassName = "",
  ...inputProps
}) {
  return (
    <div className={cx("grid min-w-0 gap-1", className)}>
      <div
        aria-hidden="true"
        className={cx(fieldLabelClass, "invisible select-none", labelClassName)}
      >
        {label || "."}
      </div>
      <InputFrame
        invalid={invalid}
        className={cx("min-h-9 justify-start px-2", frameClassName)}
      >
        <label
          className={cx(checkboxLabelClassName, labelClassName)}
          htmlFor={htmlFor}
        >
          <input
            id={htmlFor}
            type="checkbox"
            className={cx("h-4 w-4 shrink-0 accent-(--teal)", inputClassName)}
            {...inputProps}
          />
          <span>{label}</span>
        </label>
      </InputFrame>
    </div>
  );
}

export function TextAreaField({
  label,
  htmlFor,
  className = "",
  labelClassName = "",
  ...props
}) {
  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      className={className}
      labelClassName={labelClassName}
    >
      <textarea id={htmlFor} className={textAreaClassName} {...props} />
    </Field>
  );
}
