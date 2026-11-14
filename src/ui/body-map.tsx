import type { KeyboardEvent } from 'react'
import type { RegionId, Severity } from '../config/types'
import { HAZARD_INTENSITY } from '../config/mission'
import type { HazardId } from '../config/types'

export type MapRegion = RegionId | 'radiation'
const markers: { id: MapRegion; label: string; letter: string; x: number; y: number }[] = [
  { id: 'brain_eyes', label: 'Brain & eyes', letter: 'B', x: 176, y: 58 },
  { id: 'inner_ear', label: 'Balance & inner ear', letter: 'E', x: 236, y: 79 },
  { id: 'heart_vessels', label: 'Heart & circulation', letter: 'H', x: 189, y: 128 },
  { id: 'bones_muscle', label: 'Bones & muscles', letter: 'M', x: 216, y: 175 },
  { id: 'gut_nutrition', label: 'Gut & nutrition', letter: 'N', x: 180, y: 188 },
  { id: 'immune', label: 'Immune health', letter: 'I', x: 239, y: 206 },
  { id: 'mind_sleep', label: 'Mind & sleep', letter: 'S', x: 212, y: 55 },
  { id: 'radiation', label: 'Radiation overlay', letter: 'R', x: 218, y: 236 },
]

const statusWord: Record<Severity, string> = { green: 'In range', amber: 'Monitor', red: 'Action' }

function markerKey(event: KeyboardEvent<SVGGElement>, select: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select()
  }
}

export function BodyMap({
  statuses,
  activeHazards,
  selected,
  dataAvailable,
  radiationStatus,
  onSelect,
}: {
  statuses: Record<RegionId, Severity>
  activeHazards: HazardId[]
  selected: MapRegion
  dataAvailable: boolean
  radiationStatus: Severity
  onSelect: (region: MapRegion) => void
}) {
  const severity = (id: MapRegion): Severity => id === 'radiation'
    ? (activeHazards.includes('radiation') ? 'amber' : radiationStatus)
    : statuses[id]
  const intensity = (id: MapRegion): number => activeHazards.reduce((highest, hazard) => Math.max(highest, HAZARD_INTENSITY[hazard][id] ?? 0), 0)

  return (
    <div className="body-map-layout">
      <figure className="body-map-figure">
        <svg viewBox="0 0 420 300" className="body-map-svg" role="group" aria-label="Interactive astronaut health body map">
          <defs>
            <linearGradient id="suitGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1d3446" />
              <stop offset="100%" stopColor="#101c2a" />
            </linearGradient>
            <radialGradient id="radarGlow">
              <stop offset="0%" stopColor="#3ed8c1" stopOpacity=".04" />
              <stop offset="100%" stopColor="#3ed8c1" stopOpacity=".18" />
            </radialGradient>
          </defs>
          {activeHazards.includes('radiation') && <circle cx="210" cy="155" r="137" fill="url(#radarGlow)" stroke="#3ed8c1" strokeDasharray="3 7" strokeOpacity=".45" />}
          {activeHazards.includes('distance') && <circle cx="210" cy="155" r="124" fill="none" stroke="#f0c978" strokeDasharray="8 7" strokeOpacity=".55" />}
          <g className="silhouette" aria-hidden="true" fill="url(#suitGradient)" stroke="#486276" strokeWidth="1.5">
            <circle cx="210" cy="47" r="26" />
            <path d="M198 70h24v14h-24z" />
            <path d="M181 82 Q165 84 158 98 L145 159 Q142 171 153 174 Q164 177 169 165 L181 124 L181 174 Q210 188 239 174 L239 124 L251 165 Q256 177 267 174 Q278 171 275 159 L262 98 Q255 84 239 82 Z" />
            <path d="M184 174 L179 238 Q178 249 190 250 Q201 250 203 239 L211 190 L219 239 Q221 250 232 250 Q244 249 242 238 L237 174 Z" />
            <path d="M181 97 Q167 100 165 114 L157 157 Q155 165 163 167 Q171 169 174 161 L183 128 Z" />
            <path d="M239 97 Q253 100 255 114 L263 157 Q265 165 257 167 Q249 169 246 161 L237 128 Z" />
            <path d="M193 86 Q210 80 227 86 L234 111 L210 126 L186 111 Z" fill="#223e50" />
            <path d="M188 128 Q210 135 232 128 L236 170 Q210 183 184 170 Z" fill="#172b3a" />
            <path d="M181 246 Q192 241 203 246 L205 261 Q195 266 178 262 Z M217 246 Q228 241 239 246 L242 262 Q225 266 215 261 Z" />
          </g>
          <path className="body-map-spine" d="M210 85V242" aria-hidden="true" />
          {markers.map((marker) => {
            const selectedMarker = selected === marker.id
            const currentStatus = severity(marker.id)
            const intensityLevel = intensity(marker.id)
            return (
              <g
                key={marker.id}
                className={`map-marker status-${dataAvailable ? currentStatus : 'empty'}${selectedMarker ? ' is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${marker.label}: ${dataAvailable ? statusWord[currentStatus] : 'No data'}${intensityLevel ? `, hazard intensity ${intensityLevel} of 3` : ''}`}
                aria-pressed={selectedMarker}
                onClick={() => onSelect(marker.id)}
                onKeyDown={(event) => markerKey(event, () => onSelect(marker.id))}
              >
                <circle className="marker-hit" cx={marker.x} cy={marker.y} r="18" />
                <circle className="marker-core" cx={marker.x} cy={marker.y} r="12" />
                <text x={marker.x} y={marker.y + 4} textAnchor="middle">{marker.letter}</text>
                {intensityLevel > 0 && <text className="marker-intensity" x={marker.x + 10} y={marker.y - 10}>{intensityLevel}</text>}
              </g>
            )
          })}
        </svg>
        <figcaption>{activeHazards.length ? 'Numbers show relative hazard emphasis (1 low, 3 higher), not an individual risk score.' : 'Choose a body region to view its indicators and plain-language guidance.'}</figcaption>
      </figure>
      <div className="body-map-legend" aria-label="Region status legend">
        {markers.map((marker) => {
          const currentStatus = severity(marker.id)
          return (
            <button
              type="button"
              key={marker.id}
              className={`region-pick${selected === marker.id ? ' is-selected' : ''}`}
              aria-pressed={selected === marker.id}
              onClick={() => onSelect(marker.id)}
            >
              <span className={`status-dot status-${dataAvailable ? currentStatus : 'empty'}`} aria-hidden="true" />
              <span>{marker.label}</span>
              <span className={`status-word status-${dataAvailable ? currentStatus : 'empty'}`}>{dataAvailable ? statusWord[currentStatus] : 'No data'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
