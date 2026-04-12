import { db, type SyncStatus } from './database'
import { DEFAULT_TAGS } from '../utils/defaultTags'

const DRAWER_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA']

function getSeedSyncFields(householdId: string | null, userId: string | null, syncStatus: SyncStatus) {
  const timestamp = new Date()
  return {
    householdId,
    updatedAt: timestamp,
    updatedBy: userId,
    version: householdId ? 1 : 0,
    syncStatus,
    lastSyncedVersion: 0,
    deletedAt: null,
  }
}

export async function initializeDatabase(householdId: string | null = null, userId: string | null = null) {
  const freezerCount = await db.freezers.filter((freezer) => freezer.deletedAt === null).count()
  if (freezerCount > 0) return

  const freezerId = crypto.randomUUID()
  const syncStatus: SyncStatus = householdId ? 'pending' : 'synced'

  await db.transaction('rw', [db.freezers, db.drawers, db.tags], async () => {
    await db.freezers.add({
      id: freezerId,
      name: 'Mein Gefrierschrank',
      order: 0,
      createdAt: new Date(),
      ...getSeedSyncFields(householdId, userId, syncStatus),
    })

    for (let i = 0; i < 4; i++) {
      await db.drawers.add({
        id: crypto.randomUUID(),
        freezerId,
        name: `Fach ${i + 1}`,
        order: i,
        color: DRAWER_COLORS[i],
        createdAt: new Date(),
        ...getSeedSyncFields(householdId, userId, syncStatus),
      })
    }

    for (const tag of DEFAULT_TAGS) {
      await db.tags.add({
        id: crypto.randomUUID(),
        name: tag.name,
        color: tag.color,
        createdAt: new Date(),
        ...getSeedSyncFields(householdId, userId, syncStatus),
      })
    }
  })
}
