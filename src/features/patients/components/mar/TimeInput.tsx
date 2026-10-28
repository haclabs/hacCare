import { normalizeTimeTyping } from './timeTyping';

/** HH:MM text input with a 15-minute picker overlay, shared by the medication forms. */
export function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const handleChange = (raw: string) => {
    onChange(normalizeTimeTyping(raw, value));
  };

  const handleBlur = (raw: string) => {
    const match = raw.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (match) {
      const h = Math.min(parseInt(match[1]), 23).toString().padStart(2, '0');
      const m = Math.min(parseInt(match[2] || '0'), 59).toString().padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => handleBlur(e.target.value)}
        placeholder="HH:MM"
        maxLength={5}
        required
        className="w-full px-3 py-2.5 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
      >
        <option value="">Select</option>
        {Array.from({ length: 24 }, (_, hour) =>
          ['00', '15', '30', '45'].map((min) => {
            const tv = `${hour.toString().padStart(2, '0')}:${min}`;
            return (
              <option key={tv} value={tv}>
                {tv}
              </option>
            );
          })
        ).flat()}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
