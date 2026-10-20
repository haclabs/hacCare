/**
 * Room rows for the "Multiple Rooms" launch mode: a room number plus one or
 * more instructors per room.
 */

import React from 'react';
import { DoorOpen, Plus, Trash2, X } from 'lucide-react';
import { emptyRoom, buildRoomSimulationName, type RoomEntry } from '../utils/roomLaunch';

interface InstructorOption {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface RoomLaunchListProps {
  rooms: RoomEntry[];
  onChange: (rooms: RoomEntry[]) => void;
  instructors: InstructorOption[];
  baseName: string;
}

const RoomLaunchList: React.FC<RoomLaunchListProps> = ({ rooms, onChange, instructors, baseName }) => {
  const updateRoom = (index: number, patch: Partial<RoomEntry>) => {
    onChange(rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)));
  };
  const instructorName = (id: string) => {
    const u = instructors.find(i => i.id === id);
    return u ? `${u.first_name} ${u.last_name}` : 'Unknown';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        <DoorOpen className="inline h-4 w-4 mr-1" />
        Rooms <span className="text-red-500">*</span>
      </label>
      <div className="space-y-3">
        {rooms.map((room, index) => {
          const available = instructors.filter(u => !room.instructorIds.includes(u.id));
          return (
            <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={room.roomNumber}
                  onChange={(e) => updateRoom(index, { roomNumber: e.target.value })}
                  placeholder="Room #"
                  aria-label={`Room ${index + 1} number`}
                  className="w-28 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white placeholder:text-slate-400"
                />
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) updateRoom(index, { instructorIds: [...room.instructorIds, e.target.value] });
                  }}
                  disabled={available.length === 0}
                  aria-label={`Add instructor to room ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">
                    {instructors.length === 0
                      ? 'No instructors available'
                      : available.length === 0
                        ? 'All instructors added'
                        : room.instructorIds.length === 0 ? 'Select instructor...' : 'Add another instructor...'}
                  </option>
                  {available.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange(rooms.filter((_, i) => i !== index))}
                  disabled={rooms.length === 1}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove room"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {room.instructorIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {room.instructorIds.map(id => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {instructorName(id)}
                      <button
                        type="button"
                        onClick={() => updateRoom(index, { instructorIds: room.instructorIds.filter(i => i !== id) })}
                        className="hover:text-purple-900 dark:hover:text-white"
                        title="Remove instructor"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {baseName.trim() && room.roomNumber.trim() && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Launches as: <span className="font-medium">{buildRoomSimulationName(baseName, room.roomNumber)}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      {instructors.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          No instructors are assigned to this institution or its programs. Assign one in User Management, or
          switch to the institution you're launching for.
        </p>
      )}
      <button
        type="button"
        onClick={() => onChange([...rooms, emptyRoom()])}
        className="mt-2 flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
      >
        <Plus className="h-4 w-4" />
        Add Room
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Launches one simulation per room, named "{'{'}Simulation Name{'}'} - Room {'{'}number{'}'}". Each room can have
        several instructors; any auto-generated student login below is shared across all rooms.
      </p>
    </div>
  );
};

export default RoomLaunchList;
