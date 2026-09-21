"use client";

import type { MarkTable } from "@/lib/marks";

export default function MarkTableView({ table }: { table: MarkTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {table.head && table.head.length > 0 && (
          <thead>
            {table.head.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <th
                    key={ci}
                    colSpan={c.colspan || 1}
                    rowSpan={c.rowspan || 1}
                    className="border bg-zinc-50 px-2 py-1 text-left font-semibold"
                  >
                    {c.value}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {(table.body ?? []).map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td
                  key={ci}
                  colSpan={c.colspan || 1}
                  rowSpan={c.rowspan || 1}
                  className={`border px-2 py-1 ${c.bold ? "font-semibold" : ""}`}
                >
                  {c.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
