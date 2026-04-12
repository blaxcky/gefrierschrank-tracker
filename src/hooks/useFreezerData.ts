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

function useIsLocalOnly() {
  return useSessionStore((state) => state.status === 'local_only')
}

export function useFreezers() {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    const freezers = await db.freezers.orderBy('order').toArray()
    return freezers.filter((freezer) => isEntityVisibleForHousehold(freezer, isLocalOnly ? null : householdId ?? null))
  }, [householdId, isLocalOnly])
}

export function useFirstFreezer() {
  const freezers = useFreezers()
  return freezers?.[0]
}

export function useDrawers(freezerId: string | undefined) {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(
    async () => {
      if (!freezerId) return []
      const drawers = await db.drawers.where('freezerId').equals(freezerId).sortBy('order')
      return drawers.filter((drawer) => isEntityVisibleForHousehold(drawer, isLocalOnly ? null : householdId ?? null))
    },
    [freezerId, householdId, isLocalOnly]
  )
}

export function useDrawer(drawerId: string | undefined) {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(
    async () => {
      if (!drawerId) return undefined
      const drawer = await db.drawers.get(drawerId)
      if (!drawer || !isEntityVisibleForHousehold(drawer, isLocalOnly ? null : householdId ?? null)) return undefined
      return drawer
    },
    [drawerId, householdId, isLocalOnly]
  )
}

export function useItems(drawerId: string | undefined) {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(
    async () => {
      if (!drawerId) return []
      const items = await db.items.where('drawerId').equals(drawerId).toArray()
      return items.filter((item) => isEntityVisibleForHousehold(item, isLocalOnly ? null : householdId ?? null))
    },
    [drawerId, householdId, isLocalOnly]
  )
}

export function useItemsByFreezer(freezerId: string | undefined) {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    if (!freezerId) return []
    const drawers = await db.drawers.where('freezerId').equals(freezerId).toArray()
    const visibleDrawers = drawers.filter((drawer) => isEntityVisibleForHousehold(drawer, isLocalOnly ? null : householdId ?? null))
    const drawerIds = visibleDrawers.map(drawer => drawer.id)
    if (drawerIds.length === 0) return []
    const items = await db.items.where('drawerId').anyOf(drawerIds).toArray()
    return items.filter((item) => isEntityVisibleForHousehold(item, isLocalOnly ? null : householdId ?? null))
  }, [freezerId, householdId, isLocalOnly])
}

export function useDrawerStats(drawerId: string) {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    const items = await db.items.where('drawerId').equals(drawerId).toArray()
    const visibleItems = items.filter((item) => isEntityVisibleForHousehold(item, isLocalOnly ? null : householdId ?? null))
    return {
      items: visibleItems,
      itemCount: visibleItems.length,
    }
  }, [drawerId, householdId, isLocalOnly])
}

export function useTags() {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    const tags = await db.tags.orderBy('name').toArray()
    return tags.filter((tag) => isEntityVisibleForHousehold(tag, isLocalOnly ? null : householdId ?? null))
  }, [householdId, isLocalOnly])
}

export function useSyncConflicts() {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    if (isLocalOnly || !householdId) return []
    const conflicts = await db.syncConflicts.where('householdId').equals(householdId).toArray()
    return conflicts
      .filter((conflict) => conflict.resolvedAt === null)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }, [householdId, isLocalOnly])
}

export function usePendingSyncCount() {
  const householdId = useHouseholdId()
  const isLocalOnly = useIsLocalOnly()

  return useLiveQuery(async () => {
    if (isLocalOnly || !householdId) return 0
    return getPendingSyncCountForHousehold(householdId)
  }, [householdId, isLocalOnly])
}
