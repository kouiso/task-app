#!/bin/bash
set -e

echo "Setting up MCP servers..."

# github-remote (HTTP transport)
claude mcp add github-remote --transport http --scope user https://api.githubcopilot.com/mcp/

# notion-remote (HTTP transport) - add your notion remote URL here if available
# claude mcp add notion-remote --transport http --scope user https://your-notion-remote-url/

# serena
claude mcp add serena --scope user -- /home/kouiso/.local/bin/uvx --from git+https://github.com/oraios/serena serena start-mcp-server

# vscode
claude mcp add vscode --scope user -- npx -y github:malvex/mcp-server-vscode

# chrome-devtools
claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest

# playwright
claude mcp add playwright --scope user -- npx -y @playwright/mcp@latest

# puppeteer
claude mcp add puppeteer --scope user -- npx -y @modelcontextprotocol/server-puppeteer

# tavily (with API key)
claude mcp add tavily --scope user --env TAVILY_API_KEY=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 -- npx -y tavily-mcp@latest

# filesystem
claude mcp add filesystem --scope user -- npx -y @modelcontextprotocol/server-filesystem /workspace /home/node

# mobile-mcp (with ANDROID_HOME)
claude mcp add mobile-mcp --scope user --env ANDROID_HOME=/home/kouiso/Android/SDK -- node /home/node/.mcp-servers/mobile-mcp/lib/index.js

# figma (thirdstrandstudio - full Figma API implementation, all methods)
# Requires FIGMA_TOKEN environment variable
# Get your token from: https://www.figma.com/developers/api#access-tokens
claude mcp add figma --scope user --env FIGMA_TOKEN=${FIGMA_TOKEN} -- npx -y @thirdstrandstudio/mcp-figma

# sqlite
claude mcp add sqlite --scope user -- npx -y mcp-server-sqlite-npx /workspace/database.db

# github
claude mcp add github --scope user -- npx -y @modelcontextprotocol/server-github

# notion
claude mcp add notion --scope user -- npx -y @modelcontextprotocol/server-notion

# gdrive
claude mcp add gdrive --scope user -- npx -y @modelcontextprotocol/server-gdrive

# postgres
claude mcp add postgres --scope user -- npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb

echo "MCP servers setup complete!"
