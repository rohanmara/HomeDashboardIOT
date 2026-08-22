import { Router } from 'express';
import { startFocusMode } from '../focus/focusMode.js';
import { broadcastSessionUpdate } from '../realtime.js';
import {
  getActiveSession,
  mapSession,
  startSession,
  stopSession
} from '../services/sessions.js';

export function createSessionsRouter(db) {
  const router = Router();

  router.get('/active', (_req, res) => {
    res.json(mapSession(getActiveSession(db)));
  });

  router.get('/', (_req, res) => {
    const rows = db
      .prepare(
        `
        SELECT id, flow, startedAt, endedAt, durationSeconds, source
        FROM sessions
        ORDER BY startedAt DESC
        LIMIT 100
      `
      )
      .all();
    res.json(rows.map(mapSession));
  });

  router.post('/start', (req, res, next) => {
    try {
      const session = startSession(db, {
        flow: req.body?.flow,
        source: req.body?.source
      });
      broadcastSessionUpdate({ action: 'started', session });

      if (req.body?.runFocusMode !== false) {
        startFocusMode();
      }

      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  router.post('/stop', (_req, res, next) => {
    try {
      const session = stopSession(db);
      broadcastSessionUpdate({ action: 'stopped', session });
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
