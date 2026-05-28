import React from 'react'

export default function OccupancyBar({ current, max }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0
  const cls = pct >= 90 ? 'high' : pct >= 60 ? 'medium' : 'low'

  return (
    <div>
      <div className="occupancy-bar">
        <div className={`occupancy-fill ${cls}`} style={{ width: `${pct}%` }}></div>
      </div>
      <div className="occupancy-text">{current}/{max} ({pct}%)</div>
    </div>
  )
}
