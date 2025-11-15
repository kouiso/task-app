#!/bin/bash

echo "========================================="
echo "Devcontainer MCP Configuration Diagnosis"
echo "========================================="
echo ""

echo "1. Checking if files are mounted:"
echo "-----------------------------------"
echo -n "~/.claude: "
[ -d ~/.claude ] && echo "✓ EXISTS" || echo "✗ MISSING"

echo -n "~/.claude.json: "
[ -f ~/.claude.json ] && echo "✓ EXISTS ($(wc -c < ~/.claude.json) bytes)" || echo "✗ MISSING"

echo -n "~/.mcp-servers: "
[ -d ~/.mcp-servers ] && echo "✓ EXISTS" || echo "✗ MISSING"

echo -n "~/.gitconfig: "
[ -f ~/.gitconfig ] && echo "✓ EXISTS" || echo "✗ MISSING"

echo -n "~/.ssh: "
[ -d ~/.ssh ] && echo "✓ EXISTS" || echo "✗ MISSING"

echo ""
echo "2. Checking file permissions:"
echo "-----------------------------------"
ls -la ~/.claude.json 2>/dev/null || echo "~/.claude.json not accessible"
echo ""

echo "3. Checking MCP configuration:"
echo "-----------------------------------"
if [ -f ~/.claude.json ]; then
    echo "MCP servers in ~/.claude.json:"
    cat ~/.claude.json | jq -r '.mcpServers | keys[]' 2>/dev/null || echo "Failed to parse ~/.claude.json"
else
    echo "~/.claude.json does not exist"
fi

echo ""
echo "4. Current user and permissions:"
echo "-----------------------------------"
echo "User: $(whoami)"
echo "UID: $(id -u)"
echo "GID: $(id -g)"
echo "Groups: $(groups)"

echo ""
echo "5. Claude CLI check:"
echo "-----------------------------------"
which claude || echo "claude command not found"
claude --version 2>/dev/null || echo "Failed to run claude --version"

echo ""
echo "========================================="
echo "Run this script inside devcontainer to diagnose the issue"
echo "========================================="
