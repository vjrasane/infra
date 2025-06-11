#!/bin/bash -e

eval "$(jq -r '@sh "plaintext=\(.plaintext) public_key=\(.public_key)"')"

result=$(sops -e --input-type yaml --output-type yaml --encrypted-regex '^(auth-token)$' --age "${public_key}" --config /dev/null /dev/stdin <<<"${plaintext}")

if [[ -z "${result}" ]]; then
    echo "Error: Command execution returned empty result."
    exit 1
fi

jq -n --arg result "${result}" '{result: $result}'
