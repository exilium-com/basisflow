import React from "react";
import clsx from "clsx";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  align?: "text-left" | "text-right" | "text-center";
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  getRowClassName?: (row: T) => string | undefined;
  className?: string;
};

export function DataTable<T>({ columns, rows, getRowKey, getRowClassName, className = "" }: DataTableProps<T>) {
  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full min-w-160 border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={clsx("border-b border-b-(--line-soft) py-2.5", column.align)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className={getRowClassName?.(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx("border-b border-b-(--line-soft) py-3 text-sm text-(--ink)", column.align)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
