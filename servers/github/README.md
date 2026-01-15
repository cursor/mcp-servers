# GitHub MCP Server

This MCP server provides GitHub tools via the official `ghcr.io/github/github-mcp-server` image.

## Setup

1. Create a GitHub Personal Access Token (PAT) in [GitHub settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).
2. Set `GITHUB_PERSONAL_ACCESS_TOKEN` to that token (this repo’s `server.json` expects it via environment variable).

Token permissions depend on what you want to do (repos, issues, PRs, orgs). Start with read-only permissions and expand only as needed.
