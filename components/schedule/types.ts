export type SlotId = '9-11' | '11-1' | '2-4:30'

export interface SlotDef {
  id: SlotId
  label: string
}

export interface Booking {
  date: string   // ISO: "2026-05-05"
  slot: SlotId
  seat: number   // 1–8
}
