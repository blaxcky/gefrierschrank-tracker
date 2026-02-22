import { useState } from 'react'
import { useTags, addTag } from '../../hooks/useFreezerData'

interface TagPickerProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

export default function TagPicker({ selectedTags, onChange }: TagPickerProps) {
  const tags = useTags()
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName))
    } else {
      onChange([...selectedTags, tagName])
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    try {
      await addTag(newTagName.trim(), randomColor)
      onChange([...selectedTags, newTagName.trim()])
    } catch {
      // Tag might already exist
    }
    setNewTagName('')
    setShowNewTag(false)
  }

  return (
    <div style={{ padding: '0 0 8px' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(tags ?? []).map((tag) => (
          <div
            key={tag.id}
            className="tag-chip"
            style={{
              backgroundColor: selectedTags.includes(tag.name) ? tag.color + '22' : 'var(--ft-tertiary-fill)',
              color: selectedTags.includes(tag.name) ? tag.color : 'var(--ft-secondary-label)',
              border: '1px solid transparent',
              cursor: 'pointer',
            }}
            onClick={() => toggleTag(tag.name)}
          >
            {tag.name}
          </div>
        ))}
        {!showNewTag ? (
          <div
            className="tag-chip"
            style={{
              backgroundColor: 'var(--ft-tertiary-fill)',
              color: 'var(--ft-blue)',
              cursor: 'pointer',
              border: '1px dashed var(--ft-blue)',
            }}
            onClick={() => setShowNewTag(true)}
          >
            + Neuer Tag
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Tag-Name"
              autoFocus
              style={{
                border: '1px solid var(--ft-blue)',
                borderRadius: 12,
                padding: '4px 10px',
                fontSize: 12,
                outline: 'none',
                width: 100,
              }}
            />
            <button
              onClick={handleAddTag}
              type="button"
              style={{
                background: 'var(--ft-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
