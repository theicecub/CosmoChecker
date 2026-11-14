import useSWR from 'swr'
import type { DailyRecord } from '../config/types'
import { CHECK_INS_KEY, readCheckIns, upsertCheckIn } from './checkins'
import type { DailyCheckIn } from './checkins'

export function useCheckIns() {
  const { data, error, isLoading, mutate } = useSWR(CHECK_INS_KEY, readCheckIns, { fallbackData: [] })

  async function save(record: DailyRecord, privateNote: string): Promise<DailyCheckIn> {
    const next = await upsertCheckIn(record, privateNote)
    await mutate(next, false)
    return next.find((item) => item.crewId === record.crewId && item.day === record.day)!
  }

  return { checkIns: data ?? [], error, isLoading, save, mutate }
}
