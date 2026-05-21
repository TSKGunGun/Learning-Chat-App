import { useEffect, useRef, useState } from "react";

interface RouteLoaderResult<T> {
  readonly data: T | null;
  readonly hasError: boolean;
  readonly isLoading: boolean;
}

export function useRouteLoader<T>(
  loader: () => Promise<T>,
  errorMessage: string
): RouteLoaderResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setHasError(false);
      setIsLoading(true);

      try {
        const nextData = await loaderRef.current();

        if (isActive) {
          setData(nextData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(errorMessage, error);

        if (isActive) {
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
    hasError,
    isLoading,
  };
}
