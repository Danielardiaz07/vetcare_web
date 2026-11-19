import type { ReactNode } from "react";

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
      <ul className="flex min-w-0 flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className="relative min-w-0 rounded-card border border-line bg-surface p-4 [overflow-wrap:anywhere]"
          >
            {renderMobileRow ? (
              renderMobileRow(row)
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                {columns.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="mb-1 text-sm text-subtle">{column.header}</dt>
                    <dd className="text-sm text-ink">{column.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
      <div
        role="region"
        aria-label="Tabla de datos"
        tabIndex={0}
        className="relative hidden overflow-x-auto rounded-card border border-line bg-surface md:block"
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
                  <td key={column.key} className="px-4 py-3 text-ink [overflow-wrap:anywhere]">
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
