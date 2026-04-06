import React from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { usd } from "../lib/format";
import { toDisplayValue, type ProjectionInputs } from "../lib/projectionState";
import { type ProjectionRow } from "../lib/projectionUtils";

type ProjectionTableProps = {
  projectionInputs: ProjectionInputs;
  rows: ProjectionRow[];
};

export function ProjectionTable({ projectionInputs, rows }: ProjectionTableProps) {
  const columns: DataTableColumn<ProjectionRow>[] = [
    {
      key: "year",
      header: "Year",
      align: "text-left",
      render: (row) => row.year,
    },
    {
      key: "assetsGross",
      header: "Assets",
      align: "text-right",
      render: (row) => usd(toDisplayValue(row.assetsGross, row.year, projectionInputs)),
    },
    {
      key: "homeEquity",
      header: "Home equity",
      align: "text-right",
      render: (row) => usd(toDisplayValue(row.homeEquity, row.year, projectionInputs)),
    },
    {
      key: "netWorth",
      header: "Net worth",
      align: "text-right",
      render: (row) => usd(toDisplayValue(row.netWorth, row.year, projectionInputs)),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.year}
      getRowClassName={(row) => (row.year === projectionInputs.currentYear ? "bg-(--teal-soft)" : undefined)}
    />
  );
}
