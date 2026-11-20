import { currentContext, registerHandler, withContext } from "./context";
import { Memo } from "./memo";

interface WithChanged {
  changed: boolean;
}

export class Task extends Memo<unknown> {
  readonly id: symbol = Symbol();

  constructor(
    public readonly tags: string[],
    public readonly fn: () => Promise<unknown>,
  ) {
    super();
  }

  private filter(): boolean {
    const { tags } = currentContext();
    if (!tags.length) return true;
    return tags.some((t) => this.tags.includes(t));
  }

  run = this.memoize(async () => {
    if (!this.filter()) return;
    return withContext({ tags: [] }, () => this.fn());
  });

  register = (changed?: WithChanged | boolean) => {
    if (typeof changed === "boolean" && !changed) return;
    if (typeof changed === "object" && !changed.changed) return;
    registerHandler(this.run);
  };
}

export const task = (tags: string[], fn: () => Promise<unknown>) => {
  const t = new Task(tags, fn);
  const ret = () => t.run();
  ret.register = t.register;
  return ret;
};
