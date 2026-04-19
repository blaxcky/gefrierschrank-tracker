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

function pickFirstDefined(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key]
    }
  }

  return undefined
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
  const createdAt = toDate(pickFirstDefined(freezer, ['createdAt', 'created_at']), now)
  return {
    id: String(pickFirstDefined(freezer, ['id']) ?? crypto.randomUUID()),
    name: String(pickFirstDefined(freezer, ['name']) ?? 'Gefrierschrank'),
    order: toNumber(pickFirstDefined(freezer, ['order', 'sort_order']), 0),
    createdAt,
    householdId: typeof pickFirstDefined(freezer, ['householdId', 'household_id']) === 'string'
      ? String(pickFirstDefined(freezer, ['householdId', 'household_id']))
      : null,
    updatedAt: toDate(pickFirstDefined(freezer, ['updatedAt', 'updated_at']), createdAt),
    updatedBy: typeof pickFirstDefined(freezer, ['updatedBy', 'updated_by']) === 'string'
      ? String(pickFirstDefined(freezer, ['updatedBy', 'updated_by']))
      : null,
    version: Math.max(1, toNumber(pickFirstDefined(freezer, ['version']), 1)),
    syncStatus: toSyncStatus(pickFirstDefined(freezer, ['syncStatus', 'sync_status'])),
    lastSyncedVersion: Math.max(0, toNumber(pickFirstDefined(freezer, ['lastSyncedVersion', 'last_synced_version']), 0)),
    deletedAt: pickFirstDefined(freezer, ['deletedAt', 'deleted_at']) ? toDate(pickFirstDefined(freezer, ['deletedAt', 'deleted_at']), now) : null,
  }
}

function normalizeDrawer(drawer: Record<string, unknown>, now: Date): Drawer {
  const createdAt = toDate(pickFirstDefined(drawer, ['createdAt', 'created_at']), now)
  return {
    id: String(pickFirstDefined(drawer, ['id']) ?? crypto.randomUUID()),
    freezerId: String(pickFirstDefined(drawer, ['freezerId', 'freezer_id']) ?? ''),
    name: String(pickFirstDefined(drawer, ['name']) ?? 'Fach'),
    order: toNumber(pickFirstDefined(drawer, ['order', 'sort_order']), 0),
    color: String(pickFirstDefined(drawer, ['color']) ?? '#007AFF'),
    createdAt,
    householdId: typeof pickFirstDefined(drawer, ['householdId', 'household_id']) === 'string'
      ? String(pickFirstDefined(drawer, ['householdId', 'household_id']))
      : null,
    updatedAt: toDate(pickFirstDefined(drawer, ['updatedAt', 'updated_at']), createdAt),
    updatedBy: typeof pickFirstDefined(drawer, ['updatedBy', 'updated_by']) === 'string'
      ? String(pickFirstDefined(drawer, ['updatedBy', 'updated_by']))
      : null,
    version: Math.max(1, toNumber(pickFirstDefined(drawer, ['version']), 1)),
    syncStatus: toSyncStatus(pickFirstDefined(drawer, ['syncStatus', 'sync_status'])),
    lastSyncedVersion: Math.max(0, toNumber(pickFirstDefined(drawer, ['lastSyncedVersion', 'last_synced_version']), 0)),
    deletedAt: pickFirstDefined(drawer, ['deletedAt', 'deleted_at']) ? toDate(pickFirstDefined(drawer, ['deletedAt', 'deleted_at']), now) : null,
  }
}

function normalizeItem(item: Record<string, unknown>, now: Date): Item {
  const dateAdded = toDate(pickFirstDefined(item, ['dateAdded', 'date_added', 'createdAt', 'created_at']), now)
  return {
    id: String(pickFirstDefined(item, ['id']) ?? crypto.randomUUID()),
    drawerId: String(pickFirstDefined(item, ['drawerId', 'drawer_id']) ?? ''),
    name: String(pickFirstDefined(item, ['name']) ?? 'Artikel'),
    quantity: toNumber(pickFirstDefined(item, ['quantity']), 1),
    unit: String(pickFirstDefined(item, ['unit']) ?? 'Stueck'),
    tags: Array.isArray(pickFirstDefined(item, ['tags'])) ? (pickFirstDefined(item, ['tags']) as unknown[]).map(String) : [],
    notes: typeof pickFirstDefined(item, ['notes']) === 'string' ? String(pickFirstDefined(item, ['notes'])) : '',
    dateAdded,
    householdId: typeof pickFirstDefined(item, ['householdId', 'household_id']) === 'string'
      ? String(pickFirstDefined(item, ['householdId', 'household_id']))
      : null,
    updatedAt: toDate(pickFirstDefined(item, ['updatedAt', 'updated_at']), dateAdded),
    updatedBy: typeof pickFirstDefined(item, ['updatedBy', 'updated_by']) === 'string'
      ? String(pickFirstDefined(item, ['updatedBy', 'updated_by']))
      : null,
    version: Math.max(1, toNumber(pickFirstDefined(item, ['version']), 1)),
    syncStatus: toSyncStatus(pickFirstDefined(item, ['syncStatus', 'sync_status'])),
    lastSyncedVersion: Math.max(0, toNumber(pickFirstDefined(item, ['lastSyncedVersion', 'last_synced_version']), 0)),
    deletedAt: pickFirstDefined(item, ['deletedAt', 'deleted_at']) ? toDate(pickFirstDefined(item, ['deletedAt', 'deleted_at']), now) : null,
  }
}

function normalizeTag(tag: Record<string, unknown>, now: Date): Tag {
  const createdAt = toDate(pickFirstDefined(tag, ['createdAt', 'created_at']), now)
  return {
    id: String(pickFirstDefined(tag, ['id']) ?? crypto.randomUUID()),
    name: String(pickFirstDefined(tag, ['name']) ?? 'Tag'),
    color: String(pickFirstDefined(tag, ['color']) ?? '#007AFF'),
    createdAt,
    householdId: typeof pickFirstDefined(tag, ['householdId', 'household_id']) === 'string'
      ? String(pickFirstDefined(tag, ['householdId', 'household_id']))
      : null,
    updatedAt: toDate(pickFirstDefined(tag, ['updatedAt', 'updated_at']), createdAt),
    updatedBy: typeof pickFirstDefined(tag, ['updatedBy', 'updated_by']) === 'string'
      ? String(pickFirstDefined(tag, ['updatedBy', 'updated_by']))
      : null,
    version: Math.max(1, toNumber(pickFirstDefined(tag, ['version']), 1)),
    syncStatus: toSyncStatus(pickFirstDefined(tag, ['syncStatus', 'sync_status'])),
    lastSyncedVersion: Math.max(0, toNumber(pickFirstDefined(tag, ['lastSyncedVersion', 'last_synced_version']), 0)),
    deletedAt: pickFirstDefined(tag, ['deletedAt', 'deleted_at']) ? toDate(pickFirstDefined(tag, ['deletedAt', 'deleted_at']), now) : null,
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
