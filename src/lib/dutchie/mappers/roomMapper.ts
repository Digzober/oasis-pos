import type { DutchieRoom } from '../types'

export interface MappedRoom {
  location_id: string
  name: string
  room_types: string[]
  external_id: string
  is_active: boolean
}

export interface MappedSubroom {
  room_id: string | null
  name: string
  external_id: string
  is_active: boolean
}

export interface MappedRoomResult {
  room: MappedRoom
  subrooms: MappedSubroom[]
}

const ROOM_TYPE_MAP: Record<string, string> = {
  sales: 'sales_floor',
  'sales floor': 'sales_floor',
  sales_floor: 'sales_floor',
  vault: 'vault',
  safe: 'vault',
  quarantine: 'quarantine',
  hold: 'quarantine',
  storage: 'storage',
  back: 'storage',
  backroom: 'storage',
  display: 'display',
}

export function mapRoom(
  source: DutchieRoom,
  locationId: string,
): MappedRoomResult {
  const normalizedType = source.roomType?.toLowerCase().trim() ?? ''
  const resolvedType = ROOM_TYPE_MAP[normalizedType] ?? normalizedType || 'storage'

  const room: MappedRoom = {
    location_id: locationId,
    name: source.roomName,
    room_types: [resolvedType],
    external_id: String(source.roomId),
    is_active: true,
  }

  const subrooms: MappedSubroom[] = (source.subRooms ?? []).map((sub) => ({
    room_id: null,
    name: sub.subRoomName,
    external_id: String(sub.subRoomId),
    is_active: true,
  }))

  return { room, subrooms }
}
