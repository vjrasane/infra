# infra

## Setup

### 0. Install k3s

```bash
  curl -sfL https://get.k3s.io | sh -s - server \
      --disable traefik \
      --disable servicelb \
      --disable local-storage \
      --node-ip $(ip -4 addr show tailscale0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}') \
      --advertise-address $(ip -4 addr show tailscale0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}') \
      --flannel-iface tailscale0 \
      --tls-san <node tailscale name> \
      --tls-san <node tailscale domain name> \
      --write-kubeconfig-mode 644
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
scp ${K3S_USER}@${K3S_SERVER_IP}:/etc/rancher/k3s/k3s.yaml ~/.kube/config

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

### 1.5. Bootstrap Secrets

**Create Bitwarden auth token sealed secret**:
```bash
# Prerequisites:
# 1. Sealed Secrets controller installed (see Helm charts above)
# 2. Get machine account token from: https://vault.bitwarden.com/#/settings/organizations/<org-id>/machine-accounts
# 3. Store it in password manager item named: "homelab-machine-account-auth-token"
#    (in the notes field)

./k8s/create-bw-auth-token.sh

# This creates k8s/secrets/bw-auth-token-sealed.yaml (encrypted, safe to commit!)
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

**Sealed Secrets** (Encrypted Secrets):
```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system
```

Install the `kubeseal` CLI:
```bash
# Download latest release
KUBESEAL_VERSION=$(curl -s https://api.github.com/repos/bitnami-labs/sealed-secrets/releases/latest | grep '"tag_name"' | cut -d'"' -f4 | sed 's/v//')
curl -OL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz"
tar -xvzf kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz kubeseal
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
rm kubeseal kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz
```

**Headlamp** (Kubernetes Dashboard):
```bash
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update

helm install headlamp headlamp/headlamp \
  --namespace kube-system \
  --set extraArgs="{-in-cluster}"
```

Create a long-lived token for authentication (1 year):
```bash
kubectl create token headlamp --namespace kube-system --duration=8760h
```

Access at: `https://headlamp.k8s.karkki.org` - paste the token when prompted (stored in browser).

**Authentik** (Identity Provider):
```bash
helm repo add authentik https://charts.goauthentik.io
helm repo update

# Generate secrets
SECRET_KEY=$(openssl rand -base64 45)
PG_PASSWORD=$(openssl rand -base64 32)

helm install authentik authentik/authentik \
  --namespace apps \
  --set authentik.secret_key="$SECRET_KEY" \
  --set authentik.postgresql.password="$PG_PASSWORD" \
  --set postgresql.enabled=true \
  --set postgresql.auth.password="$PG_PASSWORD" \
  --set redis.enabled=true \
  --set server.ingress.enabled=false
```

Initial setup: `https://auth.k8s.karkki.org/if/flow/initial-setup/`

**Planka** (Kanban Board):
```bash
helm repo add planka https://plankanban.github.io/planka
helm repo update

# Generate a secret key
SECRET_KEY=$(openssl rand -base64 45)

helm install planka planka/planka \
  --namespace apps \
  --set secretkey="$SECRET_KEY" \
  --set baseUrl="https://planka.k8s.karkki.org" \
  --set postgresql.enabled=true \
  --set persistence.enabled=true \
  --set persistence.size=5Gi
```

To enable SSO with Authentik:
1. In Authentik, create an OAuth2/OpenID Provider with redirect URI: `https://planka.k8s.karkki.org/oidc-callback`
2. Create an Application linked to the provider
3. Update Planka with OIDC settings:
```bash
helm upgrade planka planka/planka \
  --namespace apps \
  --reuse-values \
  --set oidc.enabled=true \
  --set oidc.issuerUrl="https://auth.k8s.karkki.org/application/o/planka/" \
  --set oidc.clientId="<client-id>" \
  --set oidc.clientSecret="<client-secret>" \
  --set 'extraEnv[0].name=OIDC_ENFORCED' \
  --set 'extraEnv[0].value=true'
```

Access at: `https://planka.k8s.karkki.org`

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
    - bwSecretId: "secret-id" # pragma: allowlist secret
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
  - `*.k8s.karkki.org` → `192.168.1.200` (Traefik)
  - `ridge.karkki.org` → `192.168.1.125`
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

#### k3s Internal DNS Forwarding

**Issue**: Pods using cluster DNS (10.43.0.10) resolve `*.k8s.karkki.org` via public DNS, which returns the public IP. NAT hairpinning fails, breaking internal OIDC/service communication.

**Solution**: Configure k3s CoreDNS to forward to custom CoreDNS:
```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  custom-forward.override: |
    forward . 192.168.1.201
EOF
kubectl rollout restart deployment coredns -n kube-system
```

This makes all pods resolve `*.k8s.karkki.org` to internal IPs (192.168.1.200).

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

### Sealed Secrets

**Location**: `k8s/secrets/` (Component)

Sealed Secrets encrypts Kubernetes secrets so they can be safely committed to git. The Sealed Secrets controller decrypts them in-cluster.

**How it works**:
1. The controller generates an RSA key pair in the cluster
2. `kubeseal` encrypts secrets using the cluster's public key
3. Only the controller can decrypt (using the private key)
4. SealedSecrets are safe to commit to version control

**Create a sealed secret manually**:
```bash
# Create a regular secret (dry-run)
kubectl create secret generic my-secret \
    --from-literal=key=value \
    --dry-run=client -o yaml | \
kubeseal \
    --controller-name=sealed-secrets \
    --controller-namespace=kube-system \
    --scope cluster-wide \
    --format yaml > my-secret-sealed.yaml
```

**Scopes**:
- `strict` (default): Sealed to specific name and namespace
- `namespace-wide`: Can be renamed within the namespace
- `cluster-wide`: Can be deployed to any namespace with any name

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
