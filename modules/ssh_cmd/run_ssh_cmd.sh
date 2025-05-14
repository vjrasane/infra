#!/bin/bash -e

eval "$(jq -r '@sh "hostname=\(.hostname) user=\(.user) password=\(.password) command=\(.command)"')"

result=$(sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${user}@${hostname}" "${command}")

if [[ -z "${result}" ]] ; then
  echo "Error: Command execution returned empty result."
  exit 1
fi

jq -n --arg result "${result}" '{result: $result}'
