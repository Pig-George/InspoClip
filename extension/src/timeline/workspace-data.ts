import type { Asset, Page } from "../runtime/contracts"

export async function loadAllSavedAssets(requestPage: (cursor?: string) => Promise<Page<Asset>>): Promise<Asset[]> {
  const assets: Asset[] = []
  let cursor: string | undefined

  do {
    const page = await requestPage(cursor)
    assets.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return assets
}
