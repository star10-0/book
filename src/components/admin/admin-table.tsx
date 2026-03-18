import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
};

type AdminTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
};

export function AdminTable<T>({ caption, columns, rows }: AdminTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-right text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200 text-slate-700">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-top">
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
