import type { ReactNode } from 'react'

interface FreezerBodyProps {
  children: ReactNode
}

export default function FreezerBody({ children }: FreezerBodyProps) {
  return (
    <div style={{ padding: '16px' }}>
      <div className="freezer-top">
        <span style={{ fontSize: 20, letterSpacing: 2 }}>&#10052;</span>
      </div>
      <div className="freezer-body">
        {children}
      </div>
    </div>
  )
}
