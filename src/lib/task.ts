import { currentHost } from "module-runner";
import { currentContext, registerHandler, withContext } from "./context";

interface WithChanged {
  changed: boolean;
}

export class Task {
  readonly id: symbol;

  private memo: Map<symbol, Promise<unknown>> = new Map();

  constructor(
    public readonly tags: string[],
    public readonly fn: () => Promise<unknown>,
  ) {
    this.id = Symbol();
  }

  private filter(): boolean {
    const { tags } = currentContext();
    if (!tags.length) return true;
    return tags.every((t) => this.tags.includes(t));
  }

  run = async () => {
    if (!this.filter()) return;
    const target = currentHost();
    if (!target) return;
    if (!this.memo.has(target.id)) {
      this.memo.set(
        target.id,
        withContext({ tags: [] }, () => this.fn()),
      );
    }
    return this.memo.get(target.id);
  };

  register = (changed?: WithChanged) => {
    if (changed == null || changed.changed) registerHandler(this.run);
  };
}

export const task = (tags: string[], fn: () => Promise<unknown>) => {
  const t = new Task(tags, fn);
  const ret = () => t.run();
  ret.register = t.register;
  return ret;
};
