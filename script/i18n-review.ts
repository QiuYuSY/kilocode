#!/usr/bin/env bun
// Generates a markdown summary comparing English and German translations for
// any i18n keys that were added or modified in the current PR/branch diff.
//
// Usage:
//   bun script/i18n-review.ts [--base <ref>]
//
// Outputs markdown to stdout. Intended to be posted as a PR comment.

import { execSync } from "child_process"
import path from "path"

const base = (() => {
  const idx = process.argv.indexOf("--base")
  return idx !== -1 ? process.argv[idx + 1] : "origin/main"
})()

// All i18n file groups: each entry is { en, de } absolute paths.
const root = path.resolve(import.meta.dir, "..")
const groups = [
  { label: "kilo-i18n", en: "packages/kilo-i18n/src/en.ts", de: "packages/kilo-i18n/src/de.ts" },
  {
    label: "webview",
    en: "packages/kilo-vscode/webview-ui/src/i18n/en.ts",
    de: "packages/kilo-vscode/webview-ui/src/i18n/de.ts",
  },
  {
    label: "agent-manager",
    en: "packages/kilo-vscode/webview-ui/agent-manager/i18n/en.ts",
    de: "packages/kilo-vscode/webview-ui/agent-manager/i18n/de.ts",
  },
  {
    label: "cli-backend",
    en: "packages/kilo-vscode/src/services/cli-backend/i18n/en.ts",
    de: "packages/kilo-vscode/src/services/cli-backend/i18n/de.ts",
  },
  {
    label: "autocomplete",
    en: "packages/kilo-vscode/src/services/autocomplete/i18n/en.ts",
    de: "packages/kilo-vscode/src/services/autocomplete/i18n/de.ts",
  },
]

// Parse a TS dict file into a Map<key, value>.
// Handles both single-line and multi-line string values.
function parse(content: string): Map<string, string> {
  const map = new Map<string, string>()
  // Match: "key": "value" or "key": `value` (possibly multi-line for template literals)
  // We use a state machine approach on lines for simplicity.
  const lines = content.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match key at start of a dict entry
    const keyMatch = line.match(/^\s+"([^"]+)"\s*:\s*(.*)$/)
    if (!keyMatch) continue
    const key = keyMatch[1]
    let rest = keyMatch[2].trim()
    // Try to extract value from rest
    if (rest.startsWith('"')) {
      // Double-quoted string — may span multiple lines if escaped newline, but usually single
      let val = ""
      let j = 1
      while (j < rest.length) {
        if (rest[j] === "\\" && j + 1 < rest.length) {
          const esc = rest[j + 1]
          if (esc === "n") val += "\n"
          else if (esc === "t") val += "\t"
          else val += rest[j + 1]
          j += 2
        } else if (rest[j] === '"') {
          break
        } else {
          val += rest[j]
          j++
        }
      }
      map.set(key, val)
    } else if (rest.startsWith("`")) {
      // Template literal — collect until closing `
      let val = rest.slice(1)
      let closed = false
      while (true) {
        const end = val.indexOf("`")
        if (end !== -1) {
          val = val.slice(0, end)
          closed = true
          break
        }
        i++
        if (i >= lines.length) break
        val += "\n" + lines[i]
      }
      if (!closed) val = val.trim()
      map.set(key, val)
    } else if (rest.startsWith("'")) {
      const end = rest.indexOf("'", 1)
      map.set(key, end !== -1 ? rest.slice(1, end) : rest.slice(1))
    }
  }
  return map
}

function readFile(rel: string): string {
  return Bun.file(path.join(root, rel))
    .text()
    .then(() => "")
  // synchronous read via Bun
}

function readSync(rel: string): string {
  try {
    return require("fs").readFileSync(path.join(root, rel), "utf8")
  } catch {
    return ""
  }
}

// Get the set of keys changed/added in a file compared to base.
function changedKeys(rel: string): Set<string> {
  try {
    const diff = execSync(`git diff ${base}...HEAD -- "${rel}"`, {
      cwd: root,
      encoding: "utf8",
    })
    const keys = new Set<string>()
    for (const line of diff.split("\n")) {
      if (!line.startsWith("+") || line.startsWith("+++")) continue
      const m = line.match(/^\+\s+"([^"]+)"\s*:/)
      if (m) keys.add(m[1])
    }
    return keys
  } catch {
    return new Set()
  }
}

// Check whether a file was touched at all.
function isTouched(rel: string): boolean {
  try {
    const out = execSync(`git diff --name-only ${base}...HEAD -- "${rel}"`, {
      cwd: root,
      encoding: "utf8",
    })
    return out.trim().length > 0
  } catch {
    return false
  }
}

const sections: string[] = []

for (const group of groups) {
  const enTouched = isTouched(group.en)
  const deTouched = isTouched(group.de)
  if (!enTouched && !deTouched) continue

  const enContent = readSync(group.en)
  const deContent = readSync(group.de)
  const enDict = parse(enContent)
  const deDict = parse(deContent)

  // Collect all changed keys across both files.
  const keys = new Set([...changedKeys(group.en), ...changedKeys(group.de)])
  if (keys.size === 0) continue

  const rows: string[] = []
  for (const key of [...keys].sort()) {
    const en = enDict.get(key) ?? "_missing_"
    const de = deDict.get(key) ?? "_missing_"
    // Escape pipe chars for markdown table
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ↵ ")
    rows.push(`| \`${key}\` | ${esc(en)} | ${esc(de)} |`)
  }

  if (rows.length > 0) {
    sections.push(
      `### ${group.label}\n\n| Key | 🇬🇧 English | 🇩🇪 German |\n|-----|------------|----------|\n${rows.join("\n")}`,
    )
  }
}

if (sections.length === 0) {
  console.log("_No translation key changes detected._")
} else {
  console.log(`## Translation Review (EN vs DE)\n\n${sections.join("\n\n")}`)
}
