import { facts } from "module-runner";
import { copy, file as _file } from "module-runner/builtin";
import path from "path";

type FileOpts = {
  mode?: string;
  become?: boolean;
  owner?: GuidRef;
  group?: GuidRef;
};

abstract class FileSystem {
  private memo: Promise<void> | undefined;

  constructor(
    public readonly _path: string,
    public readonly opts?: FileOpts,
    public readonly parent?: Directory,
  ) {}

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

  async create(): Promise<void> {
    if (this.memo == undefined) {
      this.memo = this.runCreate();
    }
    return this.memo;
  }

  private runCreate = async (): Promise<void> => {
    if (this.parent) await this.parent.create();
    await this.createSelf();
  };

  protected abstract createSelf(): Promise<void>;
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

class Content extends FileSystem {
  constructor(
    _path: string,
    public readonly content: string | Promise<string>,
    opts?: FileOpts,
    parent?: Directory,
  ) {
    super(_path, opts, parent);
  }

  private get extraPath(): string {
    if (!this.parent) return path.dirname(this._path);
    return path.relative(this.parent.path, path.dirname(this.path));
  }

  protected createSelf = async () => {
    if (this.extraPath) await this.createDir();
    await copy(
      `Copy file ${this.path}`,
      {
        dest: this.path,
        content: await this.content,
        ...(await this.commonOpts()),
      },
      { become: this.opts?.become },
    );
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
}

class Directory extends FileSystem {
  constructor(_path: string, opts?: FileOpts, parent?: Directory) {
    super(_path, opts, parent);
  }

  protected createSelf = async () => {
    await _file(
      `Create directory ${this.path}`,
      {
        path: this.path,
        state: "directory",
        ...(await this.commonOpts()),
      },
      { become: this.opts?.become },
    );
  };

  dir = (path: string, opts?: FileOpts) => new Directory(path, opts, this);

  file = (path: string, content: string | Promise<string>, opts?: FileOpts) =>
    new Content(path, content, opts, this);
}

export const file = (
  path: string,
  content: string | Promise<string>,
  opts?: FileOpts,
) => new Content(path, content, opts);

export const dir = (path: string, opts?: FileOpts) => new Directory(path, opts);

export const createFiles = async (...files: FileSystem[]) => {
  return Promise.all(files.map((f) => f.create()));
};
