import { Server } from 'socket.io';
import { getActiveSession, mapSession } from './services/sessions.js';

let io = null;
let dbRef = null;

export function initRealtime(httpServer, db) {
  dbRef = db;
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const activeSession = mapSession(getActiveSession(dbRef));
    socket.emit('session:updated', {
      action: 'sync',
      session: activeSession,
      activeSession
    });
  });

  return io;
}

export function broadcastSessionUpdate({ action, session }) {
  if (!io) {
    return;
  }

  const activeSession =
    action === 'started' ? session : mapSession(getActiveSession(dbRef));

  io.emit('session:updated', {
    action,
    session,
    activeSession: action === 'stopped' ? null : activeSession
  });
}
