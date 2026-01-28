import { Construct } from "constructs";
import {
  Middleware,
  MiddlewareSpecHeaders,
  MiddlewareSpecRateLimit,
  MiddlewareSpecRateLimitPeriod,
  MiddlewareSpecBuffering,
} from "../imports/traefik.io";

const securityNamespace = "traefik";

export const securityHeadersMiddlewareName = "security-headers";
export const rateLimitMiddlewareName = "rate-limit";
export const bufferingMiddlewareName = "request-buffering";

const securityHeadersConfig: MiddlewareSpecHeaders = {
  stsSeconds: 31536000,
  stsIncludeSubdomains: true,
  stsPreload: true,
  contentTypeNosniff: true,
  frameDeny: true,
  browserXssFilter: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy:
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

const rateLimitConfig: MiddlewareSpecRateLimit = {
  average: 100,
  burst: 50,
  period: MiddlewareSpecRateLimitPeriod.fromString("1s"),
};

const bufferingConfig: MiddlewareSpecBuffering = {
  maxRequestBodyBytes: 10 * 1024 * 1024, // 10MB max request body
  maxResponseBodyBytes: 50 * 1024 * 1024, // 50MB max response body
  memRequestBodyBytes: 1 * 1024 * 1024, // 1MB in-memory buffer for requests
  memResponseBodyBytes: 1 * 1024 * 1024, // 1MB in-memory buffer for responses
};

export function createSecurityMiddlewares(scope: Construct): void {
  new Middleware(scope, "security-headers-middleware", {
    metadata: {
      name: securityHeadersMiddlewareName,
      namespace: securityNamespace,
    },
    spec: {
      headers: securityHeadersConfig,
    },
  });

  new Middleware(scope, "rate-limit-middleware", {
    metadata: {
      name: rateLimitMiddlewareName,
      namespace: securityNamespace,
    },
    spec: {
      rateLimit: rateLimitConfig,
    },
  });

  new Middleware(scope, "buffering-middleware", {
    metadata: {
      name: bufferingMiddlewareName,
      namespace: securityNamespace,
    },
    spec: {
      buffering: bufferingConfig,
    },
  });
}

export function getSecurityMiddlewares(): Array<{
  name: string;
  namespace: string;
}> {
  return [
    { name: securityHeadersMiddlewareName, namespace: securityNamespace },
    { name: rateLimitMiddlewareName, namespace: securityNamespace },
    { name: bufferingMiddlewareName, namespace: securityNamespace },
  ];
}
