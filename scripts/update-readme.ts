#!/usr/bin/env bun

import { file } from "bun";
import * as path from "path";

interface ServerConfig {
  name: string;
  description: string;
  transport: string[];
  icon: string;
  oauth?: boolean;
  prompt?: string;
  config?: {
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  };
}

interface ServerInfo {
  id: string;
  name: string;
  description: string;
  installLink: string;
}

interface ServerGroup {
  name: string;
  servers: ServerInfo[];
}

type IndexEntry = string | [string, string[]];

function generateInstallLink(
  serverId: string,
  serverConfig: ServerConfig
): string {
  try {
    // Create a config object similar to what the MCP install link expects
    let configForLink = { ...serverConfig.config };

    // Handle special cases
    if (!configForLink) {
      // For servers with only prompts (like Zapier), create a basic config
      if (serverConfig.prompt) {
        return `https://cursor.com/en/install-mcp?name=${encodeURIComponent(
          serverId
        )}`;
      }
      return "";
    }

    // If it has command and args, combine them like the original component does
    if (configForLink.command && configForLink.args) {
      const argsString = configForLink.args.join(" ");
      configForLink.command = `${configForLink.command} ${argsString}`;
      delete configForLink.args;
    }

    // Convert to base64 like the original component
    const jsonString = JSON.stringify(configForLink);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const base64Config = btoa(
      Array.from(utf8Bytes)
        .map((b) => String.fromCharCode(b))
        .join("")
    );

    return `https://cursor.com/en/install-mcp?name=${encodeURIComponent(
      serverId
    )}&config=${encodeURIComponent(base64Config)}`;
  } catch (error) {
    console.warn(`Failed to generate install link for ${serverId}:`, error);
    return "";
  }
}

async function loadServerInfo(
  serverId: string,
  serversDir: string
): Promise<ServerInfo | null> {
  try {
    const serverConfigPath = path.join(serversDir, serverId, "server.json");
    const serverConfigFile = file(serverConfigPath);
    const serverConfig: ServerConfig = JSON.parse(
      await serverConfigFile.text()
    );

    return {
      id: serverId,
      name: serverConfig.name,
      description: serverConfig.description,
      installLink: generateInstallLink(serverId, serverConfig),
    };
  } catch (error) {
    console.warn(`Failed to read config for ${serverId}:`, error);
    return null;
  }
}

async function generateReadme(): Promise<void> {
  const rootDir = path.resolve(import.meta.dir, "..");
  const serversDir = path.join(rootDir, "servers");

  // Read the index.json to get the ordered list of servers and groups
  const indexPath = path.join(serversDir, "index.json");
  const indexFile = file(indexPath);
  const indexEntries: IndexEntry[] = JSON.parse(await indexFile.text());

  // Generate the README content
  let readmeContent = `# MCP Servers

A curated collection of Model Context Protocol (MCP) servers for various services and tools. 

To add a server, see the [Contributing Guidelines](CONTRIBUTING.md).

| Server | Description | Install |
|--------|-------------|---------|
`;

  let standaloneCount = 0;
  let groupCount = 0;

  // Process each entry in order and render inline
  for (const entry of indexEntries) {
    if (typeof entry === "string") {
      // Standalone server
      const serverInfo = await loadServerInfo(entry, serversDir);
      if (serverInfo) {
        const installButton = serverInfo.installLink
          ? `<a href="${serverInfo.installLink}" style="border: 1px solid rgba(128, 128, 128, 0.5); padding: 4px 8px; text-decoration: none; border-radius: 4px; font-size: 12px;">Install</a>`
          : "";

        readmeContent += `| **${serverInfo.name}** | ${serverInfo.description} | ${installButton} |\n`;
        standaloneCount++;
      }
    } else if (Array.isArray(entry) && entry.length === 2) {
      // Group: [groupName, [serverId1, serverId2, ...]]
      const [groupName, serverIds] = entry;
      const groupServers: ServerInfo[] = [];

      for (const serverId of serverIds) {
        const serverInfo = await loadServerInfo(serverId, serversDir);
        if (serverInfo) {
          groupServers.push(serverInfo);
        }
      }

      if (groupServers.length > 0) {
        // Build a simple list of servers for the accordion content
        // Use <br> tags instead of newlines to keep everything on one line for markdown table compatibility
        let serverList = '';
        for (const server of groupServers) {
          const installButton = server.installLink
            ? ` <a href="${server.installLink}" style="border: 1px solid rgba(128, 128, 128, 0.5); padding: 4px 8px; text-decoration: none; border-radius: 4px; font-size: 12px;">Install</a>`
            : "";
          serverList += `<br>- **${server.name}** - ${server.description}${installButton}`;
        }
        
        // Render group as a table row with accordion in Description column
        // Keep everything on one line to avoid breaking markdown table parsing
        const detailsContent = `<details><summary>${groupServers.length} server${groupServers.length > 1 ? 's' : ''}</summary>${serverList}</details>`;
        readmeContent += `| **${groupName}** | ${detailsContent} | - |\n`;
        groupCount++;
      }
    }
  }

  readmeContent += `
## Setup

Each server has its own configuration requirements. Refer to the individual server documentation for specific setup instructions.
`;

  // Write the README
  const readmePath = path.join(rootDir, "README.md");
  await Bun.write(readmePath, readmeContent);

  const totalServers = standaloneCount + groupCount;
  console.log(`README.md updated with ${totalServers} entries (${standaloneCount} standalone servers, ${groupCount} groups)`);
}

if (import.meta.main) {
  generateReadme().catch(console.error);
}
