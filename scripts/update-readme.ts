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

async function generateReadme(): Promise<void> {
  const rootDir = path.resolve(import.meta.dir, "..");
  const serversDir = path.join(rootDir, "servers");

  // Read the index.json to get the ordered list of servers
  const indexPath = path.join(serversDir, "index.json");
  const indexFile = file(indexPath);
  const serverIds: string[] = JSON.parse(await indexFile.text());

  // Read each server's configuration
  const servers: ServerInfo[] = [];

  for (const serverId of serverIds) {
    try {
      const serverConfigPath = path.join(serversDir, serverId, "server.json");
      const serverConfigFile = file(serverConfigPath);
      const serverConfig: ServerConfig = JSON.parse(
        await serverConfigFile.text()
      );

      servers.push({
        id: serverId,
        name: serverConfig.name,
        description: serverConfig.description,
        installLink: generateInstallLink(serverId, serverConfig),
      });
    } catch (error) {
      console.warn(`Failed to read config for ${serverId}:`, error);
    }
  }

  // Generate the README content
  let readmeContent = `# MCP Servers

A curated collection of Model Context Protocol (MCP) servers for various services and tools. 

To add a server, see the [Contributing Guidelines](CONTRIBUTING.md).

| Server | Description | Install |
|--------|-------------|---------|
`;

  // Add each server to the table
  for (const server of servers) {
    const installButton = server.installLink
      ? `<a href="${server.installLink}" style="border: 1px solid rgba(128, 128, 128, 0.5); padding: 4px 8px; text-decoration: none; border-radius: 4px; font-size: 12px;">Install</a>`
      : "";

    readmeContent += `| **${server.name}** | ${server.description} | ${installButton} |\n`;
  }

  readmeContent += `
## Setup

Each server has its own configuration requirements. Refer to the individual server documentation for specific setup instructions.
`;

  // Write the README
  const readmePath = path.join(rootDir, "README.md");
  await Bun.write(readmePath, readmeContent);

  console.log(`README.md updated with ${servers.length} servers`);
}

if (import.meta.main) {
  generateReadme().catch(console.error);
}
