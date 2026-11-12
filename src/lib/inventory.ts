import {
  localhost as _localhost,
  host as hostRef,
  HostRef,
  SSHConfig,
} from "module-runner";
import { currentContext } from "./context";

export abstract class Target {
  abstract name: string | undefined;
  abstract hosts: Host[];

  run = async (fn: () => Promise<unknown>) => {
    const { filter } = currentContext();
    const targets = this.filter(filter);
    await Promise.all(targets.map((t) => t.host.run(fn)));
  };

  abstract filter: (fn: (target: Target) => boolean) => Host[];
}

export class Host extends Target {
  host: HostRef;
  constructor(
    readonly name: string,
    readonly cfg?: Partial<SSHConfig>,
  ) {
    super();
    this.host = hostRef(name, cfg);
  }

  get id(): symbol {
    return this.host.id;
  }

  get hosts(): Host[] {
    return [this];
  }

  filter = (fn: (target: Target) => boolean): Host[] => {
    if (fn(this)) return [this];
    return [];
  };
}

export class Group extends Target {
  readonly name: string | undefined;

  constructor(private readonly members: Array<Host>) {
    super();
  }

  get hosts(): Host[] {
    return this.members;
  }

  filter = (fn: (target: Target) => boolean): Host[] => {
    return this.members.filter((m) => fn(m));
  };
}

export class Category extends Target {
  constructor(
    readonly name: string,
    private readonly members: Array<Category | Host>,
  ) {
    super();
  }

  get hosts(): Host[] {
    return this.members.flatMap((m) => m.hosts);
  }

  filter = (fn: (target: Target) => boolean): Host[] => {
    if (fn(this)) return this.hosts;
    return this.members.flatMap((m) => m.filter(fn));
  };
}
