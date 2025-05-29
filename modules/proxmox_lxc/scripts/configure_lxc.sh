#!/usr/bin/env bash
# bootstrap.sh – Ubuntu Server bootstrap replicating two Ansible playbooks
# Usage: sudo ./bootstrap.sh [TIMEZONE]    # default TIMEZONE = Europe/Helsinki

set -euo pipefail

TIMEZONE="${1:-Europe/Helsinki}"
REBOOT_NEEDED=false

# ------------------------------------------------------------
# 1. Time-zone
# ------------------------------------------------------------
echo "⏰ 1 / 5 – Setting system timezone to ${TIMEZONE}"
current_tz="$(timedatectl show --property=Timezone --value)"
if [[ "$current_tz" != "$TIMEZONE" ]]; then
    timedatectl set-timezone "$TIMEZONE"
    REBOOT_NEEDED=true
    echo "   → Timezone changed."
else
    echo "   → Timezone already correct."
fi

# ------------------------------------------------------------
# 2. Package installation
# ------------------------------------------------------------
echo "📦 2 / 5 – Updating APT cache & installing packages"
apt-get update -y >/dev/null
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl jq \
    nfs-common open-iscsi cryptsetup

# ------------------------------------------------------------
# 3. Kernel parameters (persistent + immediate)
# ------------------------------------------------------------
echo "🔧 3 / 5 – Writing persistent sysctl values & applying them"
SYSCTL_FILE="/etc/sysctl.d/99-forwarding.conf"
if [[ ! -f "$SYSCTL_FILE" ]]; then
    REBOOT_NEEDED=true # new file means first-time change
fi
cat >"$SYSCTL_FILE" <<'EOF'
# Added by bootstrap.sh – forwarding + RA settings
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.all.accept_ra = 2
EOF
sysctl --system # apply now

# ------------------------------------------------------------
# 4. conf-kmsg helper script + unit file
# ------------------------------------------------------------
echo "📝 4 / 5 – Deploying conf-kmsg helper script & systemd unit"
KMSG_SCRIPT="/usr/local/bin/conf-kmsg.sh"
KMSG_UNIT="/etc/systemd/system/conf-kmsg.service"

install -m 0755 -o root -g root /dev/stdin "$KMSG_SCRIPT" <<'EOF'
#!/bin/sh -e
if [ ! -e /dev/kmsg ]; then
    ln -s /dev/console /dev/kmsg
fi
mount --make-rshared /
EOF

install -m 0644 -o root -g root /dev/stdin "$KMSG_UNIT" <<'EOF'
[Unit]
Description=Make sure /dev/kmsg exists

[Service]
Type=simple
RemainAfterExit=yes
ExecStart=/usr/local/bin/conf-kmsg.sh
TimeoutStartSec=0

[Install]
WantedBy=default.target
EOF

# Reload systemd so it notices the new unit
systemctl daemon-reload

# Enable & start conf-kmsg if not already active
if ! systemctl is-enabled --quiet conf-kmsg.service || ! systemctl is-active --quiet conf-kmsg.service; then
    systemctl enable --now conf-kmsg.service
    REBOOT_NEEDED=true
    echo "   → conf-kmsg.service enabled and started."
else
    echo "   → conf-kmsg.service already enabled & running."
fi

# ------------------------------------------------------------
# 5. iscsid service
# ------------------------------------------------------------
echo "🚀 5 / 5 – Ensuring iscsid service is enabled & running"
if ! systemctl is-enabled --quiet iscsid.service || ! systemctl is-active --quiet iscsid.service; then
    systemctl enable --now iscsid.service
    REBOOT_NEEDED=true
    echo "   → iscsid.service enabled and started."
else
    echo "   → iscsid.service already enabled & running."
fi

echo "✅ All tasks complete."

# ------------------------------------------------------------
# Reboot handler (non-interactive)
# ------------------------------------------------------------
if $REBOOT_NEEDED; then
    echo "⚡ Changes detected that require a reboot – rebooting now..."
    (sleep 1 && reboot) &
fi
