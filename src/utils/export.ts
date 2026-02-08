import { db } from '../db/database'

export async function exportData(): Promise<string> {
  const freezers = await db.freezers.toArray()
  const drawers = await db.drawers.toArray()
  const items = await db.items.toArray()
  const tags = await db.tags.toArray()

  return JSON.stringify({ freezers, drawers, items, tags }, null, 2)
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString)

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags], async () => {
    await db.freezers.clear()
    await db.drawers.clear()
    await db.items.clear()
    await db.tags.clear()

    if (data.freezers) await db.freezers.bulkAdd(data.freezers)
    if (data.drawers) await db.drawers.bulkAdd(data.drawers)
    if (data.items) {
      const items = data.items.map((item: Record<string, unknown>) => ({
        ...item,
        dateAdded: new Date(item.dateAdded as string),
        expiryDate: item.expiryDate ? new Date(item.expiryDate as string) : undefined,
      }))
      await db.items.bulkAdd(items)
    }
    if (data.tags) await db.tags.bulkAdd(data.tags)
  })
}

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
