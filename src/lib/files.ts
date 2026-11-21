import { facts } from "module-runner";
import { copy, file as _file, shell } from "module-runner/builtin";
import path from "path";
import { CronOpts } from "./cronjob";
import { kebabCase } from "lodash";
import { StateInput, StatefulMemo } from "./memo";
import { toEnvFile } from "./utils";

type FileOpts = {
  mode?: string;
  become?: boolean;
  owner?: GuidRef;
  group?: GuidRef;
};

interface Createable {
  create(): Promise<boolean>;
}

abstract class AbstractFileSystem extends StatefulMemo implements Createable {
  constructor(
    public readonly _path: string,
    public readonly opts?: FileOpts,
    public readonly parent?: Directory,
  ) {
    super();
  }

  protected commonOpts = async () => ({
    mode: this.opts?.mode,
    owner: await resolveGuid(this.opts?.owner),
    group: await resolveGuid(this.opts?.group),
  });

  get path(): string {
    if (!this.parent) return this._path;
    return path.join(this.parent.path, this._path);
  }

  get dirPath(): string {
    return path.dirname(this.path);
  }

  protected stateKey(): string {
    return this.path;
  }

  protected async stateInput(): Promise<StateInput> {
    const { mode, owner, group } = await this.commonOpts();
    return { plain: { mode }, secret: { owner, group } };
  }

  private runCreate = async (): Promise<boolean> => {
    if (this.parent) await this.parent.create();
    return this.createSelf();
  };

  create = this.memoizeState(this.runCreate);

  protected abstract createSelf(): Promise<boolean>;
}

type GuidRef = string | number | (() => Promise<string>);

export const selfOwner: GuidRef = async (): Promise<string> =>
  facts().then((f) => String(f.ansible_user_uid));

export const selfGroup: GuidRef = async (): Promise<string> =>
  facts().then((f) => String(f.ansible_user_gid));

const resolveGuid = async (guid?: GuidRef): Promise<string | undefined> => {
  if (typeof guid === "function") return guid();
  if (typeof guid === "number") return String(guid);
  return guid;
};

export const commonPerms = {
  become: true,
  owner: selfOwner,
  group: selfGroup,
  mode: "0700",
};

class Content extends AbstractFileSystem {
  constructor(
    _path: string,
    public readonly content: string | Promise<string>,
    opts?: FileOpts,
    parent?: Directory,
  ) {
    super(_path, opts, parent);
  }

  protected async stateInput(): Promise<StateInput> {
    const base = await super.stateInput();
    return {
      plain: base.plain,
      secret: { ...base.secret, content: await this.content },
    };
  }

  private get extraPath(): string {
    if (!this.parent) return path.dirname(this._path);
    return path.relative(this.parent.path, path.dirname(this.path));
  }

  protected createSelf = async () => {
    if (this.extraPath) await this.createDir();
    const { changed } = await copy(
      `Copy file ${this.path}`,
      {
        dest: this.path,
        content: await this.content,
        ...(await this.commonOpts()),
      },
      { become: this.opts?.become },
    );
    return changed;
  };

  private createDir = async () => {
    await _file(
      `Create directory ${this.dirPath}`,
      {
        path: this.dirPath,
        state: "directory",
        ...(await this.commonOpts()),
      },
      { become: this.opts?.become },
    );
  };

  script = (args: string[], opts?: ScriptExecOpts) =>
    new Script(this, args, opts);
}

class Directory extends AbstractFileSystem {
  constructor(_path: string, opts?: FileOpts, parent?: Directory) {
    super(_path, opts, parent);
  }

  protected createSelf = async () => {
    const { changed } = await _file(
      `Create directory ${this.path}`,
      {
        path: this.path,
        state: "directory",
        ...(await this.commonOpts()),
      },
      { become: this.opts?.become },
    );
    return changed;
  };

  dir = (path: string, opts?: FileOpts) => new Directory(path, opts, this);

  file = (path: string, content: string | Promise<string>, opts?: FileOpts) =>
    new Content(path, content, opts, this);
}

type ScriptExecOpts = {
  become?: boolean;
  env?: Record<string, string>;
};

export const file = (
  path: string,
  content: string | Promise<string>,
  opts?: FileOpts,
) => new Content(path, content, opts);

export const dir = (path: string, opts?: FileOpts) => new Directory(path, opts);

export const createThings = async (...things: Createable[]) => {
  return Promise.all(things.map((t) => t.create()));
};

const cronDir = dir("/etc/cron.d");

class Script implements Createable {
  constructor(
    public readonly file: Content,
    public readonly args: string[],
    public readonly opts: ScriptExecOpts = {},
  ) {}

  get path(): string {
    return this.file.path;
  }

  get dirPath(): string {
    return this.file.dirPath;
  }

  get cmd(): string {
    return `${this.path} ${this.args.join(" ")}`;
  }

  create = (): Promise<boolean> => this.file.create();

  exec = async (): Promise<void> => {
    await this.create();
    await shell(
      `Execute ${this.path}`,
      {
        cmd: this.cmd,
      },
      { become: this.opts.become },
    );
  };

  cronjob = (name: string, opts?: CronOpts) => {
    return new CronJob(name, this, opts);
  };
}

class CronJob implements Createable {
  constructor(
    public readonly name: string,
    public readonly script: Script,
    private readonly _opts: CronOpts = {},
  ) {}

  private get opts(): CronOpts {
    return { ...this.script.opts, ...this._opts };
  }

  private get identifier(): string {
    return kebabCase(this.name);
  }

  private get cmd(): string {
    return `${this.script.cmd} 2>&1 | logger -t ${this.identifier}`;
  }

  private get preamble(): string {
    const { env } = this.opts;
    if (!env) return "";
    return toEnvFile(env) + "\n";
  }

  private get schedule(): string {
    const {
      minute = "*",
      hour = "*",
      dayOfWeek = "*",
      dayOfMonth = "*",
      month = "*",
    } = this.opts;

    return [minute, hour, dayOfMonth, month, dayOfWeek].join(" ");
  }

  private cronFileContent = async (): Promise<string> => {
    const { ansible_user_id: user } = await facts();
    return `${this.preamble}${this.schedule} ${user} ${this.cmd}\n`;
  };

  create = async (): Promise<boolean> => {
    await this.script.create();
    const cronFile = cronDir.file(this.identifier, this.cronFileContent(), {
      become: true,
      mode: "0600",
    });

    const changed = await cronFile.create();
    return changed;
  };
}
