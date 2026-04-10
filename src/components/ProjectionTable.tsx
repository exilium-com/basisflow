import React from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { usd } from "../lib/format";
import { toDisplayValue, type Projection } from "../lib/projectionState";
import { type ProjectionRow } from "../lib/projectionUtils";

type ProjectionTableProps = {
  projection: Projection;
  rows: ProjectionRow[];
};

export function ProjectionTable({ projection, rows }: ProjectionTableProps) {
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
      render: (row) => usd(toDisplayValue(row.assetsGross, row.year, projection)),
    },
    {
      key: "homeEquity",
      header: "Home equity",
      align: "text-right",
      render: (row) => usd(toDisplayValue(row.homeEquity, row.year, projection)),
    },
    {
      key: "netWorth",
      header: "Net worth",
      align: "text-right",
      render: (row) => usd(toDisplayValue(row.netWorth, row.year, projection)),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.year}
      getRowClassName={(row) => (row.year === projection.currentYear ? "bg-(--teal-soft)" : undefined)}
    />
  );
}
