#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting  # nosemgrep: bash.lang.security.ifs-tampering.ifs-tampering

echo "Setting up permissive firewall (allowing all external requests)..."

# 1. Extract Docker DNS info BEFORE any flushing
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# 2. Selectively restore ONLY internal Docker DNS resolution
if [ -n "$DOCKER_DNS_RULES" ]; then
    echo "Restoring Docker DNS rules..."
    iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
    iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
    echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
else
    echo "No Docker DNS rules to restore"
fi

# Set default policies to ACCEPT (allow all traffic)
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

echo "Firewall configuration complete (all external requests allowed)"
echo "Verifying network connectivity..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "Network verification passed - able to reach external sites"
else
    echo "WARNING: Unable to reach external sites"
fi

# Verify GitHub API access
if curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "GitHub API access verified"
else
    echo "WARNING: Unable to reach GitHub API"
fi
