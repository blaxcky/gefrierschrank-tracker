import { db, type Drawer, type Freezer, type Item, type SyncEntityBase, type SyncStatus, type Tag } from '../db/database'

const LAST_EXPORT_AT_KEY = 'gefrierschrank:last-export-at'
const DAY_MS = 24 * 60 * 60 * 1000
const EXPORT_REMINDER_DAYS = 7
const IMPORT_CONFLICT_POLICY = 'import_wins'

export interface ExportReminderInfo {
  shouldShow: boolean
  lastExportAt: Date | null
  daysSinceLastExport: number | null
  maxAgeDays: number
}

type ImportMode = 'local' | 'household'

interface ImportOptions {
  mode?: ImportMode
  householdId?: string
  userId?: string
  conflictPolicy?: typeof IMPORT_CONFLICT_POLICY
}

interface ImportPayload {
  freezers: Record<string, unknown>[]
  drawers: Record<string, unknown>[]
  items: Record<string, unknown>[]
  tags: Record<string, unknown>[]
}

export async function exportData(): Promise<string> {
  const freezers = await db.freezers.toArray()
  const drawers = await db.drawers.toArray()
  const items = await db.items.toArray()
  const tags = await db.tags.toArray()
  const syncConflicts = await db.syncConflicts.toArray()

  return JSON.stringify({ freezers, drawers, items, tags, syncConflicts }, null, 2)
}

export async function importData(jsonString: string, options: ImportOptions = {}): Promise<void> {
  const payload = parseImportPayload(jsonString)
  const mode = options.mode ?? 'local'
  const now = new Date()

  if (mode === 'household') {
    if (!options.householdId || !options.userId) {
      throw new Error('Import im Konto-Modus braucht einen aktiven Haushalt.')
    }
    if ((options.conflictPolicy ?? IMPORT_CONFLICT_POLICY) !== IMPORT_CONFLICT_POLICY) {
      throw new Error('Nur die Konfliktregel `import_wins` wird unterstuetzt.')
    }

    await importHouseholdData(payload, now, options.householdId, options.userId)
    return
  }

  await importLocalData(payload, now)
}

function parseImportPayload(jsonString: string): ImportPayload {
  let rawData: unknown

  try {
    rawData = JSON.parse(jsonString)
  } catch {
    throw new Error('Importdatei ist kein gueltiges JSON.')
  }

  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    throw new Error('Importdatei hat ein ungueltiges Format.')
  }

  const data = rawData as Record<string, unknown>
  const freezers = toRecordArray(data.freezers)
  const drawers = toRecordArray(data.drawers)
  const items = toRecordArray(data.items)
  const tags = toRecordArray(data.tags)

  if (freezers.length === 0 && drawers.length === 0 && items.length === 0 && tags.length === 0) {
    throw new Error('Importdatei enthaelt keine unterstuetzten Daten.')
  }

  return { freezers, drawers, items, tags }
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
}

function toDate(value: unknown, fallback: Date) {
  const date = value instanceof Date ? value : new Date(String(value ?? fallback.toISOString()))
  return Number.isNaN(date.getTime()) ? fallback : date
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toSyncStatus(value: unknown): SyncStatus {
  return value === 'pending' || value === 'conflict' ? value : 'synced'
}

function normalizeFreezer(freezer: Record<string, unknown>, now: Date): Freezer {
  const createdAt = toDate(freezer.createdAt, now)
  return {
    id: String(freezer.id ?? crypto.randomUUID()),
    name: String(freezer.name ?? 'Gefrierschrank'),
    order: toNumber(freezer.order, 0),
    createdAt,
    householdId: typeof freezer.householdId === 'string' ? freezer.householdId : null,
    updatedAt: toDate(freezer.updatedAt, createdAt),
    updatedBy: typeof freezer.updatedBy === 'string' ? freezer.updatedBy : null,
    version: Math.max(1, toNumber(freezer.version, 1)),
    syncStatus: toSyncStatus(freezer.syncStatus),
    lastSyncedVersion: Math.max(0, toNumber(freezer.lastSyncedVersion, 0)),
    deletedAt: freezer.deletedAt ? toDate(freezer.deletedAt, now) : null,
  }
}

function normalizeDrawer(drawer: Record<string, unknown>, now: Date): Drawer {
  const createdAt = toDate(drawer.createdAt, now)
  return {
    id: String(drawer.id ?? crypto.randomUUID()),
    freezerId: String(drawer.freezerId ?? ''),
    name: String(drawer.name ?? 'Fach'),
    order: toNumber(drawer.order, 0),
    color: String(drawer.color ?? '#007AFF'),
    createdAt,
    householdId: typeof drawer.householdId === 'string' ? drawer.householdId : null,
    updatedAt: toDate(drawer.updatedAt, createdAt),
    updatedBy: typeof drawer.updatedBy === 'string' ? drawer.updatedBy : null,
    version: Math.max(1, toNumber(drawer.version, 1)),
    syncStatus: toSyncStatus(drawer.syncStatus),
    lastSyncedVersion: Math.max(0, toNumber(drawer.lastSyncedVersion, 0)),
    deletedAt: drawer.deletedAt ? toDate(drawer.deletedAt, now) : null,
  }
}

function normalizeItem(item: Record<string, unknown>, now: Date): Item {
  const dateAdded = toDate(item.dateAdded, now)
  return {
    id: String(item.id ?? crypto.randomUUID()),
    drawerId: String(item.drawerId ?? ''),
    name: String(item.name ?? 'Artikel'),
    quantity: toNumber(item.quantity, 1),
    unit: String(item.unit ?? 'Stueck'),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    notes: typeof item.notes === 'string' ? item.notes : '',
    dateAdded,
    householdId: typeof item.householdId === 'string' ? item.householdId : null,
    updatedAt: toDate(item.updatedAt, dateAdded),
    updatedBy: typeof item.updatedBy === 'string' ? item.updatedBy : null,
    version: Math.max(1, toNumber(item.version, 1)),
    syncStatus: toSyncStatus(item.syncStatus),
    lastSyncedVersion: Math.max(0, toNumber(item.lastSyncedVersion, 0)),
    deletedAt: item.deletedAt ? toDate(item.deletedAt, now) : null,
  }
}

function normalizeTag(tag: Record<string, unknown>, now: Date): Tag {
  const createdAt = toDate(tag.createdAt, now)
  return {
    id: String(tag.id ?? crypto.randomUUID()),
    name: String(tag.name ?? 'Tag'),
    color: String(tag.color ?? '#007AFF'),
    createdAt,
    householdId: typeof tag.householdId === 'string' ? tag.householdId : null,
    updatedAt: toDate(tag.updatedAt, createdAt),
    updatedBy: typeof tag.updatedBy === 'string' ? tag.updatedBy : null,
    version: Math.max(1, toNumber(tag.version, 1)),
    syncStatus: toSyncStatus(tag.syncStatus),
    lastSyncedVersion: Math.max(0, toNumber(tag.lastSyncedVersion, 0)),
    deletedAt: tag.deletedAt ? toDate(tag.deletedAt, now) : null,
  }
}

async function importLocalData(payload: ImportPayload, now: Date) {
  const freezers = payload.freezers.map((freezer) => normalizeFreezer(freezer, now))
  const drawers = payload.drawers.map((drawer) => normalizeDrawer(drawer, now))
  const items = payload.items.map((item) => normalizeItem(item, now))
  const tags = payload.tags.map((tag) => normalizeTag(tag, now))

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts], async () => {
    await db.freezers.clear()
    await db.drawers.clear()
    await db.items.clear()
    await db.tags.clear()
    await db.syncConflicts.clear()

    if (freezers.length > 0) {
      await db.freezers.bulkAdd(freezers)
    }
    if (drawers.length > 0) {
      await db.drawers.bulkAdd(drawers)
    }
    if (items.length > 0) {
      await db.items.bulkAdd(items)
    }
    if (tags.length > 0) {
      await db.tags.bulkAdd(tags)
    }
  })
}

function buildPendingImportEntity<T extends SyncEntityBase>(
  entity: T,
  existingEntity: T | undefined,
  householdId: string,
  userId: string,
  now: Date,
): T {
  const lastSyncedVersion = existingEntity?.lastSyncedVersion ?? 0
  const nextVersion = existingEntity
    ? Math.max(existingEntity.version, entity.version, lastSyncedVersion) + 1
    : Math.max(entity.version, 1)

  return {
    ...entity,
    householdId,
    updatedAt: now,
    updatedBy: userId,
    version: nextVersion,
    syncStatus: 'pending',
    lastSyncedVersion,
  }
}

async function importHouseholdData(payload: ImportPayload, now: Date, householdId: string, userId: string) {
  const importedFreezers = payload.freezers.map((freezer) => normalizeFreezer(freezer, now))
  const importedDrawers = payload.drawers.map((drawer) => normalizeDrawer(drawer, now))
  const importedItems = payload.items.map((item) => normalizeItem(item, now))
  const importedTags = payload.tags.map((tag) => normalizeTag(tag, now))

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts], async () => {
    const [existingFreezers, existingDrawers, existingItems, existingTags] = await Promise.all([
      db.freezers.where('householdId').equals(householdId).toArray(),
      db.drawers.where('householdId').equals(householdId).toArray(),
      db.items.where('householdId').equals(householdId).toArray(),
      db.tags.where('householdId').equals(householdId).toArray(),
    ])

    const freezerById = new Map(existingFreezers.map((freezer) => [freezer.id, freezer]))
    const drawerById = new Map(existingDrawers.map((drawer) => [drawer.id, drawer]))
    const itemById = new Map(existingItems.map((item) => [item.id, item]))
    const tagById = new Map(existingTags.map((tag) => [tag.id, tag]))
    const freezersToPut = importedFreezers.map((freezer) => buildPendingImportEntity(freezer, freezerById.get(freezer.id), householdId, userId, now))
    const drawersToPut = importedDrawers.map((drawer) => buildPendingImportEntity(drawer, drawerById.get(drawer.id), householdId, userId, now))
    const itemsToPut = importedItems.map((item) => buildPendingImportEntity(item, itemById.get(item.id), householdId, userId, now))
    const tagsToPut = importedTags.map((tag) => buildPendingImportEntity(tag, tagById.get(tag.id), householdId, userId, now))
    const deletedFreezers = existingFreezers
      .filter((freezer) => freezer.deletedAt === null && !freezersToPut.some((imported) => imported.id === freezer.id))
      .map((freezer) => markEntityDeletedForImport(freezer, householdId, userId, now))
    const deletedDrawers = existingDrawers
      .filter((drawer) => drawer.deletedAt === null && !drawersToPut.some((imported) => imported.id === drawer.id))
      .map((drawer) => markEntityDeletedForImport(drawer, householdId, userId, now))
    const deletedItems = existingItems
      .filter((item) => item.deletedAt === null && !itemsToPut.some((imported) => imported.id === item.id))
      .map((item) => markEntityDeletedForImport(item, householdId, userId, now))
    const deletedTags = existingTags
      .filter((tag) => tag.deletedAt === null && !tagsToPut.some((imported) => imported.id === tag.id))
      .map((tag) => markEntityDeletedForImport(tag, householdId, userId, now))

    await db.syncConflicts.where('householdId').equals(householdId).delete()

    if (deletedFreezers.length > 0) {
      await db.freezers.bulkPut(deletedFreezers)
    }
    if (deletedDrawers.length > 0) {
      await db.drawers.bulkPut(deletedDrawers)
    }
    if (deletedItems.length > 0) {
      await db.items.bulkPut(deletedItems)
    }
    if (deletedTags.length > 0) {
      await db.tags.bulkPut(deletedTags)
    }
    if (freezersToPut.length > 0) {
      await db.freezers.bulkPut(freezersToPut)
    }
    if (drawersToPut.length > 0) {
      await db.drawers.bulkPut(drawersToPut)
    }
    if (itemsToPut.length > 0) {
      await db.items.bulkPut(itemsToPut)
    }
    if (tagsToPut.length > 0) {
      await db.tags.bulkPut(tagsToPut)
    }
  })
}

function markEntityDeletedForImport<T extends SyncEntityBase>(
  entity: T,
  householdId: string,
  userId: string,
  now: Date,
): T {
  const lastSyncedVersion = entity.lastSyncedVersion
  const nextVersion = Math.max(entity.version, lastSyncedVersion) + 1

  return {
    ...entity,
    householdId,
    updatedAt: now,
    updatedBy: userId,
    version: nextVersion,
    syncStatus: 'pending',
    lastSyncedVersion,
    deletedAt: now,
  }
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
