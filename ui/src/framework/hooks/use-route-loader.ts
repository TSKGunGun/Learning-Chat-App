import { useEffect, useRef, useState } from "react";

interface RouteLoaderResult<T> {
  readonly data: T | null;
  readonly error: unknown;
  readonly hasError: boolean;
  readonly isLoading: boolean;
}

interface UseRouteLoaderOptions {
  readonly shouldReportError?: (error: unknown) => boolean;
}

export function useRouteLoader<T>(
  loader: () => Promise<T>,
  errorMessage: string,
  options?: UseRouteLoaderOptions
): RouteLoaderResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef(loader);
  const shouldReportErrorRef = useRef(options?.shouldReportError);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    shouldReportErrorRef.current = options?.shouldReportError;
  }, [options?.shouldReportError]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setHasError(false);
      setIsLoading(true);

      try {
        setError(null);
        const nextData = await loaderRef.current();

        if (isActive) {
          setData(nextData);
          setIsLoading(false);
        }
      } catch (error) {
        if (shouldReportErrorRef.current?.(error) ?? true) {
          console.error(errorMessage, error);
        }

        if (isActive) {
          setError(error);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [errorMessage]);

  return {
    data,
    error,
    hasError,
    isLoading,
  };
}
