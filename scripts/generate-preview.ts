#!/usr/bin/env bun

import { file } from "bun";
import * as path from "path";

interface ServerConfig {
  name: string;
  description: string;
  transport?: string[];
  icon?: string;
  config?: {
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  };
}

type IndexEntry = string | [string, string[]];

function generateInstallLink(serverId: string, config: ServerConfig["config"]): string {
  if (!config) return "";
  try {
    let c = { ...config };
    if (c.command && c.args) {
      c.command = c.command + " " + c.args.join(" ");
      delete c.args;
    }
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(c))));
    return `https://cursor.com/en/install-mcp?name=${encodeURIComponent(serverId)}&config=${encodeURIComponent(base64)}`;
  } catch {
    return "";
  }
}

async function main() {
  const rootDir = path.resolve(import.meta.dir, "..");
  const serversDir = path.join(rootDir, "servers");
  const indexPath = path.join(serversDir, "index.json");
  const index: IndexEntry[] = JSON.parse(await file(indexPath).text());

  const servers: Array<{ id: string; name: string; description: string; installLink: string }> = [];
  const groups: Array<{ name: string; servers: typeof servers }> = [];

  for (const entry of index) {
    if (typeof entry === "string") {
      try {
        const config: ServerConfig = JSON.parse(
          await file(path.join(serversDir, entry, "server.json")).text()
        );
        servers.push({
          id: entry,
          name: config.name,
          description: config.description,
          installLink: generateInstallLink(entry, config.config),
        });
      } catch {}
    } else if (Array.isArray(entry) && entry.length === 2) {
      const [groupName, serverIds] = entry;
      const groupServers: typeof servers = [];
      for (const id of serverIds) {
        try {
          const config: ServerConfig = JSON.parse(
            await file(path.join(serversDir, id, "server.json")).text()
          );
          groupServers.push({
            id,
            name: config.name,
            description: config.description,
            installLink: generateInstallLink(id, config.config),
          });
        } catch {}
      }
      if (groupServers.length > 0) {
        groups.push({ name: groupName, servers: groupServers });
      }
    }
  }

  const tableRows = servers
    .map(
      (s) =>
        `<tr>
          <td><div class="server-cell"><div class="server-icon"><img src="../servers/${s.id}/icon.svg" alt="" onerror="this.parentElement.innerHTML=''"></div><span class="server-name">${s.name}</span></div></td>
          <td>${s.description}</td>
          <td>${s.installLink ? `<a href="${s.installLink}" class="install-btn">Install</a>` : "-"}</td>
        </tr>`
    )
    .join("") +
    groups
      .map(
        (g) =>
          `<tr>
          <td><span class="server-name">${g.name}</span></td>
          <td colspan="2">
            <details>
              <summary>${g.servers.length} server${g.servers.length > 1 ? "s" : ""}</summary>
              <div class="group-details">
                ${g.servers
                  .map(
                    (s) =>
                      `<div class="server-row">• <strong>${s.name}</strong> - ${s.description} ${s.installLink ? `<a href="${s.installLink}" class="install-btn">Install</a>` : ""}</div>`
                  )
                  .join("")}
              </div>
            </details>
          </td>
        </tr>`
      )
      .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Servers Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }
    .preview-container {
      display: flex;
      gap: 0;
      max-width: 1800px;
      margin: 0 auto;
    }
    .preview-pane {
      flex: 1;
      min-width: 0;
      padding: 0 1rem;
    }
    .preview-pane:first-child {
      border-right: 1px solid #d0d7de;
    }
    .preview-pane h2 {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .light-mode h2 { color: #57606a; }
    .dark-mode h2 { color: #8b949e; }
    .light-mode {
      background: #ffffff;
      color: #24292f;
    }
    .dark-mode {
      background: #0d1117;
      color: #c9d1d9;
    }
    .light-mode .subtitle { color: #57606a; }
    .dark-mode .subtitle { color: #8b949e; }
    .light-mode table { border-color: #d0d7de; }
    .dark-mode table { border-color: #21262d; }
    .light-mode th { color: #57606a; }
    .dark-mode th { color: #8b949e; }
    .light-mode tr:hover { background: rgba(0,0,0,0.03); }
    .dark-mode tr:hover { background: rgba(255,255,255,0.03); }
    .light-mode .server-icon { background: #eaeef2; }
    .dark-mode .server-icon { background: #30363d; }
    .light-mode .server-name { color: #0969da; }
    .dark-mode .server-name { color: #58a6ff; }
    .light-mode .install-btn {
      border-color: rgba(0,0,0,0.2);
      color: #0969da;
    }
    .light-mode .install-btn:hover { background: rgba(9, 105, 218, 0.08); }
    .dark-mode .install-btn {
      border-color: rgba(128, 128, 128, 0.5);
      color: #58a6ff;
    }
    .dark-mode .install-btn:hover { background: rgba(88, 166, 255, 0.1); }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { font-size: 0.9rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid; vertical-align: top; }
    th { font-weight: 500; }
    .server-cell { display: flex; align-items: center; gap: 12px; }
    .server-icon {
      width: 24px; height: 24px; flex-shrink: 0; border-radius: 6px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .server-icon img { width: 100%; height: 100%; object-fit: contain; }
    .dark-mode .server-icon img { filter: invert(1) brightness(2); }
    .install-btn {
      display: inline-block; padding: 4px 12px; font-size: 12px;
      border: 1px solid; border-radius: 4px;
      text-decoration: none; white-space: nowrap;
    }
    .group-details .server-row { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>MCP Servers</h1>
  <p class="subtitle">Preview · ${servers.length + groups.reduce((a,g)=>a+g.servers.length,0)} servers · Light mode (left) · Dark mode (right)</p>
  <div class="preview-container">
    <div class="preview-pane light-mode">
      <h2>Light mode</h2>
      <table>
        <thead><tr><th>Server</th><th>Description</th><th>Install</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="preview-pane dark-mode">
      <h2>Dark mode</h2>
      <table>
        <thead><tr><th>Server</th><th>Description</th><th>Install</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  const outPath = path.join(rootDir, "scratchpad", "preview.html");
  await Bun.write(outPath, html);
  console.log(`Generated ${outPath}`);
}

main().catch(console.error);
