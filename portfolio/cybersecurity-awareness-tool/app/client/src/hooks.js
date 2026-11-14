import { useCallback, useEffect, useState } from 'react';

// Loads something from the server and tells the screen what stage it is at:
// loading, error, or data. "deps" is the list of values that should trigger a fresh load.
export function useLoad(load, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false; // if the screen moves on before the answer arrives, ignore the answer
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => !cancelled && setState({ loading: false, error: null, data }))
      .catch((error) => !cancelled && setState({ loading: false, error: error.message, data: null }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);
  return { ...state, reload, setData };
}

// Sets the text shown on the browser tab.
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Latchlight` : 'Latchlight';
  }, [title]);
}
