import type { WikiHistoryResponse, WikiVersion } from "@specraft/shared"

import { listWikiFileHistory, type WikiRepository, wikiFileDiff } from "../git/sync.js"

const diffLineCap = 200

export function buildWikiHistory(
  wiki: WikiRepository,
  branch: string,
  path: string,
): WikiHistoryResponse {
  const versions: WikiVersion[] = listWikiFileHistory(wiki, path).map((commit) => {
    const diff = wikiFileDiff(wiki, commit.commitHash, path, diffLineCap)
    return {
      commit_hash: commit.commitHash,
      summary: commit.summary,
      author: commit.author,
      timestamp: commit.timestamp,
      added_lines: commit.addedLines,
      removed_lines: commit.removedLines,
      added: [...diff.added],
      removed: [...diff.removed],
    }
  })
  return { branch, path, versions }
}
