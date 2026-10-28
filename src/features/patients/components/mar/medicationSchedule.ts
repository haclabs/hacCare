/** Next scheduled dose for a newly created medication, from its frequency and administration time(s). */
export function calculateNextDue(
  frequency: string,
  _startDate: string,
  adminTime: string,
  adminTimes?: string[]
): string {
  if (!adminTime) return new Date().toISOString();

  const now = new Date();

  if (
    (frequency.includes('time daily') || frequency.includes('times daily')) &&
    !frequency.includes('PRN') &&
    adminTimes &&
    adminTimes.length > 0
  ) {
    const todayTimes = adminTimes
      .map((time) => {
        const [h, m] = time.split(':').map(Number);
        const t = new Date(now);
        t.setHours(h, m, 0, 0);
        return t;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    for (const t of todayTimes) {
      if (t > now) return t.toISOString();
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [fh, fm] = adminTimes[0].split(':').map(Number);
    tomorrow.setHours(fh, fm, 0, 0);
    return tomorrow.toISOString();
  }

  const [hours, minutes] = adminTime.split(':').map(Number);

  switch (frequency) {
    case 'Once daily': {
      const todayAdmin = new Date(now);
      todayAdmin.setHours(hours, minutes, 0, 0);
      if (todayAdmin > now) return todayAdmin.toISOString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);
      return tomorrow.toISOString();
    }
    case 'Once monthly': {
      const todayAdmin = new Date(now);
      todayAdmin.setHours(hours, minutes, 0, 0);
      if (todayAdmin > now) return todayAdmin.toISOString();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setHours(hours, minutes, 0, 0);
      return nextMonth.toISOString();
    }
    case 'Twice daily': {
      const first = new Date(now);
      first.setHours(hours, minutes, 0, 0);
      const second = new Date(first);
      second.setHours(hours + 12, minutes, 0, 0);
      if (second.getDate() !== first.getDate()) {
        second.setDate(second.getDate() - 1);
        second.setHours(second.getHours() - 12);
      }
      if (now < first) return first.toISOString();
      if (now < second) return second.toISOString();
      const next = new Date(first);
      next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case 'Three times daily': {
      const times = Array.from({ length: 3 }, (_, i) => {
        const t = new Date(now);
        t.setHours(hours + i * 8, minutes, 0, 0);
        if (t.getDate() !== now.getDate() && i > 0) {
          t.setDate(t.getDate() - 1);
          t.setHours(t.getHours() - 24);
        }
        return t;
      });
      const next = times.find((t) => t > now);
      if (next) return next.toISOString();
      const nextDay = new Date(times[0]);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString();
    }
    case 'Four times daily': {
      const times = Array.from({ length: 4 }, (_, i) => {
        const t = new Date(now);
        t.setHours(hours + i * 6, minutes, 0, 0);
        if (t.getDate() !== now.getDate() && i > 0) {
          t.setDate(t.getDate() - 1);
          t.setHours(t.getHours() - 24);
        }
        return t;
      });
      const next = times.find((t) => t > now);
      if (next) return next.toISOString();
      const nextDay = new Date(times[0]);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString();
    }
    case 'Every 4 hours':
    case 'Every 6 hours':
    case 'Every 8 hours':
    case 'Every 12 hours': {
      const intervalHours = parseInt(frequency.match(/\d+/)?.[0] || '24');
      const nextDose = new Date(now);
      nextDose.setHours(hours, minutes, 0, 0);
      if (nextDose <= now) {
        nextDose.setTime(nextDose.getTime() + intervalHours * 60 * 60 * 1000);
      }
      return nextDose.toISOString();
    }
    default: {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hours, minutes, 0, 0);
      return next.toISOString();
    }
  }
}
