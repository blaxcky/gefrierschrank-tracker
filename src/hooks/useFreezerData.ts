import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useSessionStore } from '../store/useSessionStore'
import {
  addDrawer,
  addFreezer,
  addItem,
  addTag,
  deleteDrawer,
  deleteItem,
  deleteTag,
  getPendingSyncCountForHousehold,
  isEntityVisibleForHousehold,
  resolveSyncConflict,
  synchronizeHousehold,
  updateDrawer,
  updateFreezer,
  updateItem,
  updateTag,
} from '../services/syncService'

export { addDrawer, addFreezer, addItem, addTag, deleteDrawer, deleteItem, deleteTag, resolveSyncConflict, synchronizeHousehold, updateDrawer, updateFreezer, updateItem, updateTag }

function useHouseholdId() {
  return useSessionStore((state) => state.household?.id)
}

export function useFreezers() {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!householdId) return []
    const freezers = await db.freezers.orderBy('order').toArray()
    return freezers.filter((freezer) => isEntityVisibleForHousehold(freezer, householdId))
  }, [householdId])
}

export function useFirstFreezer() {
  const freezers = useFreezers()
  return freezers?.[0]
}

export function useDrawers(freezerId: string | undefined) {
  const householdId = useHouseholdId()

  return useLiveQuery(
    async () => {
      if (!freezerId || !householdId) return []
      const drawers = await db.drawers.where('freezerId').equals(freezerId).sortBy('order')
      return drawers.filter((drawer) => isEntityVisibleForHousehold(drawer, householdId))
    },
    [freezerId, householdId]
  )
}

export function useDrawer(drawerId: string | undefined) {
  const householdId = useHouseholdId()

  return useLiveQuery(
    async () => {
      if (!drawerId || !householdId) return undefined
      const drawer = await db.drawers.get(drawerId)
      if (!drawer || !isEntityVisibleForHousehold(drawer, householdId)) return undefined
      return drawer
    },
    [drawerId, householdId]
  )
}

export function useItems(drawerId: string | undefined) {
  const householdId = useHouseholdId()

  return useLiveQuery(
    async () => {
      if (!drawerId || !householdId) return []
      const items = await db.items.where('drawerId').equals(drawerId).toArray()
      return items.filter((item) => isEntityVisibleForHousehold(item, householdId))
    },
    [drawerId, householdId]
  )
}

export function useItemsByFreezer(freezerId: string | undefined) {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!freezerId || !householdId) return []
    const drawers = await db.drawers.where('freezerId').equals(freezerId).toArray()
    const visibleDrawers = drawers.filter((drawer) => isEntityVisibleForHousehold(drawer, householdId))
    const drawerIds = visibleDrawers.map(drawer => drawer.id)
    if (drawerIds.length === 0) return []
    const items = await db.items.where('drawerId').anyOf(drawerIds).toArray()
    return items.filter((item) => isEntityVisibleForHousehold(item, householdId))
  }, [freezerId, householdId])
}

export function useDrawerStats(drawerId: string) {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!householdId) {
      return {
        items: [],
        itemCount: 0,
      }
    }
    const items = await db.items.where('drawerId').equals(drawerId).toArray()
    const visibleItems = items.filter((item) => isEntityVisibleForHousehold(item, householdId))
    return {
      items: visibleItems,
      itemCount: visibleItems.length,
    }
  }, [drawerId, householdId])
}

export function useTags() {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!householdId) return []
    const tags = await db.tags.orderBy('name').toArray()
    return tags.filter((tag) => isEntityVisibleForHousehold(tag, householdId))
  }, [householdId])
}

export function useSyncConflicts() {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!householdId) return []
    const conflicts = await db.syncConflicts.where('householdId').equals(householdId).toArray()
    return conflicts
      .filter((conflict) => conflict.resolvedAt === null)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }, [householdId])
}

export function usePendingSyncCount() {
  const householdId = useHouseholdId()

  return useLiveQuery(async () => {
    if (!householdId) return 0
    return getPendingSyncCountForHousehold(householdId)
  }, [householdId])
}
