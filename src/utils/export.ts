import { db, type Freezer, type Drawer, type Item, type Tag } from '../db/database'

const LAST_EXPORT_AT_KEY = 'gefrierschrank:last-export-at'
const DAY_MS = 24 * 60 * 60 * 1000
const EXPORT_REMINDER_DAYS = 7

export interface ExportReminderInfo {
  shouldShow: boolean
  lastExportAt: Date | null
  daysSinceLastExport: number | null
  maxAgeDays: number
}

export async function exportData(): Promise<string> {
  const freezers = await db.freezers.toArray()
  const drawers = await db.drawers.toArray()
  const items = await db.items.toArray()
  const tags = await db.tags.toArray()
  const syncConflicts = await db.syncConflicts.toArray()

  return JSON.stringify({ freezers, drawers, items, tags, syncConflicts }, null, 2)
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString)
  const now = new Date()

  const normalizeFreezer = (freezer: Record<string, unknown>): Freezer => ({
    id: String(freezer.id),
    name: String(freezer.name),
    order: Number(freezer.order ?? 0),
    createdAt: new Date(String(freezer.createdAt ?? now.toISOString())),
    householdId: typeof freezer.householdId === 'string' ? freezer.householdId : null,
    updatedAt: new Date(String(freezer.updatedAt ?? freezer.createdAt ?? now.toISOString())),
    updatedBy: typeof freezer.updatedBy === 'string' ? freezer.updatedBy : null,
    version: Number(freezer.version ?? 1),
    syncStatus: freezer.syncStatus === 'pending' || freezer.syncStatus === 'conflict' ? freezer.syncStatus : 'synced',
    lastSyncedVersion: Number(freezer.lastSyncedVersion ?? 0),
    deletedAt: freezer.deletedAt ? new Date(String(freezer.deletedAt)) : null,
  })

  const normalizeDrawer = (drawer: Record<string, unknown>): Drawer => ({
    id: String(drawer.id),
    freezerId: String(drawer.freezerId),
    name: String(drawer.name),
    order: Number(drawer.order ?? 0),
    color: String(drawer.color ?? '#007AFF'),
    createdAt: new Date(String(drawer.createdAt ?? now.toISOString())),
    householdId: typeof drawer.householdId === 'string' ? drawer.householdId : null,
    updatedAt: new Date(String(drawer.updatedAt ?? drawer.createdAt ?? now.toISOString())),
    updatedBy: typeof drawer.updatedBy === 'string' ? drawer.updatedBy : null,
    version: Number(drawer.version ?? 1),
    syncStatus: drawer.syncStatus === 'pending' || drawer.syncStatus === 'conflict' ? drawer.syncStatus : 'synced',
    lastSyncedVersion: Number(drawer.lastSyncedVersion ?? 0),
    deletedAt: drawer.deletedAt ? new Date(String(drawer.deletedAt)) : null,
  })

  const normalizeItem = (item: Record<string, unknown>): Item => ({
    id: String(item.id),
    drawerId: String(item.drawerId),
    name: String(item.name),
    quantity: Number(item.quantity ?? 1),
    unit: String(item.unit ?? 'Stück'),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    notes: typeof item.notes === 'string' ? item.notes : '',
    dateAdded: new Date(String(item.dateAdded ?? now.toISOString())),
    householdId: typeof item.householdId === 'string' ? item.householdId : null,
    updatedAt: new Date(String(item.updatedAt ?? item.dateAdded ?? now.toISOString())),
    updatedBy: typeof item.updatedBy === 'string' ? item.updatedBy : null,
    version: Number(item.version ?? 1),
    syncStatus: item.syncStatus === 'pending' || item.syncStatus === 'conflict' ? item.syncStatus : 'synced',
    lastSyncedVersion: Number(item.lastSyncedVersion ?? 0),
    deletedAt: item.deletedAt ? new Date(String(item.deletedAt)) : null,
  })

  const normalizeTag = (tag: Record<string, unknown>): Tag => ({
    id: String(tag.id),
    name: String(tag.name),
    color: String(tag.color ?? '#007AFF'),
    createdAt: new Date(String(tag.createdAt ?? now.toISOString())),
    householdId: typeof tag.householdId === 'string' ? tag.householdId : null,
    updatedAt: new Date(String(tag.updatedAt ?? tag.createdAt ?? now.toISOString())),
    updatedBy: typeof tag.updatedBy === 'string' ? tag.updatedBy : null,
    version: Number(tag.version ?? 1),
    syncStatus: tag.syncStatus === 'pending' || tag.syncStatus === 'conflict' ? tag.syncStatus : 'synced',
    lastSyncedVersion: Number(tag.lastSyncedVersion ?? 0),
    deletedAt: tag.deletedAt ? new Date(String(tag.deletedAt)) : null,
  })

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts], async () => {
    await db.freezers.clear()
    await db.drawers.clear()
    await db.items.clear()
    await db.tags.clear()
    await db.syncConflicts.clear()

    if (Array.isArray(data.freezers)) {
      await db.freezers.bulkAdd(data.freezers.map((freezer: Record<string, unknown>) => normalizeFreezer(freezer)))
    }
    if (Array.isArray(data.drawers)) {
      await db.drawers.bulkAdd(data.drawers.map((drawer: Record<string, unknown>) => normalizeDrawer(drawer)))
    }
    if (data.items) {
      const items: Item[] = data.items.map((item: Record<string, unknown>) => normalizeItem(item))
      await db.items.bulkAdd(items)
    }
    if (Array.isArray(data.tags)) {
      await db.tags.bulkAdd(data.tags.map((tag: Record<string, unknown>) => normalizeTag(tag)))
    }
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

export function setLastExportAt(date = new Date()) {
  localStorage.setItem(LAST_EXPORT_AT_KEY, date.toISOString())
}

export function getLastExportAt(): Date | null {
  const rawValue = localStorage.getItem(LAST_EXPORT_AT_KEY)
  if (!rawValue) return null
  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function getExportReminderInfo(
  now = new Date(),
  maxAgeDays = EXPORT_REMINDER_DAYS
): ExportReminderInfo {
  const lastExportAt = getLastExportAt()
  if (!lastExportAt) {
    return {
      shouldShow: true,
      lastExportAt: null,
      daysSinceLastExport: null,
      maxAgeDays,
    }
  }

  const ageInMs = now.getTime() - lastExportAt.getTime()
  const daysSinceLastExport = Math.max(0, Math.floor(ageInMs / DAY_MS))

  return {
    shouldShow: ageInMs >= maxAgeDays * DAY_MS,
    lastExportAt,
    daysSinceLastExport,
    maxAgeDays,
  }
}
