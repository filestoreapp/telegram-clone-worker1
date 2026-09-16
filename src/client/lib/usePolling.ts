import { useEffect, useRef, useState } from "react";
import type { Result } from "../../shared/rpcTypes";

export function usePolling<T>(fetcher: () => Promise<Result<T>>, intervalMs: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function tick() {
      const res = await fetcherRef.current();
      if (cancelled) return;
      if (res.ok) setData(res.data);
      setLoading(false);
    }

    tick();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, refetch: () => fetcherRef.current().then((r) => r.ok && setData(r.data)) };
}
