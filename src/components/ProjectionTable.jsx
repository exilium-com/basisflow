import React from "react";
import { usd } from "../lib/format";
import { toDisplayValue } from "../lib/projectionState";

export function ProjectionTable({ projectionInputs, rows }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>Assets</th>
          <th>Asset tax</th>
          <th>Home equity</th>
          <th>Reserve cash</th>
          <th>Net worth</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.year} className={row.year === projectionInputs.currentYear ? "bg-(--teal-soft)" : ""}>
            <td>{row.year}</td>
            <td>{usd(toDisplayValue(row.assetsGross, row.year, projectionInputs))}</td>
            <td>{usd(toDisplayValue(row.capitalGainsTax, row.year, projectionInputs))}</td>
            <td>{usd(toDisplayValue(row.homeEquity, row.year, projectionInputs))}</td>
            <td>{usd(toDisplayValue(row.residualCash, row.year, projectionInputs))}</td>
            <td>{usd(toDisplayValue(row.netWorth, row.year, projectionInputs))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
