import type { WikiGraphEdge, WikiGraphNode, WikiGraphResponse } from "@specraft/shared"

import { listWikiFiles, readWikiFile, type WikiRepository } from "../git/sync.js"

const summaryMaxLength = 100

function titleOf(content: string, path: string): string {
  for (const line of content.split("\n")) {
    const match = /^#\s+(.+?)\s*$/.exec(line)
    if (match?.[1]) {
      return match[1]
    }
  }
  const segments = path.split("/")
  return segments[segments.length - 1] ?? path
}

function dirOf(path: string): string {
  const slashIndex = path.lastIndexOf("/")
  if (slashIndex === -1) {
    return "ROOT"
  }
  return path.slice(0, slashIndex).toUpperCase()
}

function summaryOf(content: string): string {
  const lines = content.split("\n")
  const paragraph: string[] = []
  let started = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith("#")) {
      continue
    }
    if (line === "") {
      if (started) {
        break
      }
      continue
    }
    started = true
    paragraph.push(line)
  }
  const joined = paragraph.join(" ")
  return joined.length > summaryMaxLength ? joined.slice(0, summaryMaxLength) : joined
}

function normalizeLinkTarget(fromPath: string, linkTarget: string): string {
  const stripped = linkTarget.split("#")[0]?.split("?")[0] ?? ""
  if (stripped === "") {
    return ""
  }
  if (!stripped.endsWith(".md")) {
    return ""
  }
  const fromDir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : ""
  const baseSegments = fromDir === "" ? [] : fromDir.split("/")
  const segments = stripped.startsWith("/") ? stripped.slice(1).split("/") : [...baseSegments]
  if (!stripped.startsWith("/")) {
    for (const segment of stripped.split("/")) {
      if (segment === "" || segment === ".") {
        continue
      }
      if (segment === "..") {
        segments.pop()
      } else {
        segments.push(segment)
      }
    }
  }
  return segments.join("/")
}

function linkTargets(content: string): readonly string[] {
  const matches = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)
  return [...matches].map((match) => match[1] ?? "").filter((target) => target !== "")
}

export function buildWikiGraph(wiki: WikiRepository, branch: string): WikiGraphResponse {
  const files = listWikiFiles(wiki).filter((path) => path.endsWith(".md"))
  const known = new Set(files)
  const nodes: WikiGraphNode[] = []
  const edges: WikiGraphEdge[] = []
  for (const path of files) {
    const content = readWikiFile(wiki, path)
    nodes.push({
      path,
      title: titleOf(content, path),
      dir: dirOf(path),
      summary: summaryOf(content),
    })
    for (const rawTarget of linkTargets(content)) {
      const target = normalizeLinkTarget(path, rawTarget)
      if (target !== "" && target !== path && known.has(target)) {
        edges.push({ from: path, to: target })
      }
    }
  }
  return { branch, nodes, edges }
}
