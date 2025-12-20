# infra

## Requirements

* pre-commit
* opentofu
* bws
* helm
* kubectl
* ksops

## Setup

### 0. Install k3s (Dual-Stack)

Install k3s with dual-stack (IPv4 + IPv6) support:

```bash
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-cidr=10.42.0.0/16,fd00:42::/48 \
  --service-cidr=10.43.0.0/16,fd00:43::/112
```

**Options explained**:
- `--cluster-cidr`: Pod IP ranges (IPv4 and IPv6 ULA)
- `--service-cidr`: Service IP ranges (IPv4 and IPv6 ULA)

**Set up local kubectl access on the server** (optional, for running kubectl directly on the server):
```bash
# Create .kube directory
mkdir -p ~/.kube

# Copy kubeconfig with proper permissions
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(whoami):$(whoami) ~/.kube/config
chmod 600 ~/.kube/config
```

### 0.5. Configure kubectl Access (Remote)

Fetch the k3s kubeconfig from the server and update it with your server's IP:

```bash
# Set your k3s server details
export K3S_SERVER_IP=192.168.1.x  # Replace with your actual server IP
export K3S_USER=ubuntu             # Replace with your SSH user

# Create .kube directory if it doesn't exist
mkdir -p ~/.kube

# Copy using SCP from server's home directory
scp ${K3S_USER}@${K3S_SERVER_IP}:~/.kube/config ~/.kube/config

# Replace localhost with server IP
sed -i "s/127.0.0.1/$K3S_SERVER_IP/g" ~/.kube/config
```

**Verify connection and dual-stack**:
```bash
# Verify kubectl works
kubectl get nodes

# Verify dual-stack is enabled
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDRs}'
# Should show both IPv4 and IPv6 ranges
```

### 1. Infrastructure Setup

```bash
pre-commit install
cd main
tf init
tf apply
tf output -raw kube_config_yaml > ../.kube/config
```

### 1.5. Bootstrap Secrets

**Create Bitwarden auth token secret**:
```bash
# Prerequisites:
# 1. Get machine account token from: https://vault.bitwarden.com/#/settings/organizations/<org-id>/machine-accounts
# 2. Store it in password manager item named: "homelab-machine-account-auth-token"
#    (in the notes field)

./k8s/create-bw-auth-token.sh

# This creates k8s/secrets/bw-auth-token.yaml
# Commit it to git
```

### 2. Install Helm Charts

**Note**: k3s comes with Traefik pre-installed. We'll use the built-in Traefik as the ingress controller.

**cert-manager** (Certificate Management):
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.19.2 \
  --set installCRDs=true
```

**Bitwarden Secrets Manager Operator**:
```bash
helm repo add bitwarden https://charts.bitwarden.com
helm repo update

helm install sm-operator bitwarden/sm-operator \
  --namespace bitwarden \
  --create-namespace
```

**MetalLB** (LoadBalancer):
```bash
helm repo add metallb https://metallb.github.io/metallb
helm repo update

helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace
```

### 3. Apply kubectl Resources

**Deploy resources**:
```bash
# Apply all k8s/ resources at once (recommended)
kubectl apply -k k8s/

# Or apply by namespace:
kubectl apply -k k8s/apps/
kubectl apply -k k8s/bitwarden/
kubectl apply -k k8s/cert-manager/
kubectl apply -k k8s/kube-system/
kubectl apply -k k8s/metallb-system/
kubectl apply -f k8s/cluster-issuer.yaml
```

## Kubernetes Components (k8s/)

### Quick Install

Install all components at once:
```bash
kubectl apply -k k8s/
```

Or install individually as documented below.

---

### Bitwarden Secrets Manager

**Location**: `k8s/apps/cloudflare.yaml` (BitwardenSecret resources)

Syncs secrets from Bitwarden Secrets Manager to Kubernetes Secrets using the `BitwardenSecret` CRD.

**Prerequisites**:
1. Bitwarden Secrets Manager Operator installed (Helm chart)
2. Machine account token

**Create auth token secret**:
```bash
kubectl create secret generic bw-auth-token \
  --from-literal=token='your-machine-account-token' \
  -n apps
```

**Usage example**:
```yaml
apiVersion: k8s.bitwarden.com/v1
kind: BitwardenSecret
metadata:
  name: cloudflare
  namespace: apps
spec:
  organizationId: "your-org-id"
  secretName: cloudflare
  map:
    - bwSecretId: "secret-id"
      secretKeyName: api-token
  authToken:
    secretName: bw-auth-token
    secretKey: token
```

### Cloudflare DDNS

**Location**: `k8s/apps/cloudflare.yaml`
**Namespace**: `apps`

Automated Dynamic DNS updater that runs every 5 minutes to keep Cloudflare DNS records updated with current public IP.

**Prerequisites**:
- Bitwarden secrets configured with:
  - Cloudflare API token (DNS edit permissions)
  - Domain name to update

**Installation**:
```bash
kubectl apply -k k8s/apps/
```

**Verify**:
```bash
kubectl get cronjob -n apps cloudflare-ddns
kubectl logs -n apps -l job-name=cloudflare-ddns-<latest>
```

### cert-manager ClusterIssuer

**Location**: `k8s/cluster-issuer.yaml`

ClusterIssuer for automatic Let's Encrypt certificates via Cloudflare DNS-01 challenge.

**Prerequisites**:
- cert-manager installed (via Flux)
- Cloudflare API key in `cloudflare` secret

**Installation**:
```bash
kubectl apply -f k8s/cluster-issuer.yaml
```

**Usage in Ingress**:
```yaml
annotations:
  cert-manager.io/cluster-issuer: cloudflare-issuer
```

### CoreDNS

**Location**: `k8s/kube-system/coredns.yaml`
**Namespace**: `kube-system`

Custom CoreDNS deployment for external DNS server with MetalLB LoadBalancer.

**Configuration**:
- Service IP: `192.168.1.201` (MetalLB)
- DNS Records:
  - `k8s.karkki.org` → `192.168.1.125`
  - `*.k8s.karkki.org` → `192.168.1.125`
- Recursive DNS forwarding for other domains

**Installation**:
```bash
kubectl apply -k k8s/kube-system/
```

**Verify**:
```bash
nslookup k8s.karkki.org 192.168.1.201
nslookup test.k8s.karkki.org 192.168.1.201
```

#### Ubuntu + k3s DNS Workaround

**Issue**: systemd-resolved's stub listener (127.0.0.53:53) refuses connections due to k3s networking conflicts, preventing containerd image pulls.

**Solution**: Use upstream DNS directly instead of stub resolver.

On each k3s node:
```bash
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

**Why this is safe**:
- Node DNS: Used by host (containerd, kubelet)
- Cluster DNS (10.43.0.10): Used by pods
- Completely separate systems

### MetalLB IP Pools

**Location**: `k8s/metallb-system/metallb-ip-pool.yaml`
**Namespace**: `metallb-system`

IP address pool configuration for MetalLB LoadBalancer.

**Pools**:
- `metallb-ipv4-pool`: 192.168.1.200-192.168.1.220
- `metallb-dual-stack-pool`: 192.168.1.221-192.168.1.230 + IPv6

**Current Assignments**:
- Traefik: 192.168.1.200
- CoreDNS: 192.168.1.201

**Installation**:
```bash
kubectl apply -k k8s/metallb-system/
```

### Traefik Configuration

**Location**: `k8s/kube-system/traefik.yaml`
**Namespace**: `kube-system`

Middlewares and IngressRoutes for Traefik dashboard.

**Includes**:
- Basic auth middleware (credentials from Bitwarden)
- IP whitelist (192.168.1.0/24)
- Dashboard IngressRoute

**Installation**:
```bash
kubectl apply -k k8s/kube-system/
```

**Access**: `http://192.168.1.200/dashboard/`
