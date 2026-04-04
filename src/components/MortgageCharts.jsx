import React from "react";
import { buildLinePath, getChartFrame } from "../lib/chart";
import { usd } from "../lib/format";

function EmptyChart({ message, label }) {
  return (
    <svg viewBox="0 0 720 320" role="img" aria-label={label}>
      <rect x="18" y="18" width="684" height="284" fill="var(--white-soft)" stroke="var(--line-soft)" />
      <text
        x="360"
        y="168"
        textAnchor="middle"
        fill="var(--ink-soft)"
        fontSize="18"
        fontFamily="Avenir Next, Segoe UI, sans-serif"
      >
        {message}
      </text>
    </svg>
  );
}

export function MortgageBalanceChart({ scenario }) {
  const schedule = scenario.schedule;

  if (!schedule.length || scenario.loanAmount <= 0) {
    return (
      <EmptyChart label="Remaining balance over time chart" message="Enter a loan amount to draw the balance curve." />
    );
  }

  const { height, innerWidth, innerHeight, plotLeft, plotTop, plotRight, plotBottom } = getChartFrame();
  const totalMonths = schedule.length;
  const maxBalance = scenario.loanAmount;
  const points = [
    { month: 0, balance: scenario.loanAmount },
    ...schedule.map((row) => ({ month: row.month, balance: row.balance })),
  ].map((point) => ({
    x: plotLeft + (point.month / totalMonths) * innerWidth,
    y: plotTop + ((maxBalance - point.balance) / maxBalance) * innerHeight,
  }));
  const areaPath = `${buildLinePath(points)} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const linePath = buildLinePath(points);
  const tickValues = [...new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(totalMonths * fraction)))];

  return (
    <svg viewBox="0 0 720 320" role="img" aria-label="Remaining balance over time chart">
      <defs>
        <linearGradient id="balanceAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--teal-soft)" />
          <stop offset="100%" stopColor="var(--white)" />
        </linearGradient>
      </defs>
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = plotTop + innerHeight * fraction;
        const balance = maxBalance * (1 - fraction);
        return (
          <g key={fraction}>
            <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="var(--line-soft)" strokeDasharray="4 8" />
            <text x={plotLeft - 12} y={y + 5} textAnchor="end" fill="var(--ink-soft)" fontSize="12">
              {usd(balance)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#balanceAreaGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--line)" />
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="var(--line)" />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Remaining balance
      </text>
      {tickValues.map((month) => {
        const x = plotLeft + (month / totalMonths) * innerWidth;
        const yearValue = month / 12;
        const label = Number.isInteger(yearValue) ? String(yearValue) : yearValue.toFixed(1);
        return (
          <g key={month}>
            <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 6} stroke="var(--line)" />
            <text x={x} y={height - 12} textAnchor="middle" fill="var(--ink-soft)" fontSize="12">
              {label}y
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MortgageCompositionChart({ scenario }) {
  const breakdown = scenario.yearlyBreakdown;

  if (!breakdown.length) {
    return (
      <EmptyChart
        label="Principal versus interest by year chart"
        message="Enter a loan amount to draw the payment mix."
      />
    );
  }

  const { height, innerWidth, innerHeight, plotLeft, plotTop, plotRight, plotBottom } = getChartFrame();
  const maxTotal = Math.max(...breakdown.map((year) => year.principal + year.interest), 1);
  const step = innerWidth / breakdown.length;
  const barWidth = Math.max(Math.min(step * 0.72, 42), 8);

  return (
    <svg viewBox="0 0 720 320" role="img" aria-label="Principal versus interest by year chart">
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.5, 1].map((fraction) => {
        const value = maxTotal * fraction;
        const y = plotBottom - innerHeight * fraction;
        return (
          <g key={fraction}>
            <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="var(--line-soft)" strokeDasharray="4 8" />
            <text x={plotLeft - 12} y={y + 5} textAnchor="end" fill="var(--ink-soft)" fontSize="12">
              {usd(value)}
            </text>
          </g>
        );
      })}
      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--line)" />
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="var(--line)" />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Annual payment mix
      </text>
      {breakdown.map((year, index) => {
        const x = plotLeft + index * step + (step - barWidth) / 2;
        const total = year.principal + year.interest;
        const totalHeight = (total / maxTotal) * innerHeight;
        const principalHeight = total > 0 ? (year.principal / maxTotal) * innerHeight : 0;
        const interestHeight = totalHeight - principalHeight;
        const y = plotBottom - totalHeight;
        const principalY = plotBottom - principalHeight;
        const shouldLabel =
          breakdown.length <= 12 || index === 0 || year.year % 5 === 0 || index === breakdown.length - 1;

        return (
          <g key={year.year}>
            <title>{`Year ${year.year}: ${usd(year.principal)} principal, ${usd(year.interest)} interest`}</title>
            <rect x={x} y={y} width={barWidth} height={Math.max(interestHeight, 0)} fill="var(--clay)" />
            <rect x={x} y={principalY} width={barWidth} height={Math.max(principalHeight, 0)} fill="var(--teal)" />
            {shouldLabel ? (
              <text x={x + barWidth / 2} y={height - 14} textAnchor="middle" fill="var(--ink-soft)" fontSize="12">
                {year.year}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
