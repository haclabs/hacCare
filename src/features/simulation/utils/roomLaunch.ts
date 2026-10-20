/**
 * Helpers for the "Multiple Rooms" launch mode.
 */

export interface RoomEntry {
  roomNumber: string;
  instructorIds: string[];
}

export const emptyRoom = (): RoomEntry => ({ roomNumber: '', instructorIds: [] });

export const buildRoomSimulationName = (baseName: string, roomNumber: string) =>
  `${baseName.trim()} - Room ${roomNumber.trim()}`;

/** Returns an error message, or null when every room is launchable. */
export function validateRooms(rooms: RoomEntry[]): string | null {
  if (rooms.length === 0) return 'Add at least one room';
  if (rooms.some(r => !r.roomNumber.trim())) return 'Every room needs a room number';
  if (rooms.some(r => r.instructorIds.length === 0)) return 'Every room needs at least one instructor';
  const numbers = rooms.map(r => r.roomNumber.trim().toLowerCase());
  if (new Set(numbers).size !== numbers.length) return 'Room numbers must be unique';
  return null;
}
