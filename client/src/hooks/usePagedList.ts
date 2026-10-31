import { useCallback, useEffect, useRef, useState } from 'react';
import { Paged } from '../types';

/**
 * Loads a long server-side list one page at a time. `load` must be stable for the
 * current filters (wrap it in useCallback); changing it restarts from page one.
 */
export function usePagedList<T>(load: (pageNumber: number) => Promise<Paged<T>>, onError: (message: string) => void) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageNumber = useRef(1);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const data = await load(1);
      if (request !== latestRequest.current) return; // A newer filter has taken over.
      pageNumber.current = 1;
      setRows(data.results);
      setTotal(data.count);
    } catch (err: any) {
      if (request === latestRequest.current) onError(err.message);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    const request = latestRequest.current;
    setLoadingMore(true);
    try {
      const data = await load(pageNumber.current + 1);
      if (request !== latestRequest.current) return;
      pageNumber.current += 1;
      setRows(current => [...current, ...data.results]);
      setTotal(data.count);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, total, loading, loadingMore, reload, loadMore };
}
