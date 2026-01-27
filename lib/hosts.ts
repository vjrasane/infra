export const baseDomain = "karkki.org";
export const homeDomain = `home.${baseDomain}`;
export const cloudDomain = `cloud.${baseDomain}`;

const domains = [baseDomain, homeDomain, cloudDomain];

export function needsCrowdsecProtection(_hosts: string[]): boolean {
  // TODO: Re-enable once HAProxy frontend is set up with proper DNS resolution
  return false;
}

export function allSubdomains(subdomain: string): string[] {
  return domains.map((domain) => `${subdomain}.${domain}`);
}

export function homeSubdomain(subdomain: string): string {
  return `${subdomain}.${homeDomain}`;
}

export function cloudSubdomain(subdomain: string): string {
  return `${subdomain}.${cloudDomain}`;
}
