export function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    flow: row.flow,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    source: row.source
  };
}

export function getActiveSession(db) {
  return db
    .prepare(
      `
      SELECT id, flow, startedAt, endedAt, durationSeconds, source
      FROM sessions
      WHERE endedAt IS NULL
      ORDER BY id DESC
      LIMIT 1
    `
    )
    .get();
}

export function startSession(db, { flow = 'focus', source = 'dashboard' } = {}) {
  const active = getActiveSession(db);
  if (active) {
    const error = new Error('A session is already active. Stop it before starting another.');
    error.status = 409;
    throw error;
  }

  const normalizedFlow = flow === 'gaming' ? 'gaming' : 'focus';
  const normalizedSource =
    source === 'esp32' || source === 'api' ? source : 'dashboard';
  const startedAt = new Date().toISOString();

  const result = db
    .prepare(
      `
      INSERT INTO sessions (flow, startedAt, source)
      VALUES (@flow, @startedAt, @source)
    `
    )
    .run({
      flow: normalizedFlow,
      startedAt,
      source: normalizedSource
    });

  return mapSession(
    db
      .prepare(
        `
        SELECT id, flow, startedAt, endedAt, durationSeconds, source
        FROM sessions
        WHERE id = ?
      `
      )
      .get(result.lastInsertRowid)
  );
}

export function stopSession(db) {
  const active = getActiveSession(db);
  if (!active) {
    const error = new Error('No active session to stop.');
    error.status = 404;
    throw error;
  }

  const endedAt = new Date().toISOString();
  const durationSeconds = Math.max(
    0,
    Math.floor((Date.parse(endedAt) - Date.parse(active.startedAt)) / 1000)
  );

  db.prepare(
    `
    UPDATE sessions
    SET endedAt = @endedAt, durationSeconds = @durationSeconds
    WHERE id = @id
  `
  ).run({
    id: active.id,
    endedAt,
    durationSeconds
  });

  return mapSession(
    db
      .prepare(
        `
        SELECT id, flow, startedAt, endedAt, durationSeconds, source
        FROM sessions
        WHERE id = ?
      `
      )
      .get(active.id)
  );
}

export function toggleSession(db, { flow = 'focus', source = 'esp32' } = {}) {
  const active = getActiveSession(db);
  if (active) {
    const session = stopSession(db);
    return { action: 'stopped', session };
  }

  const session = startSession(db, { flow, source });
  return { action: 'started', session };
}
