import Dexie, { type EntityTable } from 'dexie'

export type SyncStatus = 'synced' | 'pending' | 'conflict'
export type ConflictWinnerSource = 'local' | 'remote'
export type EntityType = 'freezers' | 'drawers' | 'items' | 'tags'

export interface SyncEntityBase {
  householdId: string | null
  updatedAt: Date
  updatedBy: string | null
  version: number
  syncStatus: SyncStatus
  lastSyncedVersion: number
  deletedAt: Date | null
}

export interface Freezer extends SyncEntityBase {
  id: string
  name: string
  order: number
  createdAt: Date
}

export interface Drawer extends SyncEntityBase {
  id: string
  freezerId: string
  name: string
  order: number
  color: string
  createdAt: Date
}

export interface Item extends SyncEntityBase {
  id: string
  drawerId: string
  name: string
  quantity: number
  unit: string
  tags: string[]
  notes: string
  dateAdded: Date
}

export interface Tag extends SyncEntityBase {
  id: string
  name: string
  color: string
  createdAt: Date
}

export interface SyncConflict {
  id: string
  householdId: string
  entityType: EntityType
  entityId: string
  localPayload: Record<string, unknown>
  remotePayload: Record<string, unknown>
  winnerSource: ConflictWinnerSource
  detectedAt: Date
  resolvedAt: Date | null
  resolvedBy: string | null
}

export interface AppMeta {
  key: string
  value: string
}

type LegacyFreezer = {
  id: string
  name: string
  order: number
  createdAt?: Date
}

type LegacyDrawer = {
  id: string
  freezerId: string
  name: string
  order: number
  color: string
  createdAt?: Date
}

type LegacyItem = {
  id: string
  drawerId: string
  name: string
  quantity: number
  unit: string
  tags?: string[]
  notes?: string
  dateAdded?: Date
  expiryDate?: Date
}

type LegacyTag = {
  id: string
  name: string
  color: string
  createdAt?: Date
}

const db = new Dexie('GefrierschrankDB') as Dexie & {
  freezers: EntityTable<Freezer, 'id'>
  drawers: EntityTable<Drawer, 'id'>
  items: EntityTable<Item, 'id'>
  tags: EntityTable<Tag, 'id'>
  syncConflicts: EntityTable<SyncConflict, 'id'>
  appMeta: EntityTable<AppMeta, 'key'>
}

db.version(1).stores({
  freezers: 'id, order',
  drawers: 'id, freezerId, order',
  items: 'id, drawerId, *tags, dateAdded, expiryDate',
  tags: 'id, &name',
})

db.version(2).stores({
  freezers: 'id, order',
  drawers: 'id, freezerId, order',
  items: 'id, drawerId, *tags, dateAdded',
  tags: 'id, &name',
}).upgrade(async (tx) => {
  await tx.table('items').toCollection().modify((item: LegacyItem) => {
    delete item.expiryDate
  })
})

db.version(3).stores({
  freezers: 'id, householdId, order, updatedAt, syncStatus, deletedAt',
  drawers: 'id, householdId, freezerId, order, updatedAt, syncStatus, deletedAt',
  items: 'id, householdId, drawerId, *tags, dateAdded, updatedAt, syncStatus, deletedAt',
  tags: 'id, householdId, name, updatedAt, syncStatus, deletedAt',
  syncConflicts: 'id, householdId, entityType, entityId, resolvedAt, detectedAt',
  appMeta: '&key',
}).upgrade(async (tx) => {
  const now = new Date()

  await tx.table('freezers').toCollection().modify((freezer: LegacyFreezer & Partial<SyncEntityBase>) => {
    const createdAt = freezer.createdAt ?? now
    freezer.createdAt = createdAt
    freezer.householdId = null
    freezer.updatedAt = createdAt
    freezer.updatedBy = null
    freezer.version = 1
    freezer.syncStatus = 'pending'
    freezer.lastSyncedVersion = 0
    freezer.deletedAt = null
  })

  await tx.table('drawers').toCollection().modify((drawer: LegacyDrawer & Partial<SyncEntityBase>) => {
    const createdAt = drawer.createdAt ?? now
    drawer.createdAt = createdAt
    drawer.householdId = null
    drawer.updatedAt = createdAt
    drawer.updatedBy = null
    drawer.version = 1
    drawer.syncStatus = 'pending'
    drawer.lastSyncedVersion = 0
    drawer.deletedAt = null
  })

  await tx.table('items').toCollection().modify((item: LegacyItem & Partial<SyncEntityBase>) => {
    const dateAdded = item.dateAdded ?? now
    item.dateAdded = dateAdded
    item.tags = Array.isArray(item.tags) ? item.tags : []
    item.notes = typeof item.notes === 'string' ? item.notes : ''
    item.householdId = null
    item.updatedAt = dateAdded
    item.updatedBy = null
    item.version = 1
    item.syncStatus = 'pending'
    item.lastSyncedVersion = 0
    item.deletedAt = null
    delete item.expiryDate
  })

  await tx.table('tags').toCollection().modify((tag: LegacyTag & Partial<SyncEntityBase>) => {
    const createdAt = tag.createdAt ?? now
    tag.createdAt = createdAt
    tag.householdId = null
    tag.updatedAt = createdAt
    tag.updatedBy = null
    tag.version = 1
    tag.syncStatus = 'pending'
    tag.lastSyncedVersion = 0
    tag.deletedAt = null
  })
})

export { db }
