import { file, copy, lineinfile } from "module-runner/builtin";
import path from "path";
import {
  docker_compose_v2,
  docker_container,
  docker_prune,
  docker_volume,
} from "../community/docker";
import { toEnvFile } from "./utils";
import { cloudflareSecrets } from "./cloudflare-ddns";
import yaml from "yaml";
import { task } from "./task";

export const SERVICES_DIR = "~/services";
const parentComposeFilePath = `${SERVICES_DIR}/docker-compose.yml`;

const parentComposeFile = task(["docker"], async () => {
  const serviceDir = SERVICES_DIR;
  await file("Create services directory", {
    path: serviceDir,
    state: "directory",
    mode: "0750",
  });

  await lineinfile("Add include to parent compose file", {
    path: parentComposeFilePath,
    line: "include: ",
    create: true,
  });
});

export class Service {
  constructor(
    protected name: string,
    private sourceComposeFilePath: string,
    private opts: {
      services?: string[];
      secrets?: Promise<Record<string, string>>;
      files?: string[];
    } = {},
  ) {}

  get services(): string[] {
    return this.opts.services ?? [this.name];
  }

  get serviceDir() {
    return `${SERVICES_DIR}/${this.name}`;
  }

  private get secretsFile() {
    return `${this.serviceDir}/.env`;
  }

  get composeFilePath() {
    return `${this.serviceDir}/${path.basename(this.sourceComposeFilePath)}`;
  }

  deploy = async () => {
    await parentComposeFile();
    await file(`Create services directory for service ${this.name}`, {
      path: this.serviceDir,
      state: "directory",
      mode: "0700",
    });

    const secrets = await this.opts.secrets;
    if (secrets && Object.keys(secrets).length)
      await copy(`Copy secrets for service ${this.name}`, {
        content: toEnvFile(secrets),
        dest: this.secretsFile,
        mode: "0600",
      });

    if (this.opts.files) {
      for (const filePath of this.opts.files) {
        await copy(
          `Copy file ${path.basename(filePath)} for service ${this.name}`,
          {
            src: filePath,
            dest: `${this.serviceDir}/${path.basename(filePath)}`,
            mode: "0640",
          },
        );
      }
    }

    await copy("Copy compose file " + path.basename(this.composeFilePath), {
      src: this.sourceComposeFilePath,
      dest: this.composeFilePath,
    });

    await lineinfile("Add include to parent compose file", {
      path: parentComposeFilePath,
      line: "- " + path.relative(SERVICES_DIR, this.composeFilePath),
    });
  };
}

export const setupServices = async (...services: Service[]) => {
  const serviceDir = SERVICES_DIR;
  await file("Create services directory", {
    path: serviceDir,
    state: "directory",
    mode: "0750",
  });

  const composeContents = yaml.stringify({
    include: services.map((s) => path.relative(serviceDir, s.composeFilePath)),
  });

  await copy("Copy parent compose file", {
    dest: `${serviceDir}/docker-compose.yml`,
    content: composeContents,
  });

  for (const service of services) {
    await service.deploy();
  }

  await docker_compose_v2("Start services", {
    services: services.flatMap((s) => s.services),
    project_src: serviceDir,
    pull: "always",
  });

  await docker_prune("Prune dangling images", {
    images: true,
    images_filters: {
      dangling: true,
    },
  });
};
