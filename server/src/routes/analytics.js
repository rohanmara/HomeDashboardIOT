import { Router } from 'express';

/**
 * Analytics ranges mean calendar periods ("this day/week/month/year"),
 * not rolling lookbacks.
 * Week starts on Monday (ISO).
 */

function startOfLocalDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfLocalDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeekMonday(date) {
  const copy = startOfLocalDay(date);
  const day = copy.getDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - daysFromMonday);
  return copy;
}

function endOfWeekSunday(date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfLocalDay(end);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toHourKey(date) {
  return `${toDateKey(date)}T${pad2(date.getHours())}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

function monthLabel(monthIndex) {
  return new Date(2000, monthIndex, 1).toLocaleString(undefined, { month: 'short' });
}

function dayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getRangeBounds(range, now = new Date()) {
  switch (range) {
    case 'day':
      return {
        rangeStart: startOfLocalDay(now),
        rangeEnd: endOfLocalDay(now),
        granularity: 'hour'
      };
    case 'week':
      return {
        rangeStart: startOfWeekMonday(now),
        rangeEnd: endOfWeekSunday(now),
        granularity: 'day'
      };
    case 'month':
      return {
        rangeStart: startOfMonth(now),
        rangeEnd: endOfMonth(now),
        granularity: 'day'
      };
    case 'year':
      return {
        rangeStart: startOfYear(now),
        rangeEnd: endOfYear(now),
        granularity: 'month'
      };
    default:
      return {
        rangeStart: startOfWeekMonday(now),
        rangeEnd: endOfWeekSunday(now),
        granularity: 'day'
      };
  }
}

function buildEmptyBuckets(range, rangeStart, rangeEnd) {
  const buckets = [];

  if (range === 'day') {
    for (let hour = 0; hour < 24; hour += 1) {
      const date = new Date(rangeStart);
      date.setHours(hour, 0, 0, 0);
      buckets.push({
        key: toHourKey(date),
        label: hourLabel(hour),
        totalSeconds: 0,
        sessionCount: 0
      });
    }
    return buckets;
  }

  if (range === 'year') {
    for (let month = 0; month < 12; month += 1) {
      const date = new Date(rangeStart.getFullYear(), month, 1);
      buckets.push({
        key: toMonthKey(date),
        label: monthLabel(month),
        totalSeconds: 0,
        sessionCount: 0
      });
    }
    return buckets;
  }

  // week or month — one bar per calendar day in the period
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    buckets.push({
      key: toDateKey(cursor),
      label: dayLabel(cursor),
      totalSeconds: 0,
      sessionCount: 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function bucketKeyForSession(session, granularity) {
  const started = new Date(session.startedAt);
  if (granularity === 'hour') {
    return toHourKey(started);
  }
  if (granularity === 'month') {
    return toMonthKey(started);
  }
  return toDateKey(started);
}

/**
 * For hour charts, split session duration across hours it covers.
 * For day/month charts, attribute full duration to the start bucket.
 */
function distributeSession(session, granularity, rangeStart, rangeEnd, bucketMap) {
  const duration = session.durationSeconds ?? 0;
  if (duration <= 0 || !session.startedAt || !session.endedAt) {
    return;
  }

  if (granularity !== 'hour') {
    const key = bucketKeyForSession(session, granularity);
    const bucket = bucketMap.get(key);
    if (!bucket) {
      return;
    }
    bucket.totalSeconds += duration;
    bucket.sessionCount += 1;
    return;
  }

  const sessionStart = new Date(session.startedAt);
  const sessionEnd = new Date(session.endedAt);
  const clipStart = new Date(Math.max(sessionStart.getTime(), rangeStart.getTime()));
  const clipEnd = new Date(Math.min(sessionEnd.getTime(), rangeEnd.getTime()));
  if (clipEnd <= clipStart) {
    return;
  }

  let countedTowardSession = false;
  let cursor = new Date(clipStart);
  cursor.setMinutes(0, 0, 0);

  while (cursor < clipEnd) {
    const hourEnd = new Date(cursor);
    hourEnd.setHours(cursor.getHours() + 1, 0, 0, 0);
    const overlapStart = Math.max(cursor.getTime(), clipStart.getTime());
    const overlapEnd = Math.min(hourEnd.getTime(), clipEnd.getTime());
    const overlapSeconds = Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));

    if (overlapSeconds > 0) {
      const key = toHourKey(cursor);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.totalSeconds += overlapSeconds;
        if (!countedTowardSession) {
          bucket.sessionCount += 1;
          countedTowardSession = true;
        }
      }
    }

    cursor = hourEnd;
  }
}

function mapSession(row) {
  return {
    id: row.id,
    flow: row.flow,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    source: row.source
  };
}

export function createAnalyticsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const rangeParam = String(req.query.range ?? 'week');
    const allowed = new Set(['day', 'week', 'month', 'year']);
    const range = allowed.has(rangeParam) ? rangeParam : 'week';
    const now = new Date();
    const { rangeStart, rangeEnd, granularity } = getRangeBounds(range, now);

    const sessions = db
      .prepare(
        `
        SELECT id, flow, startedAt, endedAt, durationSeconds, source
        FROM sessions
        WHERE endedAt IS NOT NULL
          AND startedAt <= @rangeEnd
          AND endedAt >= @rangeStart
        ORDER BY startedAt DESC
      `
      )
      .all({
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      });

    const buckets = buildEmptyBuckets(range, rangeStart, rangeEnd);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    for (const session of sessions) {
      distributeSession(session, granularity, rangeStart, rangeEnd, bucketMap);
    }

    const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.totalSeconds, 0);
    const sessionCount = sessions.length;
    const averageSeconds =
      sessionCount === 0 ? 0 : Math.round(totalSeconds / sessionCount);

    res.json({
      range,
      granularity,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalSeconds,
      sessionCount,
      averageSeconds,
      buckets: buckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        totalSeconds: bucket.totalSeconds,
        sessionCount: bucket.sessionCount
      })),
      sessions: sessions.slice(0, 20).map(mapSession)
    });
  });

  return router;
}
