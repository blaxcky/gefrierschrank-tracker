import type { ReactNode } from 'react'

interface FreezerBodyProps {
  children: ReactNode
}

export default function FreezerBody({ children }: FreezerBodyProps) {
  return (
    <div className="freezer-cabinet">
      <div className="freezer-outer">
        <div className="freezer-inner">
          <div className="freezer-brand">
            <span style={{ fontSize: 14 }}>&#10052;</span>
            <span>Freezer</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
