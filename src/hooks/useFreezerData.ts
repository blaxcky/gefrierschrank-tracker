import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Freezer, type Drawer, type Item, type Tag } from '../db/database'

export function useFreezers() {
  return useLiveQuery(() => db.freezers.orderBy('order').toArray())
}

export function useFirstFreezer() {
  return useLiveQuery(() => db.freezers.orderBy('order').first())
}

export function useDrawers(freezerId: string | undefined) {
  return useLiveQuery(
    () => freezerId
      ? db.drawers.where('freezerId').equals(freezerId).sortBy('order')
      : [],
    [freezerId]
  )
}

export function useDrawer(drawerId: string | undefined) {
  return useLiveQuery(
    () => drawerId ? db.drawers.get(drawerId) : undefined,
    [drawerId]
  )
}

export function useItems(drawerId: string | undefined) {
  return useLiveQuery(
    () => drawerId
      ? db.items.where('drawerId').equals(drawerId).toArray()
      : [],
    [drawerId]
  )
}

export function useDrawerStats(drawerId: string) {
  return useLiveQuery(async () => {
    const items = await db.items.where('drawerId').equals(drawerId).toArray()
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return {
      items,
      itemCount: items.length,
      expiredCount: items.filter(i => i.expiryDate && i.expiryDate < now).length,
    }
  }, [drawerId])
}

export function useTags() {
  return useLiveQuery(() => db.tags.toArray())
}

// CRUD operations

export async function addFreezer(name: string): Promise<Freezer> {
  const count = await db.freezers.count()
  const freezer: Freezer = {
    id: crypto.randomUUID(),
    name,
    order: count,
    createdAt: new Date(),
  }
  await db.freezers.add(freezer)
  return freezer
}

export async function updateFreezer(id: string, updates: Partial<Freezer>) {
  await db.freezers.update(id, updates)
}

export async function addDrawer(freezerId: string, name: string, color: string): Promise<Drawer> {
  const drawers = await db.drawers.where('freezerId').equals(freezerId).toArray()
  const drawer: Drawer = {
    id: crypto.randomUUID(),
    freezerId,
    name,
    order: drawers.length,
    color,
    createdAt: new Date(),
  }
  await db.drawers.add(drawer)
  return drawer
}

export async function updateDrawer(id: string, updates: Partial<Drawer>) {
  await db.drawers.update(id, updates)
}

export async function deleteDrawer(id: string) {
  await db.transaction('rw', [db.drawers, db.items], async () => {
    await db.items.where('drawerId').equals(id).delete()
    await db.drawers.delete(id)
  })
}

export async function addItem(
  drawerId: string,
  name: string,
  quantity: number,
  unit: string,
  tags: string[],
  notes: string,
  expiryDate?: Date,
): Promise<Item> {
  const item: Item = {
    id: crypto.randomUUID(),
    drawerId,
    name,
    quantity,
    unit,
    tags,
    notes,
    dateAdded: new Date(),
    expiryDate,
  }
  await db.items.add(item)
  return item
}

export async function deleteItem(id: string) {
  await db.items.delete(id)
}

export async function addTag(name: string, color: string): Promise<Tag> {
  const tag: Tag = {
    id: crypto.randomUUID(),
    name,
    color,
  }
  await db.tags.add(tag)
  return tag
}

export async function deleteTag(id: string) {
  await db.tags.delete(id)
}

export async function updateTag(id: string, updates: Partial<Tag>) {
  await db.tags.update(id, updates)
}
