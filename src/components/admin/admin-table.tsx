import type { ReactNode } from "react";
import Link from "next/link";

type Column<T> = {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
};

type AdminTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string;
  emptyMessage?: string;
  emptyAction?: {
    href: string;
    label: string;
  };
};

export function AdminTable<T>({ caption, columns, rows, getRowKey, emptyMessage, emptyAction }: AdminTableProps<T>) {
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
          {rows.length === 0 ? (
            <tr className="border-t border-slate-200">
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <div className="space-y-3">
                  <p className="text-slate-500">{emptyMessage ?? "لا توجد بيانات حالياً."}</p>
                  {emptyAction ? (
                    <Link
                      href={emptyAction.href}
                      className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                    >
                      {emptyAction.label}
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ) : null}

          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : index} className="border-t border-slate-200 text-slate-700">
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
