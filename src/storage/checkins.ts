import { createStore, del, get, keys, set } from 'idb-keyval'
import type { CrewId, DailyRecord } from '../config/types'

export interface DailyCheckIn extends DailyRecord {
  id: string
  loggedAt: string
  privateNote?: string
}

export const CHECK_INS_KEY = 'daily-checkins-v1'
export const privateDeviceStore = createStore('cosmochecker-device-data', 'private-checkins')
const legacyDeviceStore = createStore('orbitvitals-device-data', 'private-checkins')
const DEVICE_STORE_MIGRATION_KEY = '__legacy-device-store-migrated-v1__'

let deviceStoreMigration: Promise<void> | undefined

export function ensureDeviceStoreMigrated(): Promise<void> {
  if (!deviceStoreMigration) {
    deviceStoreMigration = migrateLegacyDeviceStore()
  }
  return deviceStoreMigration
}

async function migrateLegacyDeviceStore(): Promise<void> {
  if (await get<boolean>(DEVICE_STORE_MIGRATION_KEY, privateDeviceStore)) return

  for (const key of await keys(legacyDeviceStore)) {
    const value = await get(key, legacyDeviceStore)
    if (value !== undefined && await get(key, privateDeviceStore) === undefined) {
      await set(key, value, privateDeviceStore)
    }
  }

  await set(DEVICE_STORE_MIGRATION_KEY, true, privateDeviceStore)
}

export async function readCheckIns(): Promise<DailyCheckIn[]> {
  await ensureDeviceStoreMigrated()
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
  await ensureDeviceStoreMigrated()
  await del(CHECK_INS_KEY, privateDeviceStore)
}

export function hasCheckInForDay(records: DailyCheckIn[], crewId: CrewId, day: number): boolean {
  return records.some((record) => record.crewId === crewId && record.day === day)
}
