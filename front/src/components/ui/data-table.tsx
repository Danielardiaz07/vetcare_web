import type { ReactNode } from "react";
import { cn } from "./cn";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  renderMobileRow?: (row: Row) => ReactNode;
};

export function DataTable<Row>({ columns, rows, getRowKey, renderMobileRow }: DataTableProps<Row>) {
  return (
    <>
      {renderMobileRow && (
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <li key={getRowKey(row)} className="rounded-card border border-line bg-surface p-4">
              {renderMobileRow(row)}
            </li>
          ))}
        </ul>
      )}
      <div
        className={cn(
          "overflow-x-auto rounded-card border border-line bg-surface",
          renderMobileRow && "hidden md:block",
        )}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-subtle">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-divider last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-ink">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
