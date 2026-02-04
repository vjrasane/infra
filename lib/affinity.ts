import { LabeledNode, NodeLabelQuery } from "cdk8s-plus-28";
import {
  NodeAffinity,
  NodeSelectorRequirement,
} from "cdk8s-plus-28/lib/imports/k8s";

type NodeSelectorOperator = "In" | "NotIn" | "Exists" | "DoesNotExist";

function nodeMatchExpression(
  key: string,
  operator: NodeSelectorOperator,
  values?: string[],
): NodeSelectorRequirement {
  return { key, operator, values };
}

export function hostnameIn(...nodes: string[]): NodeSelectorRequirement {
  return nodeMatchExpression("kubernetes.io/hostname", "In", nodes);
}

export function hostnameNotIn(...nodes: string[]): NodeSelectorRequirement {
  return nodeMatchExpression("kubernetes.io/hostname", "NotIn", nodes);
}

export function labelIn(
  label: string,
  ...values: string[]
): NodeSelectorRequirement {
  return nodeMatchExpression(label, "In", values);
}

export function labelNotIn(
  label: string,
  ...values: string[]
): NodeSelectorRequirement {
  return nodeMatchExpression(label, "NotIn", values);
}

export function labelExists(label: string): NodeSelectorRequirement {
  return nodeMatchExpression(label, "Exists");
}

export function labelDoesNotExist(label: string): NodeSelectorRequirement {
  return nodeMatchExpression(label, "DoesNotExist");
}

export const CLOUD_PROVIDER_LABEL = "karkki.org/cloud-provider";
export const HAPROXY_LABEL = "karkki.org/haproxy";

export function requiredNodeAffinity(
  ...expressions: NodeSelectorRequirement[]
): NodeAffinity {
  return {
    requiredDuringSchedulingIgnoredDuringExecution: {
      nodeSelectorTerms: [{ matchExpressions: expressions }],
    },
  };
}

export function preferredNodeAffinity(
  weight: number,
  ...expressions: NodeSelectorRequirement[]
): NodeAffinity {
  return {
    preferredDuringSchedulingIgnoredDuringExecution: [
      {
        weight,
        preference: { matchExpressions: expressions },
      },
    ],
  };
}

export const cloudNode = new LabeledNode([
  NodeLabelQuery.exists(CLOUD_PROVIDER_LABEL),
]);

export const haproxyNode = new LabeledNode([
  NodeLabelQuery.exists(HAPROXY_LABEL),
]);
