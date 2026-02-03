import {
  getSecurityMiddlewares,
  securityHeadersMiddlewareName,
  rateLimitMiddlewareName,
} from "./security";

export const baseDomain = "karkki.org";
export const homeDomain = `home.${baseDomain}`;
export const cloudDomain = `cloud.${baseDomain}`;

const domains = [baseDomain, homeDomain, cloudDomain];

const crowdsecMiddleware = { name: "crowdsec-bouncer", namespace: "traefik" };

function isPublicHost(hosts: string[]): boolean {
  return hosts.some(
    (host) => host.endsWith(baseDomain) && !host.endsWith(homeDomain)
  );
}

export function getPublicSecurityMiddlewares(
  hosts: string[]
): Array<{ name: string; namespace: string }> | undefined {
  if (!isPublicHost(hosts)) {
    return undefined;
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
  return [`${subdomain}.${cloudDomain}`, `${subdomain}.${baseDomain}`];
}
