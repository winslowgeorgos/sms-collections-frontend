// components/ui/GenericTable.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * GenericTable.tsx
 *
 * - Supports: sticky header, column resizing (A+B), column reorder, column hide/unhide,
 *   filters (text, choices, number_range, date_range, custom), sorting, selection,
 *   virtualization (@tanstack/react-virtual), CSV/XLSX export, pagination fallback.
 * - Now supports both client-side and server-side pagination and filtering
 *
 * Usage notes:
 * - Pass `columns` array with optional `filter` config for per-column filters.
 * - Use `Cell` to provide custom cell renderers.
 * - For server-side pagination, pass `pagination` prop with serverSide: true
 * - For server-side search/filtering, pass serverSideSearch and serverSideFilters props
 */

// -----------------------------
// Types
// -----------------------------

type FilterType = "text" | "choices" | "number_range" | "date_range" | "custom";

type FilterDef<T> =
  | { type: "text"; placeholder?: string }
  | { type: "choices"; choices: (string | number)[]; placeholder?: string }
  | { type: "number_range"; placeholder?: string }
  | { type: "date_range"; placeholder?: string }
  | { type: "custom"; filterFn: (filterValue: any, row: T) => boolean };

export type ColumnDef<T> = {
  id: string;
  label: React.ReactNode;
  accessor: (row: T) => any;
  Cell?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  visible?: boolean;
  width?: number; // px initial width hint
  filter?: FilterDef<T>;
  sortable?: boolean;
};

type PaginationProps = {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  serverSide?: boolean; // If true, uses server-side pagination
};

type GenericTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey?: (row: T, index: number) => string | number;
  selectionMode?: "none" | "single" | "multiple";
  pageSize?: number;
  virtualized?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  className?: string;
  // allow overriding the global search and filter pipeline
  searchFn?: (query: string, row: T, visibleColumns: ColumnDef<T>[]) => boolean;
  filterFn?: (columnFilterState: Record<string, any>, row: T, col: ColumnDef<T>) => boolean;
  // Pagination props
  pagination?: PaginationProps;
  // Server-side search and filtering
  serverSideSearch?: string;
  onServerSearchChange?: (search: string) => void;
  serverSideFilters?: Record<string, any>;
  onServerFilterChange?: (filters: Record<string, any>) => void;
};

// -----------------------------
// Helpers
// -----------------------------

const downloadBlob = (content: Blob, filename: string) => {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// small util to deep clone widths when reordering
const reorderArray = <T,>(arr: T[], from: number, to: number) => {
  const next = Array.from(arr);
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

// -----------------------------
// Component
// -----------------------------

export default function GenericTable<T extends Record<string, any>>({
  data: incomingData,
  columns: initialColumns,
  rowKey = (row, index) => index, // Default rowKey fallback
  selectionMode = "multiple",
  pageSize = 50,
  virtualized = true,
  onSelectionChange,
  className,
  searchFn,
  filterFn,
  pagination,
  serverSideSearch = "",
  onServerSearchChange,
  serverSideFilters = {},
  onServerFilterChange,
}: GenericTableProps<T>) {
  // Columns & widths state (keep them in sync)
  const [columns, setColumns] = useState<ColumnDef<T>[]>(
    initialColumns.map((c) => ({ ...c, visible: c.visible !== false }))
  );

  const [colWidths, setColWidths] = useState<number[]>(
    initialColumns.map((c) => c.width ?? 180)
  );

  // sync when initialColumns changes (consumer may update)
  useEffect(() => {
    setColumns(initialColumns.map((c) => ({ ...c, visible: c.visible !== false })));
    setColWidths(initialColumns.map((c) => c.width ?? 180));
  }, [initialColumns]);

  // sorting
  const [sortBy, setSortBy] = useState<{ id: string; direction: "asc" | "desc" } | null>(null);

  // filters (per-column) - for client-side filtering
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});

  // global search - for client-side searching
  const [clientSideQuery, setClientSideQuery] = useState("");

  // pagination (used when not virtualized or for client-side pagination)
  const [page, setPage] = useState(pagination?.currentPage || 1);

  // selection - now using stable IDs instead of indices
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // dark mode toggle
  const [dark, setDark] = useState(false);

  // resizing
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  // scroll container ref (both header and body live inside)
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Determine if we're using server-side pagination/filtering
  const isServerSidePagination = pagination?.serverSide || false;
  const isServerSideFiltering = !!onServerFilterChange;
  const isServerSideSearch = !!onServerSearchChange;
  
  // Use page from pagination prop if available and server-side
  const currentPage = isServerSidePagination ? (pagination?.currentPage || 1) : page;
  const effectivePageSize = pagination?.pageSize || pageSize;

  // Handle filter changes - send to server if server-side filtering is enabled
  const handleFilterChange = (filterId: string, value: any) => {
    if (isServerSideFiltering && onServerFilterChange) {
      const newFilters = { ...serverSideFilters, [filterId]: value };
      
      // Remove empty filters
      Object.keys(newFilters).forEach(key => {
        if (newFilters[key] === '' || newFilters[key] === null || newFilters[key] === undefined) {
          delete newFilters[key];
        }
      });
      
      onServerFilterChange(newFilters);
    } else {
      // Client-side filtering
      setColumnFilters(prev => ({ ...prev, [filterId]: value }));
    }
  };

  // Handle search change - send to server if server-side search is enabled
  const handleSearchChange = (query: string) => {
    if (isServerSideSearch && onServerSearchChange) {
      onServerSearchChange(query);
    } else {
      // Client-side search
      setClientSideQuery(query);
    }
  };

  // virtualization
  const parentRef = scrollRef; // reuse same scroll container
  const processed = useMemo(() => {
    // For server-side filtering/searching, use data as-is
    if (isServerSideFiltering || isServerSideSearch) {
      return [...incomingData];
    }

    // For client-side: apply column-level filters and global search then sorting
    let list = [...incomingData];

    // per-column filters:
    if (Object.keys(columnFilters).length > 0) {
      list = list.filter((row) => {
        return columns.every((col) => {
          if (!col.visible) return true;
          const fVal = columnFilters[col.id];
          if (fVal == null || fVal === "" || (Array.isArray(fVal) && fVal.length === 0)) return true;

          // if custom column filter exists (col.filter.type === 'custom')
          if (col.filter && (col.filter as any).type === "custom") {
            const def = col.filter as any;
            return def.filterFn(fVal, row);
          }

          // if consumer provided override filterFn prop
          if (filterFn) {
            const res = filterFn(columnFilters, row, col);
            if (typeof res === "boolean") return res;
          }

          const cell = col.accessor(row);
          const t = (cell == null ? "" : String(cell)).toLowerCase();

          switch (col.filter?.type) {
            case "text":
              return t.includes(String(fVal).toLowerCase());
            case "choices":
              // exact match
              return String(cell) === String(fVal);
            case "number_range": {
              const { min, max } = fVal || {};
              const num = Number(cell);
              if (!isNaN(min) && min !== "") {
                if (num < Number(min)) return false;
              }
              if (!isNaN(max) && max !== "") {
                if (num > Number(max)) return false;
              }
              return true;
            }
            case "date_range": {
              const { start, end } = fVal || {};
              const d = cell ? new Date(cell) : null;
              if (!d) return false;
              if (start) {
                if (d < new Date(start)) return false;
              }
              if (end) {
                if (d > new Date(end)) return false;
              }
              return true;
            }
            default:
              // fallback: try substring match
              return t.includes(String(fVal).toLowerCase());
          }
        });
      });
    }

    // global search: either use consumer-provided or default (search across visible cols)
    const query = isServerSideSearch ? serverSideSearch : clientSideQuery;
    if (query && query.trim() !== "") {
      const q = query.toLowerCase();
      list = list.filter((row) =>
        searchFn
          ? searchFn(query, row, columns.filter((c) => c.visible))
          : columns
              .filter((c) => c.visible)
              .some((c) => {
                try {
                  const v = c.accessor(row);
                  if (v == null) return false;
                  return String(v).toLowerCase().includes(q);
                } catch {
                  return false;
                }
              })
      );
    }

    // sort
    if (sortBy) {
      const col = columns.find((c) => c.id === sortBy.id);
      if (col) {
        list.sort((a, b) => {
          const A = col.accessor(a);
          const B = col.accessor(b);
          if (A == null && B == null) return 0;
          if (A == null) return sortBy.direction === "asc" ? -1 : 1;
          if (B == null) return sortBy.direction === "asc" ? 1 : -1;
          if (typeof A === "number" && typeof B === "number") {
            return sortBy.direction === "asc" ? A - B : B - A;
          }
          const aStr = String(A);
          const bStr = String(B);
          return sortBy.direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
    }

    return list;
  }, [incomingData, columns, columnFilters, clientSideQuery, serverSideSearch, sortBy, searchFn, filterFn, isServerSideFiltering, isServerSideSearch]);

  // Create a mapping of row IDs to their current indices in the processed data
  const rowIdToIndexMap = useMemo(() => {
    const map = new Map<string | number, number>();
    processed.forEach((row, index) => {
      const id = rowKey(row, index);
      map.set(id, index);
    });
    return map;
  }, [processed, rowKey]);

  // Get selected rows based on stable IDs
  const selectedRows = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => {
        const index = rowIdToIndexMap.get(id);
        return index !== undefined ? processed[index] : undefined;
      })
      .filter(Boolean) as T[];
  }, [selectedIds, rowIdToIndexMap, processed]);

  // Calculate totals
  const total = isServerSidePagination ? (pagination?.totalCount || 0) : processed.length;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
  
  // Calculate page items
  let pageItems = processed;
  if (!isServerSidePagination && !virtualized) {
    const pageIndex = Math.min(currentPage - 1, Math.max(0, totalPages - 1));
    pageItems = processed.slice(pageIndex * effectivePageSize, pageIndex * effectivePageSize + effectivePageSize);
  }

  // selection effect - now uses stable IDs
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    if (isServerSidePagination && pagination?.onPageChange) {
      pagination.onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  // virtualization setup (only for client-side virtualization)
  const rowVirtualizer = useVirtualizer({
    count: pageItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
    enabled: virtualized && !isServerSidePagination,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // -----------------------------
  // Column resize handlers (Option A + B)
  // -----------------------------
  useEffect(() => {
    const onMouseMove = (ev: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      setColWidths((prev) => {
        const next = [...prev];
        next[r.colIndex] = Math.max(60, Math.round(r.startWidth + dx));
        return next;
      });
    };
    const onMouseUp = () => {
      resizingRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const beginResize = (colIndex: number, ev: React.MouseEvent) => {
    ev.preventDefault();
    resizingRef.current = {
      colIndex,
      startX: ev.clientX,
      startWidth: colWidths[colIndex] ?? 180,
    };
  };

  // For "drag header edge" resizing (touch anywhere near right edge), we'll also attach mousedown on header wrapper
  const headerEdgeDown = (colIndex: number, ev: React.MouseEvent<HTMLDivElement>) => {
    // if event target is the resize handle we already handle; otherwise if near right edge (within 8px), start resize
    const target = ev.currentTarget;
    const rect = target.getBoundingClientRect();
    const threshold = 8;
    const x = (ev.clientX ?? 0);
    if (Math.abs(rect.right - x) <= threshold) {
      beginResize(colIndex, ev);
    }
  };

  // -----------------------------
  // Column reorder (DnD)
  // -----------------------------
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    setColumns((cols) => reorderArray(cols, from, to));
    setColWidths((w) => reorderArray(w, from, to));
  };

  // -----------------------------
  // Sorting toggle
  // -----------------------------
  const toggleSort = (id: string) => {
    setSortBy((s) => {
      if (!s || s.id !== id) return { id, direction: "asc" };
      if (s.direction === "asc") return { id, direction: "desc" };
      return null;
    });
  };

  // -----------------------------
  // Selection helpers - now using stable IDs
  // -----------------------------
  const toggleRow = (rowId: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selectionMode === "single") {
        next.clear();
      }
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processed.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set<string | number>();
      processed.forEach((row, index) => {
        allIds.add(rowKey(row, index));
      });
      setSelectedIds(allIds);
    }
  };

  // Helper to get row ID from row and index
  const getRowId = (row: T, index: number): string | number => {
    return rowKey(row, index);
  };

  // Check if a row is selected by its ID
  const isRowSelected = (rowId: string | number): boolean => {
    return selectedIds.has(rowId);
  };

  // -----------------------------
  // Exports
  // -----------------------------
  const exportCSV = () => {
    const rows = processed.map((r) => {
      const out: Record<string, any> = {};
      columns.forEach((c) => {
        out[String(c.id)] = c.accessor(r);
      });
      return out;
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `export-${Date.now()}.csv`);
  };

  const exportXLSX = () => {
    const rows = processed.map((r) => {
      const out: Record<string, any> = {};
      columns.forEach((c) => {
        out[String(c.id)] = c.accessor(r);
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    downloadBlob(blob, `export-${Date.now()}.xlsx`);
  };

  // -----------------------------
  // UI helpers: render filters
  // -----------------------------
  const renderFilterForColumn = (col: ColumnDef<T>) => {
    const val = isServerSideFiltering ? serverSideFilters[col.id] : columnFilters[col.id];

    if (!col.filter) return null;

    switch ((col.filter as any).type as FilterType) {
      case "text":
        return (
          <input
            value={val ?? ""}
            onChange={(e) => handleFilterChange(col.id, e.target.value)}
            placeholder={(col.filter as any).placeholder ?? "Search..."}
            className="mt-1 w-full px-2 py-1 text-xs border rounded"
          />
        );

      case "choices":
        return (
          <select
            value={val ?? ""}
            onChange={(e) => handleFilterChange(col.id, e.target.value)}
            className="mt-1 w-full px-2 py-1 text-xs border rounded"
          >
            <option value="">All</option>
            {((col.filter as any).choices || []).map((opt: any) => (
              <option key={String(opt)} value={String(opt)}>
                {String(opt)}
              </option>
            ))}
          </select>
        );

      case "number_range":
        return (
          <div className="mt-1 flex gap-1">
            <input
              type="number"
              value={(val && val.min) ?? ""}
              onChange={(e) =>
                handleFilterChange(col.id, { ...(val || {}), min: e.target.value })
              }
              placeholder="min"
              className="w-1/2 px-2 py-1 text-xs border rounded"
            />
            <input
              type="number"
              value={(val && val.max) ?? ""}
              onChange={(e) =>
                handleFilterChange(col.id, { ...(val || {}), max: e.target.value })
              }
              placeholder="max"
              className="w-1/2 px-2 py-1 text-xs border rounded"
            />
          </div>
        );

      case "date_range":
        return (
          <div className="mt-1 flex gap-1">
            <input
              type="date"
              value={(val && val.start) ?? ""}
              onChange={(e) => handleFilterChange(col.id, { ...(val || {}), start: e.target.value })}
              className="w-1/2 px-2 py-1 text-xs border rounded"
            />
            <input
              type="date"
              value={(val && val.end) ?? ""}
              onChange={(e) => handleFilterChange(col.id, { ...(val || {}), end: e.target.value })}
              className="w-1/2 px-2 py-1 text-xs border rounded"
            />
          </div>
        );

      case "custom":
        return (
          <input
            value={val ?? ""}
            onChange={(e) => handleFilterChange(col.id, e.target.value)}
            placeholder="Filter..."
            className="mt-1 w-full px-2 py-1 text-xs border rounded"
          />
        );

      default:
        return null;
    }
  };

  // -----------------------------
  // Rendering
  // -----------------------------
  const visibleColumns = columns.filter((c) => c.visible !== false);

  // compute total width for horizontal scrolling
  const totalWidth = visibleColumns.reduce((sum, _, i) => sum + (colWidths[i] ?? 180), 0);

  // Determine if we should show pagination
  const showPagination = !virtualized || isServerSidePagination;

  return (
    <div className={clsx("w-full flex flex-col gap-3 text-sm", className, dark ? "dark" : "")}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark((d) => !d)}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800"
            title="Toggle dark"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>

          {/* Global search - works for both client and server side */}
          <input
            className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700"
            placeholder="Global search..."
            value={isServerSideSearch ? serverSideSearch : clientSideQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <button onClick={exportCSV} className="px-3 py-1 rounded bg-blue-600 text-white">Export CSV</button>
          <button onClick={exportXLSX} className="px-3 py-1 rounded bg-green-600 text-white">Export Excel</button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Example bulk action
              alert(`Bulk action on ${selectedRows.length} rows`);
            }}
            className="px-3 py-1 rounded border"
          >
            Bulk action
          </button>

          <button
            onClick={() => {
              setColumns(initialColumns.map((c) => ({ ...c, visible: c.visible !== false })));
              setColWidths(initialColumns.map((c) => c.width ?? 180));
              // Clear filters if server-side
              if (isServerSideFiltering && onServerFilterChange) {
                onServerFilterChange({});
              } else {
                setColumnFilters({});
              }
              // Clear search
              if (isServerSideSearch && onServerSearchChange) {
                onServerSearchChange("");
              } else {
                setClientSideQuery("");
              }
            }}
            className="px-3 py-1 rounded border"
          >
            Reset columns & filters
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Columns:</span>
            <div className="flex gap-1 items-center max-w-[320px] overflow-auto">
              {columns.map((c) => (
                <label key={c.id} className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={c.visible !== false}
                    onChange={() => setColumns((prev) => prev.map((p) => (p.id === c.id ? { ...p, visible: !p.visible } : p)))}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll container: header + body live inside here. Virtualizer uses this as scroll element */}
      <div
        ref={scrollRef}
        className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto"
        style={{ maxHeight: 520 }}
      >
        {/* Table header (sticky) */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-stretch" style={{ minWidth: Math.max(totalWidth, 600) }}>
            {/* Selection column header */}
            {selectionMode !== "none" && (
              <div className="flex items-center justify-center px-3 py-3 w-[48px] shrink-0 border-r border-gray-100 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedIds.size === processed.length && processed.length > 0}
                  onChange={toggleSelectAll}
                />
              </div>
            )}

            {/* DnD header + filters */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="cols" direction="horizontal">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex items-stretch">
                    {visibleColumns.map((col, visIndex) => {
                      // find index in columns to get width mapping
                      const colIndex = columns.findIndex((c) => c.id === col.id);
                      const w = colWidths[colIndex] ?? 180;

                      return (
                        <Draggable key={col.id} draggableId={col.id} index={visIndex}>
                          {(dr) => (
                            <div
                              ref={dr.innerRef}
                              {...dr.draggableProps}
                              {...dr.dragHandleProps}
                              onMouseDown={(e) => headerEdgeDown(colIndex, e)}
                              className="flex flex-col border-r border-gray-100 dark:border-gray-700"
                              style={{ width: w, minWidth: w, maxWidth: w }}
                            >
                              {/* header label row */}
                              <div className="px-3 py-2 flex items-center gap-2 select-none bg-inherit" style={{ height: 48 }}>
                                <div onClick={() => col.sortable !== false && toggleSort(col.id)} className="flex-1 cursor-pointer font-medium text-gray-700 dark:text-gray-200 truncate">
                                  {col.label}
                                  {sortBy?.id === col.id && (
                                    <span className="ml-1 text-xs">{sortBy.direction === "asc" ? "↑" : "↓"}</span>
                                  )}
                                </div>

                                {/* visible resize handle */}
                                <div
                                  role="separator"
                                  onMouseDown={(e) => beginResize(colIndex, e)}
                                  className="w-2 cursor-col-resize h-6 flex items-center justify-center"
                                  title="Drag to resize"
                                >
                                  <div className="w-[2px] h-6 bg-gray-300 dark:bg-gray-600" />
                                </div>
                              </div>

                              {/* filter UI - show for both client and server side */}
                              <div className="px-2 pb-2">
                                {renderFilterForColumn(col)}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Table body */}
        <div style={{ minWidth: Math.max(totalWidth, 600) }}>
          <div style={{ height: virtualized && !isServerSidePagination ? rowVirtualizer.getTotalSize() : undefined, position: "relative" }}>
            {virtualized && !isServerSidePagination
              ? virtualRows.map((virtualRow) => {
                  const index = virtualRow.index;
                  const row = pageItems[index];
                  if (!row) return null;
                  const globalIndex = processed.indexOf(row);
                  const rowId = getRowId(row, globalIndex);

                  return (
                    <div
                      key={String(rowId)}
                      className={clsx(
                        "absolute left-0 right-0 px-0 py-0 flex items-center",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50",
                        "hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      style={{ transform: `translateY(${virtualRow.start}px)`, height: virtualRow.size }}
                    >
                      {/* selection cell */}
                      {selectionMode !== "none" && (
                        <div className="flex items-center justify-center px-3 py-2 w-[48px] shrink-0 border-r border-gray-100 dark:border-gray-700">
                          <input
                            type="checkbox"
                            checked={isRowSelected(rowId)}
                            onChange={() => toggleRow(rowId)}
                          />
                        </div>
                      )}

                      {/* cells */}
                      {visibleColumns.map((col, visIndex) => {
                        const colIndex = columns.findIndex((c) => c.id === col.id);
                        const w = colWidths[colIndex] ?? 180;
                        const raw = col.accessor(row);
                        return (
                          <div
                            key={col.id}
                            className="px-3 py-2 truncate"
                            style={{ width: w, minWidth: w, maxWidth: w }}
                          >
                            {col.Cell ? col.Cell(raw, row, globalIndex) : String(raw ?? "")}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              : // non-virtual or server-side pagination
                pageItems.map((row, idx) => {
                  const globalIndex = isServerSidePagination ? idx : (currentPage - 1) * effectivePageSize + idx;
                  const rowId = getRowId(row, globalIndex);
                  return (
                    <div
                      key={String(rowId)}
                      className={clsx("flex items-center px-0 py-0", idx % 2 === 0 ? "bg-white" : "bg-gray-50", "hover:bg-gray-100")}
                      style={{ minHeight: 48 }}
                    >
                      {selectionMode !== "none" && (
                        <div className="flex items-center justify-center px-3 py-2 w-[48px] shrink-0 border-r border-gray-100 dark:border-gray-700">
                          <input
                            type="checkbox"
                            checked={isRowSelected(rowId)}
                            onChange={() => toggleRow(rowId)}
                          />
                        </div>
                      )}

                      {visibleColumns.map((col) => {
                        const colIndex = columns.findIndex((c) => c.id === col.id);
                        const w = colWidths[colIndex] ?? 180;
                        const raw = col.accessor(row);
                        return (
                          <div
                            key={col.id}
                            className="px-3 py-2 truncate"
                            style={{ width: w, minWidth: w, maxWidth: w }}
                          >
                            {col.Cell ? col.Cell(raw, row, globalIndex) : String(raw ?? "")}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Footer / pagination */}
      {showPagination && (
        <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100">
          <div className="text-xs text-gray-600">
            {isServerSidePagination
              ? `Showing ${((currentPage - 1) * effectivePageSize) + 1} - ${Math.min(currentPage * effectivePageSize, total)} of ${total}`
              : `Showing ${((currentPage - 1) * effectivePageSize) + 1} - ${Math.min(currentPage * effectivePageSize, total)} of ${total}`
            }
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage <= 1 || (isServerSidePagination && !pagination?.hasPreviousPage)} 
              onClick={() => handlePageChange(currentPage - 1)} 
              className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-xs">Page</span>
            <input 
              className="w-12 text-center border rounded" 
              value={currentPage} 
              onChange={(e) => {
                const newPage = Number(e.target.value || 1);
                if (newPage >= 1 && newPage <= totalPages) {
                  handlePageChange(newPage);
                }
              }} 
            />
            <span className="text-xs">of {totalPages}</span>
            <button 
              disabled={currentPage >= totalPages || (isServerSidePagination && !pagination?.hasNextPage)} 
              onClick={() => handlePageChange(currentPage + 1)} 
              className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}