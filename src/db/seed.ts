import { db } from './database'
import { DEFAULT_TAGS } from '../utils/defaultTags'

const DRAWER_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA']

export async function initializeDatabase() {
  const freezerCount = await db.freezers.count()
  if (freezerCount > 0) return

  const freezerId = crypto.randomUUID()

  await db.transaction('rw', [db.freezers, db.drawers, db.tags], async () => {
    await db.freezers.add({
      id: freezerId,
      name: 'Mein Gefrierschrank',
      order: 0,
      createdAt: new Date(),
    })

    for (let i = 0; i < 4; i++) {
      await db.drawers.add({
        id: crypto.randomUUID(),
        freezerId,
        name: `Fach ${i + 1}`,
        order: i,
        color: DRAWER_COLORS[i],
        createdAt: new Date(),
      })
    }

    for (const tag of DEFAULT_TAGS) {
      await db.tags.add({
        id: crypto.randomUUID(),
        name: tag.name,
        color: tag.color,
      })
    }
  })
}
