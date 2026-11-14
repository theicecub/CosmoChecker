import { createStore, del, get, set } from 'idb-keyval'
import type { CrewId, DailyRecord } from '../config/types'

export interface DailyCheckIn extends DailyRecord {
  id: string
  loggedAt: string
  privateNote?: string
}

export const CHECK_INS_KEY = 'daily-checkins-v1'
export const privateDeviceStore = createStore('orbitvitals-device-data', 'private-checkins')

export async function readCheckIns(): Promise<DailyCheckIn[]> {
  return (await get<DailyCheckIn[]>(CHECK_INS_KEY, privateDeviceStore)) ?? []
}

export async function upsertCheckIn(
  record: DailyRecord,
  privateNote: string,
): Promise<DailyCheckIn[]> {
  const current = await readCheckIns()
  const nextRecord: DailyCheckIn = {
    ...record,
    id: crypto.randomUUID(),
    loggedAt: new Date().toISOString(),
    ...(privateNote.trim() ? { privateNote: privateNote.trim() } : {}),
  }
  const next = [...current.filter((item) => item.crewId !== record.crewId || item.day !== record.day), nextRecord]
    .sort((left, right) => left.day - right.day || left.crewId.localeCompare(right.crewId))
  await set(CHECK_INS_KEY, next, privateDeviceStore)
  return next
}

export async function deleteCheckIn(id: string): Promise<DailyCheckIn[]> {
  const next = (await readCheckIns()).filter((item) => item.id !== id)
  await set(CHECK_INS_KEY, next, privateDeviceStore)
  return next
}

export async function clearCheckIns(): Promise<void> {
  await del(CHECK_INS_KEY, privateDeviceStore)
}

export function hasCheckInForDay(records: DailyCheckIn[], crewId: CrewId, day: number): boolean {
  return records.some((record) => record.crewId === crewId && record.day === day)
}
