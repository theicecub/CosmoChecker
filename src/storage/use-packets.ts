import useSWR from 'swr'
import type { FlightSurgeonPacket } from '../engine/packet'
import { PACKET_QUEUE_KEY, enqueuePacket, readPacketQueue, updatePacketSent } from './packets'

export function usePackets() {
  const { data, error, isLoading, mutate } = useSWR(PACKET_QUEUE_KEY, readPacketQueue, { fallbackData: [] })

  async function enqueue(packet: FlightSurgeonPacket) {
    const next = await enqueuePacket(packet)
    await mutate(next, false)
    return next[0]
  }

  async function setSent(id: string, sent: boolean) {
    const next = await updatePacketSent(id, sent)
    await mutate(next, false)
  }

  return { packets: data ?? [], error, isLoading, enqueue, setSent }
}
