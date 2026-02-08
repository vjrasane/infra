import {
  getSecurityMiddlewares,
  securityHeadersMiddlewareName,
  rateLimitMiddlewareName,
} from "./security";
import { capitalize, toLower } from "lodash/fp";

export const baseDomain = "karkki.org";
export const homeDomain = `home.${baseDomain}`;
export const cloudDomain = `cloud.${baseDomain}`;

const domains = [cloudDomain, baseDomain, homeDomain];

const crowdsecMiddleware = { name: "crowdsec-bouncer", namespace: "traefik" };

function isPublicHost(host: string): boolean {
  return host.endsWith(baseDomain) && !host.endsWith(homeDomain);
}

export function getHomeHost(hosts: string[]): string | undefined {
  return hosts.find((h) => h.endsWith(homeDomain));
}

export function getCloudHost(hosts: string[]): string | undefined {
  return hosts.find((h) => h.endsWith(cloudDomain));
}

export function getPublicSecurityMiddlewares(
  hosts: string[],
): Array<{ name: string; namespace: string }> {
  if (!hosts.some(isPublicHost)) {
    return [];
  }
  return [crowdsecMiddleware, ...getSecurityMiddlewares()];
}

export { securityHeadersMiddlewareName, rateLimitMiddlewareName };

export function allSubdomains(subdomain: string): string[] {
  return domains.map((domain) => `${subdomain}.${domain}`);
}

export function homeSubdomain(subdomain: string): string {
  return `${subdomain}.${homeDomain}`;
}

export function cloudSubdomain(subdomain: string): string {
  return `${subdomain}.${cloudDomain}`;
}

export function publicSubdomains(subdomain: string): string[] {
  return [cloudSubdomain(subdomain), `${subdomain}.${baseDomain}`];
}

export const getHomepageAnnotations = (
  name: string,
  opts: {
    host?: string;
    description?: string;
    selector?: string;
    icon?: string;
    group?: string;
  },
) => {
  const title = capitalize(name);
  const description = opts?.description ?? title;
  const selector = opts.selector ?? "app.kubernetes.io/name=" + toLower(name);
  const icon = opts.icon ?? toLower(name) + ".png";
  const group = opts.group ?? "Apps";
  const href = opts.host ? `https://${opts.host}` : "";
  return {
    "gethomepage.dev/enabled": "true",
    "gethomepage.dev/name": title,
    "gethomepage.dev/description": description,
    "gethomepage.dev/group": group,
    "gethomepage.dev/icon": icon,
    "gethomepage.dev/href": href,
    "gethomepage.dev/pod-selector": selector,
  };
};
