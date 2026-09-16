import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";

interface State<T> {
  key: string | null;
  data: T | undefined;
  error: string | undefined;
}

/**
 * Busca `url` e recarrega sozinho quando a URL muda ou quando algum dado é salvo
 * no app (dataVersion). Enquanto recarrega, mantém os dados anteriores na tela.
 */
export function useFetch<T>(url: string | null) {
  const { dataVersion } = useApp();
  const [tick, setTick] = useState(0);
  const key = url ? `${url}#${dataVersion}#${tick}` : null;
  const [state, setState] = useState<State<T>>({
    key: null,
    data: undefined,
    error: undefined,
  });

  useEffect(() => {
    if (!url || !key) return;
    let cancelled = false;

    api
      .get<T>(url)
      .then((res) => {
        if (!cancelled) setState({ key, data: res.data, error: undefined });
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({ key, data: prev.data, error: getErrorMessage(error) }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return {
    data: state.data,
    loading: state.key !== key,
    error: state.key === key ? state.error : undefined,
    reload,
  };
}
