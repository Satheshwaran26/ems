"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/lib/api-client";

interface Settled<T> {
  /** The key the request was made for, e.g. the query string. */
  baseKey: string;
  /** `baseKey` plus the refresh counters; identifies one exact request. */
  key: string;
  data: T | null;
  error: Error | null;
}

interface AsyncData<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  /** Try the request again (used by the "Retry" button). */
  retry: () => void;
}

/**
 * Loads data with `load()` and re-loads when `key` changes, when `retry()` is
 * called, or when any employee data is created / updated / deleted.
 *
 * `key` must describe everything `load` depends on (e.g. the query string).
 * While the stored result belongs to an older request we report `isLoading`.
 */
export function useAsyncData<T>(
  key: string,
  load: () => Promise<T>,
  options: { keepPreviousData?: boolean } = {},
): AsyncData<T> {
  const dataVersion = useDataVersion();
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  const requestKey = `${key}|${dataVersion}|${retryCount}`;

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setSettled({ baseKey: key, key: requestKey, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setSettled({
            baseKey: key,
            key: requestKey,
            data: null,
            error: error instanceof Error ? error : new Error("Something went wrong."),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is recreated each render; `requestKey` already captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const isCurrent = settled?.key === requestKey;
  // After a refresh (same key) we always keep the old data to avoid flicker.
  // For a different key (new page, new search) only lists keep the old data.
  const showStale = settled?.baseKey === key || options.keepPreviousData;
  return {
    data: showStale ? (settled?.data ?? null) : null,
    error: isCurrent ? settled.error : null,
    isLoading: !isCurrent,
    retry,
  };
}
