import React from "react";
import clsx from "clsx";

export const fieldLabelClass = "text-sm text-(--ink-soft)";

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
const checkboxLabelClassName = "flex min-h-8 w-full min-w-0 items-center gap-2 text-base font-semibold text-(--ink)";

type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
};

type InputFrameProps = {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  invalid?: boolean;
  className?: string;
  children: React.ReactNode;
};

type BaseFieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  frameClassName?: string;
  inputClassName?: string;
};

type TextFieldProps = BaseFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "children" | "label" | "prefix" | "suffix"> & {
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    invalid?: boolean;
  };

type NumberFieldProps = BaseFieldProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "children" | "label" | "prefix" | "suffix" | "value" | "onChange"
  > & {
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    invalid?: boolean;
    compact?: boolean;
    value?: number | string | null;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onValueChange?: (value: number | null, rawValue: string) => void;
  };

type SelectFieldProps = BaseFieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className" | "label"> & {
    invalid?: boolean;
    children: React.ReactNode;
  };

type CheckboxFieldProps = BaseFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "children" | "label"> & {
    invalid?: boolean;
  };

type TextAreaFieldProps = BaseFieldProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "label">;

export function Field({ label, htmlFor, className = "", labelClassName = "", children }: FieldProps) {
  return (
    <div className={clsx("grid min-w-0 gap-1", className)}>
      {label ? (
        <label className={clsx(fieldLabelClass, labelClassName)} htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function InputFrame({ prefix = null, suffix = null, invalid = false, className = "", children }: InputFrameProps) {
  return (
    <div className={clsx(inputFrameClassName, invalid && invalidInputFrameClassName, className)}>
      {prefix ? <span className={clsx(affixClassName, "mr-1.5 ml-0.5")}>{prefix}</span> : null}
      {children}
      {suffix ? <span className={clsx(affixClassName, "ml-1.5")}>{suffix}</span> : null}
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
}: TextFieldProps) {
  const resolvedId = React.useId();
  const inputId = htmlFor ?? resolvedId;

  return (
    <Field label={label} htmlFor={inputId} className={className} labelClassName={labelClassName}>
      <InputFrame prefix={prefix} suffix={suffix} invalid={invalid} className={frameClassName}>
        <input id={inputId} type={type} className={clsx(inputBaseClassName, inputClassName)} {...inputProps} />
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
  value = "",
  onChange,
  onValueChange,
  ...inputProps
}: NumberFieldProps) {
  const resolvedId = React.useId();
  const inputId = htmlFor ?? resolvedId;
  const usesNumericValue = typeof value === "number" || value == null;
  const [draftValue, setDraftValue] = React.useState(() => (usesNumericValue ? (value == null ? "" : String(value)) : value));
  const lastNumericValueRef = React.useRef<number | null | undefined>(usesNumericValue ? value : undefined);

  React.useEffect(() => {
    if (!usesNumericValue) {
      return;
    }

    if (lastNumericValueRef.current !== value) {
      setDraftValue(value == null ? "" : String(value));
      lastNumericValueRef.current = value;
    }
  }, [usesNumericValue, value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (usesNumericValue) {
      setDraftValue(event.target.value);
    }

    onChange?.(event);

    if (!onValueChange) {
      return;
    }

    if (event.target.value.trim() === "") {
      onValueChange(null, event.target.value);
      return;
    }

    const parsed = Number.parseFloat(event.target.value);
    onValueChange(Number.isFinite(parsed) ? parsed : null, event.target.value);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    inputProps.onBlur?.(event);

    if (usesNumericValue) {
      setDraftValue(value == null ? "" : String(value));
    }
  }

  return (
    <Field label={label} htmlFor={inputId} className={className} labelClassName={labelClassName}>
      <InputFrame
        prefix={prefix}
        suffix={suffix}
        invalid={invalid}
        className={clsx(compact && "min-h-9 px-2", frameClassName)}
      >
        <input
          id={inputId}
          type="number"
          className={clsx(inputBaseClassName, compact && "text-sm", inputClassName)}
          {...inputProps}
          value={usesNumericValue ? draftValue : value}
          onChange={handleChange}
          onBlur={handleBlur}
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
}: SelectFieldProps) {
  const resolvedId = React.useId();
  const inputId = htmlFor ?? resolvedId;

  return (
    <Field label={label} htmlFor={inputId} className={className} labelClassName={labelClassName}>
      <InputFrame invalid={invalid} className={frameClassName}>
        <select id={inputId} className={selectClassName} {...inputProps}>
          {children}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 text-sm font-bold text-(--ink-soft)">
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
}: CheckboxFieldProps) {
  const resolvedId = React.useId();
  const inputId = htmlFor ?? resolvedId;

  return (
    <div className={clsx("grid min-w-0 gap-1", className)}>
      <div aria-hidden="true" className={clsx(fieldLabelClass, "invisible select-none", labelClassName)}>
        {label || "."}
      </div>
      <InputFrame invalid={invalid} className={clsx("min-h-9 justify-start px-2", frameClassName)}>
        <label className={clsx(checkboxLabelClassName, labelClassName)} htmlFor={inputId}>
          <input
            id={inputId}
            type="checkbox"
            className={clsx("h-4 w-4 shrink-0 accent-(--teal)", inputClassName)}
            {...inputProps}
          />
          <span>{label}</span>
        </label>
      </InputFrame>
    </div>
  );
}

export function TextAreaField({ label, htmlFor, className = "", labelClassName = "", ...props }: TextAreaFieldProps) {
  const resolvedId = React.useId();
  const inputId = htmlFor ?? resolvedId;

  return (
    <Field label={label} htmlFor={inputId} className={className} labelClassName={labelClassName}>
      <textarea id={inputId} className={textAreaClassName} {...props} />
    </Field>
  );
}
