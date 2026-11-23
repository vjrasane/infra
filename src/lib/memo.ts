import { currentHost } from "module-runner";

export class Memo<T> {
  private memo: Map<symbol, Promise<T>> = new Map();

  memoize = (fn: () => Promise<T>): (() => Promise<T>) => {
    return (): Promise<T> => {
      const host = currentHost();
      const memoized = this.memo.get(host.id);
      if (memoized) return memoized;
      const promise = fn();
      this.memo.set(host.id, promise);
      return promise;
    };
  };
}
