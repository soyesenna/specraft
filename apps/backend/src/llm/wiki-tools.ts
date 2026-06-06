import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, resolve, sep } from "node:path"

import { z } from "zod"

import type { ToolDefinition } from "./provider.js"

const PathInputSchema = z.object({ path: z.string().min(1) })
const WriteInputSchema = PathInputSchema.extend({ content: z.string() })
const SearchInputSchema = z.object({ pattern: z.string().min(1) })

function resolveInside(root: string, path: string): string {
  const rootPath = resolve(root)
  const target = resolve(rootPath, path)
  if (target !== rootPath && !target.startsWith(`${rootPath}${sep}`)) {
    throw new RangeError("wiki path escapes root")
  }
  return target
}

function listFiles(root: string): readonly string[] {
  const rootPath = resolve(root)
  const files: string[] = []
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      if (name === ".git") {
        continue
      }
      const target = resolve(directory, name)
      const relative = target.slice(rootPath.length + 1)
      if (statSync(target).isDirectory()) {
        walk(target)
      } else {
        files.push(relative)
      }
    }
  }
  walk(rootPath)
  return files
}

export function createWikiTools(wikiRoot: string): readonly ToolDefinition[] {
  return [
    {
      name: "wiki_read",
      description: "Read a wiki markdown file.",
      parameters: PathInputSchema,
      execute: (input) => {
        const parsed = PathInputSchema.parse(input)
        return readFileSync(resolveInside(wikiRoot, parsed.path), "utf8")
      },
    },
    {
      name: "wiki_write",
      description: "Write a wiki markdown file.",
      parameters: WriteInputSchema,
      execute: (input) => {
        const parsed = WriteInputSchema.parse(input)
        const target = resolveInside(wikiRoot, parsed.path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, parsed.content)
        return "ok"
      },
    },
    {
      name: "wiki_list",
      description: "List wiki files.",
      parameters: z.object({}),
      execute: () => JSON.stringify(listFiles(wikiRoot)),
    },
    {
      name: "wiki_search",
      description: "Search wiki files by substring.",
      parameters: SearchInputSchema,
      execute: (input) => {
        const parsed = SearchInputSchema.parse(input)
        const matches = listFiles(wikiRoot).filter((path) =>
          readFileSync(resolveInside(wikiRoot, path), "utf8").includes(parsed.pattern),
        )
        return JSON.stringify(matches)
      },
    },
    {
      name: "wiki_delete",
      description: "Delete a wiki file.",
      parameters: PathInputSchema,
      execute: (input) => {
        const parsed = PathInputSchema.parse(input)
        rmSync(resolveInside(wikiRoot, parsed.path), { force: true })
        return "ok"
      },
    },
  ]
}
