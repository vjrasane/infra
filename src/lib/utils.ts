export type Prettify<T> = { [K in keyof T]: T[K] } & {};

const shellQuote = (v: string) => `'${v.replaceAll("'", "'\\''")}'`;

export const toShellEnvFile = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}=${shellQuote(v)}`)
    .join("\n") + "\n";

export const toEnvFile = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";
