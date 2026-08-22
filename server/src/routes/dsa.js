import { Router } from 'express';
import { completeDsaProblem } from '../sheets/dsa.js';

export function createDsaRouter() {
  const router = Router();

  router.post('/complete', async (req, res, next) => {
    try {
      const result = await completeDsaProblem({
        problemUrl: req.body?.problemUrl,
        problemTitle: req.body?.problemTitle,
        approach: req.body?.approach,
        trick: req.body?.trick,
        xp: req.body?.xp,
        comments: req.body?.comments,
        speedDemon: Boolean(req.body?.speedDemon)
      });

      res.status(201).json({
        success: true,
        message: `Logged ${result.problemLabel} to Problems + Log`,
        ...result
      });
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({
          success: false,
          message: error.message
        });
        return;
      }
      next(error);
    }
  });

  return router;
}
