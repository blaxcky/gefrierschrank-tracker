import Dexie, { type EntityTable } from 'dexie'

export interface Freezer {
  id: string
  name: string
  order: number
  createdAt: Date
}

export interface Drawer {
  id: string
  freezerId: string
  name: string
  order: number
  color: string
  createdAt: Date
}

export interface Item {
  id: string
  drawerId: string
  name: string
  quantity: number
  unit: string
  tags: string[]
  notes: string
  dateAdded: Date
  expiryDate?: Date
}

export interface Tag {
  id: string
  name: string
  color: string
}

const db = new Dexie('GefrierschrankDB') as Dexie & {
  freezers: EntityTable<Freezer, 'id'>
  drawers: EntityTable<Drawer, 'id'>
  items: EntityTable<Item, 'id'>
  tags: EntityTable<Tag, 'id'>
}

db.version(1).stores({
  freezers: 'id, order',
  drawers: 'id, freezerId, order',
  items: 'id, drawerId, *tags, dateAdded, expiryDate',
  tags: 'id, &name',
})

export { db }
