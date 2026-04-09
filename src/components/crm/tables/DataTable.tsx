"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  editable?: boolean;
  editKey?: string;
  editType?: "text" | "number" | "select";
  editOptions?: { value: string; label: string }[];
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
  onCellEdit?: (
    itemId: string,
    field: string,
    value: string | number | string[]
  ) => Promise<void>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function EditableCell({
  value,
  type,
  options,
  onSave,
  onCancel,
}: {
  value: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(editValue);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const baseClass =
    "w-full bg-transparent text-sm text-heading outline-none ring-2 ring-smaragd/40 rounded-lg px-2 py-1 -mx-2 -my-1";

  if (type === "select" && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          onSave(e.target.value);
        }}
        onBlur={() => onSave(editValue)}
        onKeyDown={handleKeyDown}
        className={`${baseClass} bg-surface-light`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => onSave(editValue)}
      onKeyDown={handleKeyDown}
      className={baseClass}
    />
  );
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  onCellEdit,
  selectedIds,
  onToggleSelect,
}: DataTableProps<T>) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colKey: string;
  } | null>(null);

  const handleSave = async (
    item: T,
    col: Column<T>,
    newValue: string
  ) => {
    const itemId = keyExtractor(item);
    const field = col.editKey || col.key;
    const currentValue = String(
      (item as Record<string, unknown>)[col.editKey || col.key] ?? ""
    );

    setEditingCell(null);

    if (newValue === currentValue) return;

    if (onCellEdit) {
      if (col.editType === "number") {
        await onCellEdit(itemId, field, Number(newValue) || 0);
      } else {
        await onCellEdit(itemId, field, newValue);
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-light">
            {selectedIds && onToggleSelect && (
              <th className="w-10 px-4 py-4">
                <input
                  type="checkbox"
                  checked={data.length > 0 && data.every((item) => selectedIds.has(keyExtractor(item)))}
                  onChange={() => {
                    if (data.every((item) => selectedIds.has(keyExtractor(item)))) {
                      data.forEach((item) => onToggleSelect(keyExtractor(item)));
                    } else {
                      data.filter((item) => !selectedIds.has(keyExtractor(item))).forEach((item) => onToggleSelect(keyExtractor(item)));
                    }
                  }}
                  className="h-4 w-4 rounded accent-smaragd cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {data.map((item, index) => {
            const rowId = keyExtractor(item);
            const isSelected = selectedIds?.has(rowId) ?? false;
            return (
              <tr
                key={rowId}
                onClick={() => {
                  if (!editingCell) onRowClick?.(item);
                }}
                className={`transition-colors duration-150 border-b border-surface-border last:border-0 ${
                  isSelected ? "bg-smaragd/5" : index % 2 === 1 ? "bg-surface-light/30" : ""
                } ${
                  onRowClick && !editingCell
                    ? "cursor-pointer hover:bg-surface-light"
                    : ""
                }`}
              >
                {selectedIds && onToggleSelect && (
                  <td className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(rowId)}
                      className="h-4 w-4 rounded accent-smaragd cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col) => {
                  const isEditing =
                    editingCell?.rowId === rowId &&
                    editingCell?.colKey === col.key;
                  const cellValue = String(
                    (item as Record<string, unknown>)[
                      col.editKey || col.key
                    ] ?? ""
                  );

                  return (
                    <td
                      key={col.key}
                      onDoubleClick={(e) => {
                        if (col.editable && onCellEdit) {
                          e.stopPropagation();
                          setEditingCell({ rowId, colKey: col.key });
                        }
                      }}
                      className={`px-5 py-4 text-body ${col.className || ""} ${
                        col.editable && onCellEdit
                          ? "cursor-text hover:bg-surface-light/50"
                          : ""
                      }`}
                    >
                      {isEditing ? (
                        <EditableCell
                          value={cellValue}
                          type={col.editType || "text"}
                          options={col.editOptions}
                          onSave={(val) => handleSave(item, col, val)}
                          onCancel={() => setEditingCell(null)}
                        />
                      ) : col.render ? (
                        col.render(item)
                      ) : (
                        cellValue
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
