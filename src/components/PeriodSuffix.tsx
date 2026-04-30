type PeriodSuffixProps = {
  period: "year" | "month";
  unit?: string;
};

export function PeriodSuffix({ period, unit = "" }: PeriodSuffixProps) {
  const longLabel = period === "year" ? "year" : "month";
  const shortLabel = period === "year" ? "y" : "m";

  return (
    <>
      <span className="period-suffix-long">{unit ? `${unit} / ${longLabel}` : `/ ${longLabel}`}</span>
      <span className="period-suffix-short">{unit ? `${unit}/${shortLabel}` : `/${shortLabel}`}</span>
    </>
  );
}
