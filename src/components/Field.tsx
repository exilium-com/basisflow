import React from "react";
import clsx from "clsx";
import { InlineLabelLayout } from "./InlineLabelLayout";
import { labelTextClass } from "../lib/text";

type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  mobileInline?: boolean;
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
  mobileInline?: boolean;
};

type NativeFieldProps<T> = BaseFieldProps & Omit<T, "className" | "label">;
type FramedFieldProps<T> = NativeFieldProps<T> & { invalid?: boolean };
type AffixedFieldProps<T> = FramedFieldProps<T> & {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

type TextFieldProps = AffixedFieldProps<Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix">>;

type NumberFieldProps = AffixedFieldProps<
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "label" | "prefix" | "suffix" | "value" | "onChange"
  > & {
    value?: number | string | null;
    onChange?: React.ChangeEventHandler<HTMLInputElement> | null;
    onValueChange?: (value: number | null, rawValue: string) => void;
  }
>;

type SelectFieldProps = FramedFieldProps<React.SelectHTMLAttributes<HTMLSelectElement>>;
type CheckboxFieldProps = FramedFieldProps<Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>;

type TextAreaFieldProps = NativeFieldProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>>;

type SliderFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  id?: string;
  label: React.ReactNode;
  valueLabel: React.ReactNode;
  className?: string;
  labelClassName?: string;
};

type DollarPercentFieldProps = Omit<NumberFieldProps, "prefix" | "suffix" | "step"> & {
  mode: "dollar" | "percent";
  onModeToggle: () => void;
  dollarStep?: React.InputHTMLAttributes<HTMLInputElement>["step"];
  percentStep?: React.InputHTMLAttributes<HTMLInputElement>["step"];
};

const inputFrameClassName =
  "flex min-h-10 items-center border border-l-4 border-line border-l-teal-soft bg-white px-3 focus-within:border-teal";

const inputControlClassName = clsx("w-full min-w-0 border-0 bg-transparent p-0 outline-none", "text-sm font-semibold");

const textareaClassName = clsx(
  "min-h-48 w-full resize-y border border-line bg-white p-4",
  "font-mono text-sm outline-none",
);

const unitToggleClassName =
  "inline-flex items-center rounded-sm border border-teal-soft px-1 text-sm text-teal focus-visible:outline-none";

function useInputId(htmlFor?: string) {
  const resolvedId = React.useId();
  return htmlFor ?? resolvedId;
}

export function Field({ label, htmlFor, className, labelClassName, mobileInline = false, children }: FieldProps) {
  return (
    <InlineLabelLayout
      label={label}
      htmlFor={htmlFor}
      className={className}
      labelClassName={labelClassName}
      mobileInline={mobileInline}
    >
      {children}
    </InlineLabelLayout>
  );
}

export function InputFrame({ prefix = null, suffix = null, invalid = false, className, children }: InputFrameProps) {
  return (
    <div
      className={clsx(
        inputFrameClassName,
        suffix && "period-suffix-container",
        invalid && "border-destructive border-l-destructive",
        className,
      )}
    >
      {prefix ? <span className={clsx(labelTextClass, "mr-2")}>{prefix}</span> : null}
      {children}
      {suffix ? <span className={clsx("whitespace-nowrap", labelTextClass)}>{suffix}</span> : null}
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
  className,
  labelClassName,
  frameClassName,
  inputClassName,
  mobileInline,
  ...inputProps
}: TextFieldProps) {
  const inputId = useInputId(htmlFor);

  return (
    <Field
      label={label}
      htmlFor={inputId}
      className={className}
      labelClassName={labelClassName}
      mobileInline={mobileInline}
    >
      <InputFrame prefix={prefix} suffix={suffix} invalid={invalid} className={frameClassName}>
        <input id={inputId} type={type} className={clsx(inputControlClassName, inputClassName)} {...inputProps} />
      </InputFrame>
    </Field>
  );
}

export function NumberField({
  label = null,
  htmlFor,
  prefix = null,
  suffix = null,
  invalid = false,
  className,
  labelClassName,
  frameClassName,
  inputClassName,
  mobileInline,
  value = "",
  onChange = null,
  onValueChange,
  ...inputProps
}: NumberFieldProps) {
  const inputId = useInputId(htmlFor);
  const isNumericValue = typeof value === "number" || value == null;
  const [draftValue, setDraftValue] = React.useState(() => (value == null ? "" : String(value)));
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isNumericValue && !isEditing) {
      setDraftValue(value == null ? "" : String(value));
    }
  }, [isEditing, isNumericValue, value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (isNumericValue) {
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
    onValueChange(Number.isNaN(parsed) ? null : parsed, event.target.value);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    setIsEditing(false);
    inputProps.onBlur?.(event);
    if (isNumericValue) {
      setDraftValue(value == null ? "" : String(value));
    }
  }

  return (
    <Field
      label={label}
      htmlFor={inputId}
      className={className}
      labelClassName={labelClassName}
      mobileInline={mobileInline}
    >
      <InputFrame prefix={prefix} suffix={suffix} invalid={invalid} className={frameClassName}>
        <input
          id={inputId}
          type="number"
          className={clsx(inputControlClassName, inputClassName)}
          {...inputProps}
          value={isNumericValue ? draftValue : value}
          onFocus={() => setIsEditing(true)}
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
  className,
  labelClassName,
  frameClassName,
  inputClassName,
  mobileInline,
  children,
  ...inputProps
}: SelectFieldProps) {
  const inputId = useInputId(htmlFor);

  return (
    <Field
      label={label}
      htmlFor={inputId}
      className={className}
      labelClassName={labelClassName}
      mobileInline={mobileInline}
    >
      <InputFrame invalid={invalid} className={frameClassName}>
        <select id={inputId} className={clsx(inputControlClassName, inputClassName)} {...inputProps}>
          {children}
        </select>
      </InputFrame>
    </Field>
  );
}

export function CheckboxField({
  label,
  htmlFor,
  invalid = false,
  className,
  labelClassName,
  frameClassName,
  inputClassName,
  ...inputProps
}: CheckboxFieldProps) {
  const inputId = useInputId(htmlFor);

  return (
    <Field label="." className={className} labelClassName="invisible select-none">
      <InputFrame invalid={invalid} className={clsx("h-10 w-fit justify-start px-2", frameClassName)}>
        <label className={clsx("flex items-center gap-2 text-sm font-semibold", labelClassName)} htmlFor={inputId}>
          <input
            id={inputId}
            type="checkbox"
            className={clsx("h-4 w-4 shrink-0 accent-teal", inputClassName)}
            {...inputProps}
          />
          <span>{label}</span>
        </label>
      </InputFrame>
    </Field>
  );
}

export function TextAreaField({
  label,
  htmlFor,
  className,
  labelClassName,
  inputClassName,
  ...props
}: TextAreaFieldProps) {
  const inputId = useInputId(htmlFor);

  return (
    <Field label={label} htmlFor={inputId} className={className} labelClassName={labelClassName}>
      <textarea id={inputId} className={clsx(textareaClassName, inputClassName)} {...props} />
    </Field>
  );
}

export function SliderField({ id, label, valueLabel, className, labelClassName, ...inputProps }: SliderFieldProps) {
  const inputId = useInputId(id);

  return (
    <Field
      label={
        <>
          <span>{label}</span>
          <span className="whitespace-nowrap">{valueLabel}</span>
        </>
      }
      htmlFor={inputId}
      className={className}
      labelClassName={clsx("flex justify-between gap-4", labelClassName)}
    >
      <InputFrame>
        <input id={inputId} className="slider-input" type="range" {...inputProps} />
      </InputFrame>
    </Field>
  );
}

export function DollarPercentField({
  mode,
  onModeToggle,
  dollarStep = "1000",
  percentStep = "0.1",
  ...props
}: DollarPercentFieldProps) {
  const nextMode = mode === "dollar" ? "percent" : "dollar";
  const unitButton = (
    <button
      type="button"
      className={unitToggleClassName}
      aria-label={`Switch to ${nextMode === "dollar" ? "dollars" : "percent"}`}
      onClick={onModeToggle}
    >
      {mode === "dollar" ? "$" : "%"}
    </button>
  );

  return (
    <NumberField
      {...props}
      step={mode === "dollar" ? dollarStep : percentStep}
      prefix={mode === "dollar" ? unitButton : null}
      suffix={mode === "percent" ? unitButton : null}
    />
  );
}
