"use client";

import { useCallback, useState } from "react";

/**
 * Per-row pending state for tables, so one row's action never spins every row.
 */
export function useRowLoading<Id extends string = string>() {
  const [loadingRows, setLoadingRows] = useState<Set<Id>>(new Set());

  const startRow = useCallback((id: Id) => {
    setLoadingRows((current) => new Set(current).add(id));
  }, []);

  const stopRow = useCallback((id: Id) => {
    setLoadingRows((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const isRowLoading = useCallback((id: Id) => loadingRows.has(id), [loadingRows]);

  const withRowLoading = useCallback(
    async <T>(id: Id, action: () => Promise<T>): Promise<T> => {
      startRow(id);
      try {
        return await action();
      } finally {
        stopRow(id);
      }
    },
    [startRow, stopRow],
  );

  return { loadingRows, startRow, stopRow, isRowLoading, withRowLoading };
}
