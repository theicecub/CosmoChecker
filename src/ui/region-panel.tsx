import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CrewId, DailyRecord, IndicatorId, RegionId, Severity } from '../config/types'
import { REGIONS } from '../config/mission'
import { REGION_INDICATORS } from '../engine/status'
import type { CrewAssessment } from '../engine'
import { valueFor } from '../engine/baseline'
import type { MapRegion } from './body-map'

const indicatorLabels: Record<string, { label: string; unit: string; precision: number }> = {
  resting_hr: { label: 'Resting heart rate', unit: 'bpm', precision: 0 },
  bp: { label: 'Systolic blood pressure', unit: 'mmHg', precision: 0 },
  exercise_min: { label: 'Exercise', unit: 'min', precision: 0 },
  reaction: { label: 'Reaction time', unit: 'ms', precision: 0 },
  reaction_lapses: { label: 'Reaction lapses', unit: 'lapses', precision: 0 },
  temp_c: { label: 'Temperature', unit: '°C', precision: 1 },
  fasting_glucose: { label: 'Fasting glucose', unit: 'mg/dL', precision: 0 },
  body_mass_kg: { label: 'Body mass', unit: 'kg', precision: 1 },
  sleep_h: { label: 'Sleep', unit: 'h', precision: 1 },
  mood: { label: 'Mood', unit: '/ 5', precision: 1 },
  stress: { label: 'Stress', unit: '/ 5', precision: 1 },
  dose: { label: 'Daily peak dose', unit: 'mSv', precision: 2 },
}

const statusLabel: Record<Severity, string> = { green: 'In range', amber: 'Monitor', red: 'Action' }

function severityDescription(status?: Severity): string {
  if (status === 'red') return 'This reading is outside the configured red band. Follow the mission protocol.'
  if (status === 'amber') return 'This reading or pattern is worth monitoring against your own baseline.'
  return 'No configured threshold or trend is currently flagged for this region.'
}

export function RegionPanel({
  region,
  crewId,
  day,
  records,
  assessment,
  statuses,
  dataAvailable,
}: {
  region: MapRegion
  crewId: CrewId
  day: number
  records: DailyRecord[]
  assessment?: CrewAssessment
  statuses: Record<RegionId, Severity>
  dataAvailable: boolean
}) {
  const [range, setRange] = useState<30 | 90 | 180>(30)
  const [selectedMetric, setSelectedMetric] = useState<IndicatorId>()
  const content = region === 'radiation' ? undefined : REGIONS[region]
  const availableIndicators: Exclude<IndicatorId, 'symptoms'>[] = region === 'radiation'
    ? []
    : REGION_INDICATORS[region].filter((item): item is Exclude<IndicatorId, 'symptoms'> => item !== 'symptoms')
  const indicator = availableIndicators.find((item) => item === selectedMetric) ?? availableIndicators[0]
  const current = indicator ? assessment?.indicators.find((item) => item.id === indicator) : undefined
  const currentRecord = records.filter((record) => record.crewId === crewId && record.day <= day).sort((left, right) => right.day - left.day)[0]
  const meta = indicator ? indicatorLabels[indicator] : undefined
  const chartData = useMemo(() => {
    if (!indicator) return []
    return records
      .filter((record) => record.crewId === crewId && record.day <= day && record.day > day - range)
      .sort((left, right) => left.day - right.day)
      .map((record) => ({ day: record.day, value: valueFor(record, indicator) ?? null }))
      .filter((entry) => entry.value !== null)
  }, [crewId, day, indicator, range, records])
  if (region === 'radiation') {
    const dose = assessment?.indicators.find((item) => item.id === 'dose')
    return (
      <section className="region-panel" aria-labelledby="region-title">
        <div className="region-panel-heading">
          <div><p className="eyebrow">HAZARD OVERLAY</p><h2 id="region-title">Radiation</h2></div>
          <span className={`status-chip status-${dataAvailable ? assessment?.radiationOverlayStatus ?? 'green' : 'empty'}`}>{dataAvailable ? statusLabel[assessment?.radiationOverlayStatus ?? 'green'] : 'No data'}</span>
        </div>
        <p className="region-description">Radiation is an environment-wide hazard, not a body region. The prototype highlights a daily peak dose that is unusually high compared with the prior seven days.</p>
        <div className="current-reading">
          <span>Current daily peak dose</span>
          <strong>{dose ? `${dose.value.toFixed(2)} mSv` : 'No reading'}</strong>
        </div>
        <div className="region-advice"><strong>What to do</strong><p>Check the mission radiation protocol and the crew&apos;s current shelter guidance. Dose thresholds require mission-specific review.</p></div>
        <a className="source-link" href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp" target="_blank" rel="noreferrer">Canadian Space Agency: radiation monitoring <span aria-hidden="true">↗</span></a>
      </section>
    )
  }

  const regionContent = content!
  const baseline = current?.baseline
  const regionStatus = statuses[region]
  const reading = currentRecord && indicator ? valueFor(currentRecord, indicator) : undefined

  return (
    <section className="region-panel" aria-labelledby="region-title">
      <div className="region-panel-heading">
        <div><p className="eyebrow">REGION DETAIL</p><h2 id="region-title">{regionContent.label}</h2></div>
        <span className={`status-chip status-${dataAvailable ? regionStatus : 'empty'}`}>{dataAvailable ? statusLabel[regionStatus] : 'No data'}</span>
      </div>
      <p className="region-description">{regionContent.why}</p>
      {availableIndicators.length > 1 && (
        <label className="metric-select"><span>Indicator to chart</span>
          <select value={indicator} onChange={(event) => setSelectedMetric(event.target.value as IndicatorId)}>
            {availableIndicators.map((item) => <option key={item} value={item}>{indicatorLabels[item]?.label ?? item}</option>)}
          </select>
        </label>
      )}
      <div className="current-reading">
        <span>{meta?.label ?? 'Daily status'}</span>
        <strong>{reading !== undefined && meta ? `${reading.toFixed(meta.precision)} ${meta.unit}` : 'No reading'}</strong>
        {currentRecord && currentRecord.day !== day && <small>Last recorded: mission day {currentRecord.day}</small>}
        {baseline && <small>Personal baseline: {baseline.median.toFixed(meta?.precision ?? 1)} {meta?.unit ?? ''} · {baseline.validDays} days</small>}
      </div>
      <p className={`region-status-copy status-text-${dataAvailable ? regionStatus : 'empty'}`}>{dataAvailable ? severityDescription(regionStatus) : 'No measurement is recorded for this mission day. Add a local check-in or switch to Demo to explore generated health patterns.'}</p>
      {indicator && (
        <div className="trend-card">
          <div className="trend-heading">
            <div><strong>Personal trend</strong><span>Daily {meta?.label.toLowerCase()} · day {day}</span></div>
            <label className="range-control"><span className="sr-only">Chart time range</span>
              <select value={range} onChange={(event) => setRange(Number(event.target.value) as 30 | 90 | 180)} aria-label="Chart time range">
                <option value={30}>30d</option><option value={90}>90d</option><option value={180}>180d</option>
              </select>
            </label>
          </div>
          <div className="trend-chart" role="img" aria-label={`${meta?.label} over ${range} mission days with personal baseline band`}>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 2, left: -18 }}>
                  <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#72e2cf" stopOpacity={0.3} /><stop offset="95%" stopColor="#72e2cf" stopOpacity={0.01} /></linearGradient></defs>
                  <CartesianGrid stroke="#263746" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#7990a2', fontSize: 10 }} tickFormatter={(value) => `D${value}`} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#7990a2', fontSize: 10 }} width={38} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: '#111e2b', border: '1px solid #314656', borderRadius: 10, color: '#e4edf4' }} labelFormatter={(value) => `Mission day ${value}`} formatter={(value) => [`${Number(value).toFixed(meta?.precision)} ${meta?.unit}`, meta?.label]} />
                  {baseline && <ReferenceArea y1={baseline.median - baseline.mad} y2={baseline.median + baseline.mad} fill="#72e2cf" fillOpacity={0.08} strokeOpacity={0} />}
                  {baseline && <ReferenceLine y={baseline.median} stroke="#72e2cf" strokeDasharray="4 4" />}
                  <Area type="monotone" dataKey="value" stroke="#72e2cf" strokeWidth={2} fill="url(#trendFill)" isAnimationActive={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">No readings in this range.</p>}
          </div>
          <div className="chart-legend"><span><i className="legend-line" /> Daily readings</span><span><i className="legend-band" /> Personal baseline band</span></div>
        </div>
      )}
      <div className="guide-grid">
        <div className="guide-block"><h3>How to check</h3><ol>{regionContent.how.map((step) => <li key={step}>{step}</li>)}</ol></div>
        <div className="guide-block"><h3>Try now</h3><ul>{regionContent.now.map((action) => <li key={action}>{action}</li>)}</ul></div>
      </div>
      <div className="region-callout"><strong>When to contact the flight surgeon</strong><p>{regionContent.call}</p></div>
      <a className="source-link" href={regionContent.sourceUrl} target="_blank" rel="noreferrer">{regionContent.sourceLabel} <span aria-hidden="true">↗</span></a>
    </section>
  )
}
