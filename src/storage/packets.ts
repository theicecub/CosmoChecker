import { get, set } from 'idb-keyval'
import type { FlightSurgeonPacket } from '../engine/packet'
import { privateDeviceStore } from './checkins'

export const PACKET_QUEUE_KEY = 'flight-surgeon-packets-v1'

export interface QueuedPacket {
  id: string
  createdAt: string
  sent: boolean
  sentAt?: string
  packet: FlightSurgeonPacket
}

export async function readPacketQueue(): Promise<QueuedPacket[]> {
  return (await get<QueuedPacket[]>(PACKET_QUEUE_KEY, privateDeviceStore)) ?? []
}

export async function enqueuePacket(packet: FlightSurgeonPacket): Promise<QueuedPacket[]> {
  const current = await readPacketQueue()
  const entry: QueuedPacket = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), sent: false, packet }
  const next = [entry, ...current]
  await set(PACKET_QUEUE_KEY, next, privateDeviceStore)
  return next
}

export async function updatePacketSent(id: string, sent: boolean): Promise<QueuedPacket[]> {
  const current = await readPacketQueue()
  const next = current.map((entry) => entry.id === id
    ? { ...entry, sent, ...(sent ? { sentAt: new Date().toISOString() } : { sentAt: undefined }) }
    : entry)
  await set(PACKET_QUEUE_KEY, next, privateDeviceStore)
  return next
}
