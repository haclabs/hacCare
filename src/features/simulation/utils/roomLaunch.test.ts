import { describe, it, expect } from 'vitest';
import { buildRoomSimulationName, validateRooms } from './roomLaunch';

describe('buildRoomSimulationName', () => {
  it('appends the room number to the trimmed base name', () => {
    expect(buildRoomSimulationName('  Class A Morning ', ' 201 ')).toBe('Class A Morning - Room 201');
  });
});

describe('validateRooms', () => {
  it('accepts rooms with a number and at least one instructor', () => {
    expect(validateRooms([
      { roomNumber: '201', instructorIds: ['a'] },
      { roomNumber: '202', instructorIds: ['b', 'c'] },
    ])).toBeNull();
  });

  it('rejects an empty list', () => {
    expect(validateRooms([])).toMatch(/at least one room/);
  });

  it('rejects a blank room number', () => {
    expect(validateRooms([{ roomNumber: '  ', instructorIds: ['a'] }])).toMatch(/room number/);
  });

  it('rejects a room with no instructors', () => {
    expect(validateRooms([{ roomNumber: '201', instructorIds: [] }])).toMatch(/instructor/);
  });

  it('rejects duplicate room numbers, ignoring case and whitespace', () => {
    expect(validateRooms([
      { roomNumber: '201a', instructorIds: ['a'] },
      { roomNumber: ' 201A', instructorIds: ['b'] },
    ])).toMatch(/unique/);
  });
});
