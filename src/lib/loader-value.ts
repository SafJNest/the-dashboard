export function peekValue<T>(signal: { readonly value: T; readonly pending: boolean }): T | undefined {
  if (!signal.pending) return signal.value;
  try {
    return signal.value;
  } catch (thrown) {
    if (thrown instanceof Promise) return undefined;
    throw thrown;
  }
}
