import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clipboard, Download, FileText, Send, X } from 'lucide-react'
import type { SyntheticEvent } from 'react'
import { formatPacketText } from '../engine/packet'
import type { FlightSurgeonPacket } from '../engine/packet'
import type { QueuedPacket } from '../storage/packets'

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function PacketDialog({
  open,
  onClose,
  packet,
  queue,
  onQueue,
  onToggleSent,
}: {
  open: boolean
  onClose: () => void
  packet?: FlightSurgeonPacket
  queue: QueuedPacket[]
  onQueue: (packet: FlightSurgeonPacket) => Promise<unknown>
  onToggleSent: (id: string, sent: boolean) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [actionsText, setActionsText] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const exportPacket = useMemo(() => packet ? {
    ...packet,
    actionsTaken: actionsText.split('\n').map((action) => action.trim()).filter(Boolean),
  } : undefined, [actionsText, packet])
  const json = exportPacket ? JSON.stringify(exportPacket, null, 2) : ''
  const packetBytes = json ? new TextEncoder().encode(json).byteLength : 0
  const isWithinLimit = packetBytes <= 5 * 1024
  const plainText = exportPacket ? formatPacketText(exportPacket) : ''

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  useEffect(() => {
    if (!open) {
      setActionsText('')
      setNotice('')
      setSaving(false)
    }
  }, [open])

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  async function copyContent(content: string, label: string) {
    try {
      await navigator.clipboard.writeText(content)
      setNotice(`${label} copied to the clipboard.`)
    } catch {
      setNotice('Clipboard access is unavailable here. Use a download instead.')
    }
  }

  async function queueCurrentPacket() {
    if (!exportPacket || !isWithinLimit) return
    setSaving(true)
    setNotice('')
    try {
      await onQueue(exportPacket)
      setNotice('Packet queued in this browser. Nothing was transmitted.')
    } catch {
      setNotice('The packet could not be saved on this device. Check browser storage settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="packet-dialog" aria-labelledby="packet-title" onCancel={onCancel}>
      <div className="packet-shell">
        <header className="packet-header">
          <div><p className="eyebrow">LOCAL EXPORT</p><h2 id="packet-title">Flight Surgeon Packet</h2><p>Review the last seven mission days before you choose to share anything.</p></div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close packet dialog"><X aria-hidden="true" /></button>
        </header>
        <div className="packet-content">
          {exportPacket ? <>
            <div className="packet-meta"><span>DAY {exportPacket.generatedForDay}</span><span>{exportPacket.lastSevenDays.length} recorded day(s)</span><span>{packetBytes.toLocaleString()} / 5,120 bytes</span></div>
            <label className="packet-actions"><span>Actions taken <small>optional · one per line</small></span><textarea value={actionsText} maxLength={1000} rows={3} onChange={(event) => setActionsText(event.target.value)} placeholder="Add countermeasures or follow-up actions you chose…" /></label>
            {!isWithinLimit && <p className="form-error" role="alert">This export exceeds the 5 KB limit. Shorten actions taken before downloading or queuing.</p>}
            <div className="packet-action-buttons">
              <button type="button" className="secondary-button" onClick={() => void copyContent(json, 'JSON')} disabled={!isWithinLimit}><Clipboard aria-hidden="true" />Copy JSON</button>
              <button type="button" className="secondary-button" onClick={() => downloadFile(`cosmochecker-packet-day-${exportPacket.generatedForDay}.json`, json, 'application/json')} disabled={!isWithinLimit}><Download aria-hidden="true" />Download JSON</button>
              <button type="button" className="secondary-button" onClick={() => void copyContent(plainText, 'Text')}><Clipboard aria-hidden="true" />Copy text</button>
              <button type="button" className="secondary-button" onClick={() => downloadFile(`cosmochecker-packet-day-${exportPacket.generatedForDay}.txt`, plainText, 'text/plain;charset=utf-8')}><Download aria-hidden="true" />Download text</button>
            </div>
            <button type="button" className="primary-button packet-queue-button" onClick={queueCurrentPacket} disabled={!isWithinLimit || saving}><Send aria-hidden="true" />{saving ? 'Saving locally…' : 'Queue packet on this device'}</button>
            <details className="packet-preview"><summary><FileText aria-hidden="true" /> Preview plain-text packet</summary><pre>{plainText}</pre></details>
          </> : <div className="quiet-state"><span className="quiet-icon"><FileText aria-hidden="true" /></span><div><strong>No health data for this mission day</strong><p>Save an on-device check-in or switch to Demo to preview the packet structure.</p></div></div>}
          {notice && <p className="packet-notice" role="status">{notice}</p>}
          <section className="packet-queue" aria-labelledby="packet-queue-title">
            <div className="packet-queue-heading"><h3 id="packet-queue-title">Local packet queue</h3><span>{queue.length}</span></div>
            {queue.length ? <ul>{queue.map((entry) => (
              <li key={entry.id}>
                <span className="queue-item-copy"><strong>Mission day {entry.packet.generatedForDay}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></span>
                <button type="button" role="switch" aria-checked={entry.sent} className={`sent-toggle${entry.sent ? ' is-sent' : ''}`} onClick={() => void onToggleSent(entry.id, !entry.sent)}><Check aria-hidden="true" />{entry.sent ? 'Marked sent' : 'Mark sent'}</button>
              </li>
            ))}</ul> : <p className="queue-empty">Queued packets stay here until you manually mark their status.</p>}
            <p className="queue-disclaimer">This is an offline queue only. “Mark sent” is a manual status and does not transmit data.</p>
          </section>
        </div>
        <footer className="packet-footer"><span>Private by default · no automatic transmission</span><button type="button" className="secondary-button" onClick={onClose}>Done</button></footer>
      </div>
    </dialog>
  )
}
