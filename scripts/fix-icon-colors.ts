#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "fs/promises";
import * as path from "path";

const SERVERS_DIR = path.join(import.meta.dir, "..", "servers");

async function fixSvg(filePath: string): Promise<boolean> {
  let content = await readFile(filePath, "utf-8");

  // Skip non-SVG files (e.g. PNGs misnamed as .svg)
  if (!content.includes("<svg") && !content.trim().startsWith("<")) {
    return false;
  }

  let modified = false;

  // 1. Replace fill="any-color" with fill="currentColor" (preserve none)
  const beforeFill = content;
  content = content.replace(
    /fill="(?!currentColor|none)[^"]*"/g,
    'fill="currentColor"'
  );
  if (content !== beforeFill) modified = true;

  // 2. Replace stroke="any-color" (except none) with stroke="currentColor"
  const beforeStroke = content;
  content = content.replace(
    /stroke="(?!currentColor|none)[^"]*"/g,
    'stroke="currentColor"'
  );
  if (content !== beforeStroke) modified = true;

  // 3. Replace CSS class definitions like .st0{fill:#7856FF;} with fill:currentColor
  const beforeCss = content;
  content = content.replace(
    /\.(st\d+)\s*\{\s*fill:\s*[^;}\s]+[^}]*\}/g,
    (m) => m.replace(/fill:\s*[^;]+;?/, "fill:currentColor;")
  );
  if (content !== beforeCss) modified = true;

  // 4. Replace stroke in CSS classes
  const beforeCssStroke = content;
  content = content.replace(
    /\.(st\d+)\s*\{\s*stroke:\s*(?!none)[^;}\s]+[^}]*\}/g,
    (m) => m.replace(/stroke:\s*[^;]+;?/, "stroke:currentColor;")
  );
  if (content !== beforeCssStroke) modified = true;

  // 5. Replace inline style fill values
  const beforeStyle = content;
  content = content.replace(
    /fill:\s*#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/gi,
    "fill:currentColor"
  );
  content = content.replace(
    /fill:\s*rgb\([^)]+\)/g,
    "fill:currentColor"
  );
  content = content.replace(
    /fill:\s*rgba\([^)]+\)/g,
    "fill:currentColor"
  );
  if (content !== beforeStyle) modified = true;

  // 6. Replace fill="url(#...)" - gradients need to become solid. Replace with currentColor.
  const beforeUrl = content;
  content = content.replace(
    /fill="url\([^)]+\)"/g,
    'fill="currentColor"'
  );
  if (content !== beforeUrl) modified = true;

  // 7. Replace stroke="url(#...)"
  content = content.replace(
    /stroke="url\([^)]+\)"/g,
    'stroke="currentColor"'
  );

  // 8. Replace gradient stop colors
  const beforeStop = content;
  content = content.replace(
    /stop-color:\s*#[0-9a-fA-F]{3,8}/gi,
    "stop-color:currentColor"
  );
  content = content.replace(
    /stop-color="[^"]*"/g,
    'stop-color="currentColor"'
  );
  if (content !== beforeStop) modified = true;

  if (modified) {
    await writeFile(filePath, content);
    return true;
  }
  return false;
}

async function main() {
  const dirs = await readdir(SERVERS_DIR);
  let fixed = 0;

  for (const dir of dirs) {
    if (dir === "index.json") continue;
    const iconPath = path.join(SERVERS_DIR, dir, "icon.svg");
    try {
      const stat = await Bun.file(iconPath).stat();
      if (stat && stat.isFile) {
        if (await fixSvg(iconPath)) {
          console.log(`Fixed: ${dir}`);
          fixed++;
        }
      }
    } catch {
      // Skip missing files
    }
  }

  console.log(`\nFixed ${fixed} icons`);
}

main().catch(console.error);
