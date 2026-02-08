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
              backgroundColor: selectedTags.includes(tag.name) ? tag.color + '22' : '#F2F2F7',
              color: selectedTags.includes(tag.name) ? tag.color : '#8E8E93',
              border: `1px solid ${selectedTags.includes(tag.name) ? tag.color : 'transparent'}`,
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
              backgroundColor: '#F2F2F7',
              color: '#007AFF',
              cursor: 'pointer',
              border: '1px dashed #007AFF',
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
                border: '1px solid #007AFF',
                borderRadius: 12,
                padding: '4px 10px',
                fontSize: 12,
                outline: 'none',
                width: 100,
              }}
            />
            <button
              onClick={handleAddTag}
              style={{
                background: '#007AFF',
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
