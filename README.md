# infra

## Requirements

* pre-commit
* opentofu
* bws
* flux
* ksops

## Setup

1. pre-commit install
1. store age key
    * linux: ~/.config/sops/age/keys.txt
1. bwrun tofu init

## SOPS

```shell
gpg --import sops.pub

sops -i -e kubernetes/secrets/bw-auth-token.yaml
```
