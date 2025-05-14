#!/bin/bash -e

vmid="${1}"

files_dir="/tmp/files"

pct stop "${vmid}" || true
until (pct status "${vmid}" | grep -q "stopped"); do
  echo "Waiting for VM ${vmid} to stop..."
  sleep 1
done

cat <<-EOF >> /etc/pve/lxc/${vmid}.conf
lxc.apparmor.profile: unconfined
lxc.cgroup.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: "proc:rw sys:rw"

lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
EOF

pct start "${vmid}" || true
until (pct status "${vmid}" | grep -q "running"); do
  echo "Waiting for VM ${vmid} to start..."
  sleep 1
done

pct exec "${vmid}" -- sed -i 's/.*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
pct exec "${vmid}" -- sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
pct exec "${vmid}" -- systemctl restart sshd

until [[ -n $(lxc-info -n "${vmid}" -iH) ]]; do
  echo "Waiting for VM ${vmid} to receive an IP..."
  sleep 1
done

ip="$(lxc-info -n "${vmid}" -iH)"
until nc -z "$ip" 22; do
  echo "Waiting for VM ${vmid} to be reachable..."
  sleep 1
done
