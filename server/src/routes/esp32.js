import { Router } from 'express';
import { startFocusMode } from '../focus/focusMode.js';
import { broadcastSessionUpdate } from '../realtime.js';
import { toggleSession } from '../services/sessions.js';
import { listShows, normalizeTvCommand, runTvFlow } from '../tv/flows.js';

/*
 * Focus mode runs via startFocusMode() when a study session starts.
 */

export function createEsp32Router(db) {
  const router = Router();

  router.post('/event', (req, res, next) => {
    try {
      console.log('ESP32 event:', req.body);

      if (req.body?.event !== 'button_pressed') {
        res.status(400).json({
          success: false,
          message: 'Unknown event'
        });
        return;
      }

      const { action, session } = toggleSession(db, {
        flow: 'focus',
        source: 'esp32'
      });

      broadcastSessionUpdate({ action, session });

      if (action === 'started') {
        startFocusMode();
      }

      res.json({
        success: true,
        action,
        message:
          action === 'started'
            ? 'Study session started from ESP32'
            : 'Study session stopped from ESP32',
        session
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tv/shows', (_req, res) => {
    res.json({
      success: true,
      shows: listShows()
    });
  });

  router.post('/tv', async (req, res, next) => {
    try {
      console.log('ESP32 TV event:', req.body);

      const actionInput = req.body?.action ?? req.body?.flow ?? req.body?.show;
      const showId = req.body?.show ?? req.body?.showId;
      const command = normalizeTvCommand(actionInput, showId);

      if (!command) {
        res.status(400).json({
          success: false,
          message:
            'Invalid TV command. Send action: 1 (power), 3 (home), 2 with show id, or show: "<id>".',
          shows: listShows().map((show) => show.id)
        });
        return;
      }

      if (
        req.body?.event !== undefined &&
        req.body.event !== 'tv_command' &&
        req.body.event !== 'button_pressed'
      ) {
        res.status(400).json({
          success: false,
          message: 'Unknown TV event. Use event "tv_command" or omit it.'
        });
        return;
      }

      let flowArg = command.showId;
      if (command.type === 'power') {
        flowArg = 1;
      } else if (command.type === 'home') {
        flowArg = 3;
      }

      const result = await runTvFlow(flowArg, command.showId);

      res.json({
        success: true,
        flow: result.flow,
        action: result.action,
        show: result.show,
        message: result.message,
        warning: result.warning,
        details: result.steps,
        target: result.target
      });
    } catch (error) {
      if (error.status === 400 || error.status === 502) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          details: error.details
        });
        return;
      }
      next(error);
    }
  });

  return router;
}
