# infra

## Requirements

* pre-commit
* opentofu
* bws
* flux
* ksops

## Setup

1. pre-commit install
1. cd main; tf init; tf apply
1. tf output -raw kube_config_yaml > ../.kube/config

## SOPS

```shell
gpg --import sops.pub

sops -i -e kubernetes/secrets/bw-auth-token.yaml
```
