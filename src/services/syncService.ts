import type { EntityTable } from 'dexie'
import { db, type AppMeta, type ConflictWinnerSource, type Drawer, type EntityType, type Freezer, type Item, type SyncConflict, type SyncStatus, type Tag } from '../db/database'
import { initializeDatabase } from '../db/seed'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../store/useSessionStore'

const LAST_SYNC_AT_KEY = 'sync:last-sync-at'
const ENTITY_TYPES: EntityType[] = ['freezers', 'drawers', 'items', 'tags']

type EntityMap = {
  freezers: Freezer
  drawers: Drawer
  items: Item
  tags: Tag
}

interface RemoteFreezerRow {
  id: string
  household_id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
  updated_by: string | null
  version: number
  deleted_at: string | null
}

interface RemoteDrawerRow {
  id: string
  household_id: string
  freezer_id: string
  name: string
  sort_order: number
  color: string
  created_at: string
  updated_at: string
  updated_by: string | null
  version: number
  deleted_at: string | null
}

interface RemoteItemRow {
  id: string
  household_id: string
  drawer_id: string
  name: string
  quantity: number
  unit: string
  tags: string[]
  notes: string
  date_added: string
  updated_at: string
  updated_by: string | null
  version: number
  deleted_at: string | null
}

interface RemoteTagRow {
  id: string
  household_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
  updated_by: string | null
  version: number
  deleted_at: string | null
}

interface RemoteConflictRow {
  id: string
  household_id: string
  entity_type: EntityType
  entity_id: string
  local_payload: Record<string, unknown>
  remote_payload: Record<string, unknown>
  winner_source: ConflictWinnerSource
  detected_at: string
  resolved_at: string | null
  resolved_by: string | null
}

type RemoteEntityMap = {
  freezers: RemoteFreezerRow
  drawers: RemoteDrawerRow
  items: RemoteItemRow
  tags: RemoteTagRow
}

type SyncableEntity = Freezer | Drawer | Item | Tag

interface EntityConfig<T extends EntityType> {
  table: EntityTable<EntityMap[T], 'id'>
  remoteTable: T
  fromRemote: (row: RemoteEntityMap[T]) => EntityMap[T]
  toRemote: (entity: EntityMap[T]) => RemoteEntityMap[T]
  deserializePayload: (payload: Record<string, unknown>) => EntityMap[T]
}

interface RemoteSnapshot {
  freezers: RemoteFreezerRow[]
  drawers: RemoteDrawerRow[]
  items: RemoteItemRow[]
  tags: RemoteTagRow[]
  conflicts: RemoteConflictRow[]
}

export interface SyncResult {
  pushed: number
  pulled: number
  conflicts: number
  finishedAt: Date
}

const entityConfig: { [K in EntityType]: EntityConfig<K> } = {
  freezers: {
    table: db.freezers,
    remoteTable: 'freezers',
    fromRemote: (row) => ({
      id: row.id,
      householdId: row.household_id,
      name: row.name,
      order: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
      version: row.version,
      syncStatus: 'synced',
      lastSyncedVersion: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }),
    toRemote: (entity) => ({
      id: entity.id,
      household_id: entity.householdId ?? '',
      name: entity.name,
      sort_order: entity.order,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      updated_by: entity.updatedBy,
      version: entity.version,
      deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    }),
    deserializePayload: (payload) => ({
      id: String(payload.id),
      householdId: typeof payload.householdId === 'string' ? payload.householdId : null,
      name: String(payload.name ?? ''),
      order: Number(payload.order ?? 0),
      createdAt: new Date(String(payload.createdAt)),
      updatedAt: new Date(String(payload.updatedAt)),
      updatedBy: typeof payload.updatedBy === 'string' ? payload.updatedBy : null,
      version: Number(payload.version ?? 1),
      syncStatus: payload.syncStatus === 'pending' || payload.syncStatus === 'conflict' ? payload.syncStatus : 'synced',
      lastSyncedVersion: Number(payload.lastSyncedVersion ?? payload.version ?? 0),
      deletedAt: payload.deletedAt ? new Date(String(payload.deletedAt)) : null,
    }),
  },
  drawers: {
    table: db.drawers,
    remoteTable: 'drawers',
    fromRemote: (row) => ({
      id: row.id,
      householdId: row.household_id,
      freezerId: row.freezer_id,
      name: row.name,
      order: row.sort_order,
      color: row.color,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
      version: row.version,
      syncStatus: 'synced',
      lastSyncedVersion: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }),
    toRemote: (entity) => ({
      id: entity.id,
      household_id: entity.householdId ?? '',
      freezer_id: entity.freezerId,
      name: entity.name,
      sort_order: entity.order,
      color: entity.color,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      updated_by: entity.updatedBy,
      version: entity.version,
      deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    }),
    deserializePayload: (payload) => ({
      id: String(payload.id),
      householdId: typeof payload.householdId === 'string' ? payload.householdId : null,
      freezerId: String(payload.freezerId),
      name: String(payload.name ?? ''),
      order: Number(payload.order ?? 0),
      color: String(payload.color ?? '#007AFF'),
      createdAt: new Date(String(payload.createdAt)),
      updatedAt: new Date(String(payload.updatedAt)),
      updatedBy: typeof payload.updatedBy === 'string' ? payload.updatedBy : null,
      version: Number(payload.version ?? 1),
      syncStatus: payload.syncStatus === 'pending' || payload.syncStatus === 'conflict' ? payload.syncStatus : 'synced',
      lastSyncedVersion: Number(payload.lastSyncedVersion ?? payload.version ?? 0),
      deletedAt: payload.deletedAt ? new Date(String(payload.deletedAt)) : null,
    }),
  },
  items: {
    table: db.items,
    remoteTable: 'items',
    fromRemote: (row) => ({
      id: row.id,
      householdId: row.household_id,
      drawerId: row.drawer_id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      tags: row.tags,
      notes: row.notes,
      dateAdded: new Date(row.date_added),
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
      version: row.version,
      syncStatus: 'synced',
      lastSyncedVersion: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }),
    toRemote: (entity) => ({
      id: entity.id,
      household_id: entity.householdId ?? '',
      drawer_id: entity.drawerId,
      name: entity.name,
      quantity: entity.quantity,
      unit: entity.unit,
      tags: entity.tags,
      notes: entity.notes,
      date_added: entity.dateAdded.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      updated_by: entity.updatedBy,
      version: entity.version,
      deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    }),
    deserializePayload: (payload) => ({
      id: String(payload.id),
      householdId: typeof payload.householdId === 'string' ? payload.householdId : null,
      drawerId: String(payload.drawerId),
      name: String(payload.name ?? ''),
      quantity: Number(payload.quantity ?? 1),
      unit: String(payload.unit ?? 'Stück'),
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
      notes: String(payload.notes ?? ''),
      dateAdded: new Date(String(payload.dateAdded)),
      updatedAt: new Date(String(payload.updatedAt)),
      updatedBy: typeof payload.updatedBy === 'string' ? payload.updatedBy : null,
      version: Number(payload.version ?? 1),
      syncStatus: payload.syncStatus === 'pending' || payload.syncStatus === 'conflict' ? payload.syncStatus : 'synced',
      lastSyncedVersion: Number(payload.lastSyncedVersion ?? payload.version ?? 0),
      deletedAt: payload.deletedAt ? new Date(String(payload.deletedAt)) : null,
    }),
  },
  tags: {
    table: db.tags,
    remoteTable: 'tags',
    fromRemote: (row) => ({
      id: row.id,
      householdId: row.household_id,
      name: row.name,
      color: row.color,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
      version: row.version,
      syncStatus: 'synced',
      lastSyncedVersion: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    }),
    toRemote: (entity) => ({
      id: entity.id,
      household_id: entity.householdId ?? '',
      name: entity.name,
      color: entity.color,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      updated_by: entity.updatedBy,
      version: entity.version,
      deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    }),
    deserializePayload: (payload) => ({
      id: String(payload.id),
      householdId: typeof payload.householdId === 'string' ? payload.householdId : null,
      name: String(payload.name ?? ''),
      color: String(payload.color ?? '#007AFF'),
      createdAt: new Date(String(payload.createdAt)),
      updatedAt: new Date(String(payload.updatedAt)),
      updatedBy: typeof payload.updatedBy === 'string' ? payload.updatedBy : null,
      version: Number(payload.version ?? 1),
      syncStatus: payload.syncStatus === 'pending' || payload.syncStatus === 'conflict' ? payload.syncStatus : 'synced',
      lastSyncedVersion: Number(payload.lastSyncedVersion ?? payload.version ?? 0),
      deletedAt: payload.deletedAt ? new Date(String(payload.deletedAt)) : null,
    }),
  },
}

let activeSync: Promise<SyncResult> | null = null

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert.')
  }

  return supabase
}

function isLocalOnlyMode() {
  const { status, isConfigured } = useSessionStore.getState()
  return status === 'local_only' || !isConfigured || !supabase
}

function getCurrentSyncContext() {
  const { user, household } = useSessionStore.getState()

  if (!user || !household) {
    throw new Error('Keine aktive Sitzung vorhanden.')
  }

  return {
    userId: user.id,
    householdId: household.id,
  }
}

function getWriteContext() {
  if (isLocalOnlyMode()) {
    return {
      userId: null,
      householdId: null,
      syncStatus: 'synced' as SyncStatus,
    }
  }

  const { userId, householdId } = getCurrentSyncContext()
  return {
    userId,
    householdId,
    syncStatus: 'pending' as SyncStatus,
  }
}

function serializeEntity(entity: SyncableEntity): Record<string, unknown> {
  return JSON.parse(JSON.stringify(entity)) as Record<string, unknown>
}

function isVisibleEntity(entity: SyncableEntity, householdId: string | null) {
  if (householdId === null) {
    return entity.deletedAt === null
  }

  return entity.householdId === householdId && entity.deletedAt === null
}

async function getMetaValue(key: string): Promise<string | null> {
  const meta = await db.appMeta.get(key)
  return meta?.value ?? null
}

async function setMetaValue(key: string, value: string) {
  const meta: AppMeta = { key, value }
  await db.appMeta.put(meta)
}

async function getLastSyncAtInternal(): Promise<Date | null> {
  const rawValue = await getMetaValue(LAST_SYNC_AT_KEY)
  if (!rawValue) return null
  const parsed = new Date(rawValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function setLastSyncAtInternal(date: Date) {
  await setMetaValue(LAST_SYNC_AT_KEY, date.toISOString())
}

function buildSyncFields(
  householdId: string | null,
  userId: string | null,
  currentVersion: number,
  lastSyncedVersion: number,
  syncStatus: SyncStatus,
  deletedAt: Date | null = null,
) {
  return {
    householdId,
    updatedAt: new Date(),
    updatedBy: userId,
    version: currentVersion,
    syncStatus,
    lastSyncedVersion,
    deletedAt,
  }
}

async function getVisibleCountForHousehold(table: EntityTable<SyncableEntity, 'id'>, householdId: string) {
  const items = await table.where('householdId').equals(householdId).toArray()
  return items.filter((item) => item.deletedAt === null).length
}

async function fetchRemoteSnapshot(householdId: string): Promise<RemoteSnapshot> {
  const client = getSupabaseClient()

  const [
    freezersResponse,
    drawersResponse,
    itemsResponse,
    tagsResponse,
    conflictsResponse,
  ] = await Promise.all([
    client.from('freezers').select('*').eq('household_id', householdId).order('sort_order', { ascending: true }),
    client.from('drawers').select('*').eq('household_id', householdId).order('sort_order', { ascending: true }),
    client.from('items').select('*').eq('household_id', householdId).order('date_added', { ascending: true }),
    client.from('tags').select('*').eq('household_id', householdId).order('name', { ascending: true }),
    client.from('sync_conflicts').select('*').eq('household_id', householdId).is('resolved_at', null).order('detected_at', { ascending: false }),
  ])

  for (const response of [freezersResponse, drawersResponse, itemsResponse, tagsResponse, conflictsResponse]) {
    if (response.error) {
      throw new Error(response.error.message)
    }
  }

  return {
    freezers: (freezersResponse.data ?? []) as RemoteFreezerRow[],
    drawers: (drawersResponse.data ?? []) as RemoteDrawerRow[],
    items: (itemsResponse.data ?? []) as RemoteItemRow[],
    tags: (tagsResponse.data ?? []) as RemoteTagRow[],
    conflicts: (conflictsResponse.data ?? []) as RemoteConflictRow[],
  }
}

async function hasRemoteData(snapshot: RemoteSnapshot) {
  return snapshot.freezers.length > 0
    || snapshot.drawers.length > 0
    || snapshot.items.length > 0
    || snapshot.tags.length > 0
}

async function claimLegacyLocalData(householdId: string, userId: string) {
  const now = new Date()

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags], async () => {
    await db.freezers.filter((freezer) => freezer.householdId === null).modify((freezer) => {
      freezer.householdId = householdId
      freezer.updatedAt = now
      freezer.updatedBy = userId
      freezer.syncStatus = 'pending'
      freezer.lastSyncedVersion = 0
      freezer.version = Math.max(freezer.version, 1)
    })

    await db.drawers.filter((drawer) => drawer.householdId === null).modify((drawer) => {
      drawer.householdId = householdId
      drawer.updatedAt = now
      drawer.updatedBy = userId
      drawer.syncStatus = 'pending'
      drawer.lastSyncedVersion = 0
      drawer.version = Math.max(drawer.version, 1)
    })

    await db.items.filter((item) => item.householdId === null).modify((item) => {
      item.householdId = householdId
      item.updatedAt = now
      item.updatedBy = userId
      item.syncStatus = 'pending'
      item.lastSyncedVersion = 0
      item.version = Math.max(item.version, 1)
    })

    await db.tags.filter((tag) => tag.householdId === null).modify((tag) => {
      tag.householdId = householdId
      tag.updatedAt = now
      tag.updatedBy = userId
      tag.syncStatus = 'pending'
      tag.lastSyncedVersion = 0
      tag.version = Math.max(tag.version, 1)
    })
  })
}

async function ensureHouseholdSeed(householdId: string, userId: string) {
  const freezerCount = await getVisibleCountForHousehold(db.freezers as EntityTable<SyncableEntity, 'id'>, householdId)
  if (freezerCount === 0) {
    await initializeDatabase(householdId, userId)
  }
}

async function getPendingEntities<T extends EntityType>(type: T, householdId: string): Promise<EntityMap[T][]> {
  const table = entityConfig[type].table
  const entities = await table.where('householdId').equals(householdId).toArray()
  return entities.filter((entity) => entity.syncStatus === 'pending')
}

async function insertConflict(
  householdId: string,
  entityType: EntityType,
  entityId: string,
  localEntity: SyncableEntity,
  remoteEntity: SyncableEntity,
  winnerSource: ConflictWinnerSource,
) {
  const client = getSupabaseClient()
  const conflictId = crypto.randomUUID()

  const conflict: SyncConflict = {
    id: conflictId,
    householdId,
    entityType,
    entityId,
    localPayload: serializeEntity(localEntity),
    remotePayload: serializeEntity(remoteEntity),
    winnerSource,
    detectedAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
  }

  const { error } = await client.from('sync_conflicts').insert({
    id: conflict.id,
    household_id: conflict.householdId,
    entity_type: conflict.entityType,
    entity_id: conflict.entityId,
    local_payload: conflict.localPayload,
    remote_payload: conflict.remotePayload,
    winner_source: conflict.winnerSource,
    detected_at: conflict.detectedAt.toISOString(),
    resolved_at: null,
    resolved_by: null,
  })

  if (error) {
    throw new Error(error.message)
  }

  await db.syncConflicts.put(conflict)
}

async function upsertRemoteEntity<T extends EntityType>(type: T, entity: EntityMap[T]) {
  const client = getSupabaseClient()
  const payload = entityConfig[type].toRemote(entity)
  const { error } = await client.from(entityConfig[type].remoteTable).upsert(payload)
  if (error) {
    throw new Error(error.message)
  }
}

function getRemoteVersion(row: RemoteEntityMap[EntityType] | undefined) {
  return row?.version ?? 0
}

function fromRemoteEntity(type: EntityType, row: RemoteEntityMap[EntityType]): SyncableEntity {
  switch (type) {
    case 'freezers':
      return entityConfig.freezers.fromRemote(row as RemoteFreezerRow)
    case 'drawers':
      return entityConfig.drawers.fromRemote(row as RemoteDrawerRow)
    case 'items':
      return entityConfig.items.fromRemote(row as RemoteItemRow)
    case 'tags':
      return entityConfig.tags.fromRemote(row as RemoteTagRow)
  }
}

async function putLocalEntity(type: EntityType, entity: SyncableEntity) {
  switch (type) {
    case 'freezers':
      await db.freezers.put(entity as Freezer)
      return
    case 'drawers':
      await db.drawers.put(entity as Drawer)
      return
    case 'items':
      await db.items.put(entity as Item)
      return
    case 'tags':
      await db.tags.put(entity as Tag)
  }
}

async function pushPendingChanges(snapshot: RemoteSnapshot, householdId: string, userId: string): Promise<{ pushed: number, conflicts: number }> {
  let pushed = 0
  let conflicts = 0

  const remoteMaps = {
    freezers: new Map(snapshot.freezers.map((row) => [row.id, row])),
    drawers: new Map(snapshot.drawers.map((row) => [row.id, row])),
    items: new Map(snapshot.items.map((row) => [row.id, row])),
    tags: new Map(snapshot.tags.map((row) => [row.id, row])),
  }

  for (const type of ENTITY_TYPES) {
    const pendingEntities = await getPendingEntities(type, householdId)

    for (const entity of pendingEntities) {
      const remoteRow = remoteMaps[type].get(entity.id)

      if (!remoteRow) {
        await upsertRemoteEntity(type, {
          ...entity,
          householdId,
          syncStatus: 'synced',
          lastSyncedVersion: entity.version,
        } as EntityMap[typeof type])
        await putLocalEntity(type, {
          ...entity,
          householdId,
          syncStatus: 'synced',
          lastSyncedVersion: entity.version,
        } as SyncableEntity)
        pushed += 1
        continue
      }

      const remoteEntity = fromRemoteEntity(type, remoteRow as RemoteEntityMap[EntityType])

      if (entity.lastSyncedVersion === remoteEntity.version) {
        const nextVersion = Math.max(entity.version, remoteEntity.version + 1)
        const syncedEntity = {
          ...entity,
          householdId,
          updatedBy: userId,
          version: nextVersion,
          syncStatus: 'synced' as SyncStatus,
          lastSyncedVersion: nextVersion,
        }
        await upsertRemoteEntity(type, syncedEntity as EntityMap[typeof type])
        await putLocalEntity(type, syncedEntity as SyncableEntity)
        pushed += 1
        continue
      }

      const winnerSource: ConflictWinnerSource = entity.updatedAt.getTime() >= remoteEntity.updatedAt.getTime()
        ? 'local'
        : 'remote'

      conflicts += 1
      await insertConflict(householdId, type, entity.id, entity, remoteEntity, winnerSource)

      if (winnerSource === 'local') {
        const conflictEntity = {
          ...entity,
          householdId,
          updatedAt: new Date(),
          updatedBy: userId,
          version: getRemoteVersion(remoteRow) + 1,
          syncStatus: 'conflict' as SyncStatus,
          lastSyncedVersion: getRemoteVersion(remoteRow) + 1,
        }
        await upsertRemoteEntity(type, conflictEntity as EntityMap[typeof type])
        await putLocalEntity(type, conflictEntity as SyncableEntity)
        pushed += 1
      } else {
        await putLocalEntity(type, {
          ...remoteEntity,
          syncStatus: 'conflict',
          lastSyncedVersion: remoteEntity.version,
        } as SyncableEntity)
      }
    }
  }

  return { pushed, conflicts }
}

async function applyRemoteSnapshot(snapshot: RemoteSnapshot, householdId: string): Promise<number> {
  let pulled = 0

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts], async () => {
    for (const type of ENTITY_TYPES) {
      const config = entityConfig[type]
      const tableRows = snapshot[type]
      const pendingEntities = await config.table.where('householdId').equals(householdId).toArray()
      const pendingIds = new Set(
        pendingEntities
          .filter((entity) => entity.syncStatus === 'pending')
          .map((entity) => entity.id),
      )

      for (const row of tableRows) {
        if (pendingIds.has(row.id)) continue
        await putLocalEntity(type, fromRemoteEntity(type, row as RemoteEntityMap[EntityType]))
        pulled += 1
      }
    }

    await db.syncConflicts.where('householdId').equals(householdId).delete()

    if (snapshot.conflicts.length > 0) {
      await db.syncConflicts.bulkPut(snapshot.conflicts.map((conflict) => ({
        id: conflict.id,
        householdId: conflict.household_id,
        entityType: conflict.entity_type,
        entityId: conflict.entity_id,
        localPayload: conflict.local_payload,
        remotePayload: conflict.remote_payload,
        winnerSource: conflict.winner_source,
        detectedAt: new Date(conflict.detected_at),
        resolvedAt: conflict.resolved_at ? new Date(conflict.resolved_at) : null,
        resolvedBy: conflict.resolved_by,
      })))
    }
  })

  return pulled
}

export async function synchronizeHousehold(): Promise<SyncResult> {
  if (isLocalOnlyMode()) {
    const finishedAt = new Date()
    useSessionStore.getState().setSyncState({
      isSyncing: false,
      syncError: null,
      lastSyncAt: null,
    })

    return {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      finishedAt,
    }
  }

  if (activeSync) {
    return activeSync
  }

  activeSync = (async () => {
    const { userId, householdId } = getCurrentSyncContext()
    const sessionStore = useSessionStore.getState()

    sessionStore.setSyncState({
      isSyncing: true,
      syncError: null,
    })

    try {
      let snapshot = await fetchRemoteSnapshot(householdId)
      const remoteHasEntities = await hasRemoteData(snapshot)

      if (!remoteHasEntities) {
        await claimLegacyLocalData(householdId, userId)
        await ensureHouseholdSeed(householdId, userId)
      }

      const pushResult = await pushPendingChanges(snapshot, householdId, userId)
      snapshot = await fetchRemoteSnapshot(householdId)
      const pulled = await applyRemoteSnapshot(snapshot, householdId)
      const finishedAt = new Date()

      await setLastSyncAtInternal(finishedAt)

      sessionStore.setSyncState({
        isSyncing: false,
        lastSyncAt: finishedAt,
        syncError: null,
      })

      return {
        pushed: pushResult.pushed,
        pulled,
        conflicts: pushResult.conflicts,
        finishedAt,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen.'
      sessionStore.setSyncState({
        isSyncing: false,
        syncError: message,
      })
      throw error
    } finally {
      activeSync = null
    }
  })()

  return activeSync
}

export async function hydrateSyncStateFromDatabase() {
  const lastSyncAt = await getLastSyncAtInternal()
  useSessionStore.getState().setSyncState({
    lastSyncAt,
  })
}

export async function clearLocalData() {
  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts, db.appMeta], async () => {
    await db.items.clear()
    await db.drawers.clear()
    await db.freezers.clear()
    await db.tags.clear()
    await db.syncConflicts.clear()
    await db.appMeta.clear()
  })
}

export async function resetHouseholdData() {
  if (isLocalOnlyMode()) {
    await clearLocalData()
    await initializeDatabase()
    return
  }

  const { userId, householdId } = requireSessionContext()
  const deletedAt = new Date()

  await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags, db.syncConflicts], async () => {
    await db.freezers.where('householdId').equals(householdId).modify((freezer) => {
      if (freezer.deletedAt !== null) return
      freezer.deletedAt = deletedAt
      freezer.updatedAt = deletedAt
      freezer.updatedBy = userId
      freezer.version += 1
      freezer.syncStatus = 'pending'
    })

    await db.drawers.where('householdId').equals(householdId).modify((drawer) => {
      if (drawer.deletedAt !== null) return
      drawer.deletedAt = deletedAt
      drawer.updatedAt = deletedAt
      drawer.updatedBy = userId
      drawer.version += 1
      drawer.syncStatus = 'pending'
    })

    await db.items.where('householdId').equals(householdId).modify((item) => {
      if (item.deletedAt !== null) return
      item.deletedAt = deletedAt
      item.updatedAt = deletedAt
      item.updatedBy = userId
      item.version += 1
      item.syncStatus = 'pending'
    })

    await db.tags.where('householdId').equals(householdId).modify((tag) => {
      if (tag.deletedAt !== null) return
      tag.deletedAt = deletedAt
      tag.updatedAt = deletedAt
      tag.updatedBy = userId
      tag.version += 1
      tag.syncStatus = 'pending'
    })

    await db.syncConflicts.where('householdId').equals(householdId).delete()
  })

  await initializeDatabase(householdId, userId)
}

export async function getPendingSyncCountForHousehold(householdId: string) {
  const [freezers, drawers, items, tags] = await Promise.all([
    db.freezers.where('householdId').equals(householdId).toArray(),
    db.drawers.where('householdId').equals(householdId).toArray(),
    db.items.where('householdId').equals(householdId).toArray(),
    db.tags.where('householdId').equals(householdId).toArray(),
  ])

  return [...freezers, ...drawers, ...items, ...tags].filter((entity) => entity.syncStatus === 'pending').length
}

export async function resolveSyncConflict(conflictId: string, winnerSource: ConflictWinnerSource) {
  if (isLocalOnlyMode()) {
    throw new Error('Im lokalen Modus gibt es keine Cloud-Konflikte.')
  }

  const conflict = await db.syncConflicts.get(conflictId)
  if (!conflict) {
    throw new Error('Konflikt wurde nicht gefunden.')
  }

  const { userId, householdId } = getCurrentSyncContext()
  const config = entityConfig[conflict.entityType]
  const chosenEntity = winnerSource === 'local'
    ? config.deserializePayload(conflict.localPayload)
    : config.deserializePayload(conflict.remotePayload)

  const remoteVersion = Math.max(
    Number(conflict.localPayload.version ?? 0),
    Number(conflict.remotePayload.version ?? 0),
  )
  const nextVersion = remoteVersion + 1
  const resolvedEntity = {
    ...chosenEntity,
    householdId,
    updatedAt: new Date(),
    updatedBy: userId,
    version: nextVersion,
    syncStatus: 'synced' as SyncStatus,
    lastSyncedVersion: nextVersion,
  }

  await upsertRemoteEntity(conflict.entityType, resolvedEntity as never)

  const client = getSupabaseClient()
  const resolvedAt = new Date()
  const { error } = await client
    .from('sync_conflicts')
    .update({
      resolved_at: resolvedAt.toISOString(),
      resolved_by: userId,
      winner_source: winnerSource,
    })
    .eq('id', conflictId)

  if (error) {
    throw new Error(error.message)
  }

  await config.table.put(resolvedEntity as never)
  await db.syncConflicts.delete(conflictId)
}

function requireSessionContext() {
  const { user, household } = useSessionStore.getState()
  if (!user || !household) {
    throw new Error('Bitte zuerst anmelden.')
  }

  return {
    userId: user.id,
    householdId: household.id,
  }
}

async function getVisibleTagByName(householdId: string | null, name: string) {
  const tags = householdId === null
    ? await db.tags.toArray()
    : await db.tags.where('householdId').equals(householdId).toArray()
  return tags.find((tag) => tag.deletedAt === null && tag.name.toLowerCase() === name.toLowerCase()) ?? null
}

export async function addFreezer(name: string): Promise<Freezer> {
  const { userId, householdId, syncStatus } = getWriteContext()
  const freezers = householdId === null
    ? await db.freezers.toArray()
    : await db.freezers.where('householdId').equals(householdId).toArray()
  const visibleCount = freezers.filter((freezer) => freezer.deletedAt === null).length
  const freezer: Freezer = {
    id: crypto.randomUUID(),
    name,
    order: visibleCount,
    createdAt: new Date(),
    ...buildSyncFields(householdId, userId, 1, 0, syncStatus),
  }
  await db.freezers.add(freezer)
  return freezer
}

export async function updateFreezer(id: string, updates: Partial<Freezer>) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const freezer = await db.freezers.get(id)
  if (!freezer) return

  await db.freezers.put({
    ...freezer,
    ...updates,
    ...buildSyncFields(
      householdId,
      userId,
      freezer.version + 1,
      syncStatus === 'pending' && freezer.syncStatus === 'pending' ? freezer.lastSyncedVersion : freezer.version,
      syncStatus,
      freezer.deletedAt,
    ),
  })
}

export async function addDrawer(freezerId: string, name: string, color: string): Promise<Drawer> {
  const { userId, householdId, syncStatus } = getWriteContext()
  const drawers = householdId === null
    ? await db.drawers.toArray()
    : await db.drawers.where('householdId').equals(householdId).toArray()
  const visibleCount = drawers.filter((drawer) => drawer.freezerId === freezerId && drawer.deletedAt === null).length
  const drawer: Drawer = {
    id: crypto.randomUUID(),
    freezerId,
    name,
    order: visibleCount,
    color,
    createdAt: new Date(),
    ...buildSyncFields(householdId, userId, 1, 0, syncStatus),
  }
  await db.drawers.add(drawer)
  return drawer
}

export async function updateDrawer(id: string, updates: Partial<Drawer>) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const drawer = await db.drawers.get(id)
  if (!drawer) return

  await db.drawers.put({
    ...drawer,
    ...updates,
    ...buildSyncFields(
      householdId,
      userId,
      drawer.version + 1,
      syncStatus === 'pending' && drawer.syncStatus === 'pending' ? drawer.lastSyncedVersion : drawer.version,
      syncStatus,
      drawer.deletedAt,
    ),
  })
}

export async function deleteDrawer(id: string) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const drawer = await db.drawers.get(id)
  if (!drawer) return

  const deletedAt = new Date()

  await db.transaction('rw', [db.drawers, db.items], async () => {
    await db.drawers.put({
      ...drawer,
      ...buildSyncFields(
          householdId,
          userId,
          drawer.version + 1,
          syncStatus === 'pending' && drawer.syncStatus === 'pending' ? drawer.lastSyncedVersion : drawer.version,
          syncStatus,
          deletedAt,
        ),
      })

    const items = await db.items.where('drawerId').equals(id).toArray()
    for (const item of items) {
      await db.items.put({
        ...item,
        ...buildSyncFields(
          householdId,
          userId,
          item.version + 1,
          syncStatus === 'pending' && item.syncStatus === 'pending' ? item.lastSyncedVersion : item.version,
          syncStatus,
          deletedAt,
        ),
      })
    }
  })
}

export async function addItem(
  drawerId: string,
  name: string,
  quantity: number,
  unit: string,
  tags: string[],
  notes: string,
): Promise<Item> {
  const { userId, householdId, syncStatus } = getWriteContext()
  const item: Item = {
    id: crypto.randomUUID(),
    drawerId,
    name,
    quantity,
    unit,
    tags,
    notes,
    dateAdded: new Date(),
    ...buildSyncFields(householdId, userId, 1, 0, syncStatus),
  }
  await db.items.add(item)
  return item
}

export async function deleteItem(id: string) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const item = await db.items.get(id)
  if (!item) return

  await db.items.put({
    ...item,
    ...buildSyncFields(
      householdId,
      userId,
      item.version + 1,
      syncStatus === 'pending' && item.syncStatus === 'pending' ? item.lastSyncedVersion : item.version,
      syncStatus,
      new Date(),
    ),
  })
}

export async function updateItem(id: string, updates: Partial<Item>) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const item = await db.items.get(id)
  if (!item) return

  await db.items.put({
    ...item,
    ...updates,
    ...buildSyncFields(
      householdId,
      userId,
      item.version + 1,
      syncStatus === 'pending' && item.syncStatus === 'pending' ? item.lastSyncedVersion : item.version,
      syncStatus,
      item.deletedAt,
    ),
  })
}

export async function addTag(name: string, color: string): Promise<Tag> {
  const { userId, householdId, syncStatus } = getWriteContext()
  const existingTag = await getVisibleTagByName(householdId, name)
  if (existingTag) {
    throw new Error('Tag existiert bereits.')
  }

  const tag: Tag = {
    id: crypto.randomUUID(),
    name,
    color,
    createdAt: new Date(),
    ...buildSyncFields(householdId, userId, 1, 0, syncStatus),
  }
  await db.tags.add(tag)
  return tag
}

export async function deleteTag(id: string) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const tag = await db.tags.get(id)
  if (!tag) return

  await db.tags.put({
    ...tag,
    ...buildSyncFields(
      householdId,
      userId,
      tag.version + 1,
      syncStatus === 'pending' && tag.syncStatus === 'pending' ? tag.lastSyncedVersion : tag.version,
      syncStatus,
      new Date(),
    ),
  })
}

export async function updateTag(id: string, updates: Partial<Tag>) {
  const { userId, householdId, syncStatus } = getWriteContext()
  const tag = await db.tags.get(id)
  if (!tag) return

  await db.tags.put({
    ...tag,
    ...updates,
    ...buildSyncFields(
      householdId,
      userId,
      tag.version + 1,
      syncStatus === 'pending' && tag.syncStatus === 'pending' ? tag.lastSyncedVersion : tag.version,
      syncStatus,
      tag.deletedAt,
    ),
  })
}

export async function getLastSyncAt() {
  return getLastSyncAtInternal()
}

export function isEntityVisibleForHousehold(entity: SyncableEntity, householdId: string | null) {
  return isVisibleEntity(entity, householdId)
}
