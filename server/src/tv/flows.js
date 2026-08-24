import { connectTv, goHome, openShow, togglePower, wakeTv } from './adb.js';
import { getShowById, listShows, tvConfig } from './config.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Accepts:
 * - 1 / '1' / 'power' → power toggle
 * - 3 / '3' / 'home' → Android TV home
 * - 2 / '2' → play show (defaults to lapandav if show omitted)
 * - show id string → play that show
 */
export function normalizeTvCommand(input, showId) {
  if (input === 1 || input === '1' || input === 'power') {
    return { type: 'power' };
  }

  if (input === 3 || input === '3' || input === 'home') {
    return { type: 'home' };
  }

  if (input === 2 || input === '2') {
    return { type: 'show', showId: showId || 'lapandav' };
  }

  if (typeof input === 'string' && getShowById(input)) {
    return { type: 'show', showId: input };
  }

  if (showId && getShowById(showId)) {
    return { type: 'show', showId };
  }

  return null;
}

/** @deprecated use normalizeTvCommand */
export function normalizeFlow(value) {
  const command = normalizeTvCommand(value);
  if (!command) {
    return null;
  }
  if (command.type === 'power') {
    return 1;
  }
  if (command.type === 'home') {
    return 3;
  }
  return 2;
}

export async function runTvFlow(flowOrShowId, showId) {
  const command = normalizeTvCommand(flowOrShowId, showId);
  if (!command) {
    const known = listShows()
      .map((show) => show.id)
      .join(', ');
    const error = new Error(
      `Invalid TV command. Use action 1 (power), 3 (home), 2 (show), or a show id (${known}).`
    );
    error.status = 400;
    throw error;
  }

  const steps = [];
  const connection = await connectTv();
  steps.push({ step: 'connect', stdout: connection.stdout, stderr: connection.stderr });

  if (command.type === 'power') {
    const power = await togglePower();
    steps.push({ step: 'togglePower', stdout: power.stdout, stderr: power.stderr });

    return {
      flow: 1,
      action: 'power',
      message: 'TV power toggled',
      target: `${tvConfig.host}:${tvConfig.port}`,
      steps
    };
  }

  if (command.type === 'home') {
    const home = await goHome();
    steps.push({ step: 'goHome', stdout: home.stdout, stderr: home.stderr });

    return {
      flow: 3,
      action: 'home',
      message: 'Sent Home key to TV',
      target: `${tvConfig.host}:${tvConfig.port}`,
      steps
    };
  }

  const show = getShowById(command.showId);
  const wake = await wakeTv();
  steps.push({ step: 'wake', stdout: wake.stdout, stderr: wake.stderr });
  await sleep(600);

  // Deep link launches the app itself. Opening the app first (especially Zee5)
  // often leaves a warm HomeActivity that ignores the content URI.
  const opened = await openShow(command.showId);
  steps.push({
    step: 'openShow',
    showId: show.id,
    app: show.app,
    deepLinkUsed: opened.deepLinkUsed,
    episode: opened.episode ?? null,
    skipped: Boolean(opened.skipped),
    warning: opened.warning,
    stdout: opened.stdout,
    stderr: opened.stderr
  });

  const episodeLabel = opened.episode
    ? opened.episode.episodeNo != null
      ? ` ep ${opened.episode.episodeNo}: ${opened.episode.title}`
      : `: ${opened.episode.title}`
    : '';

  return {
    flow: 2,
    action: 'show',
    show: {
      id: show.id,
      title: show.title,
      titleMr: show.titleMr,
      app: show.app
    },
    episode: opened.episode ?? null,
    message: opened.skipped
      ? `${show.app} opened (${show.title} deep link missing)`
      : `Opened ${show.title}${episodeLabel} on ${show.app}`,
    warning: opened.warning,
    target: `${tvConfig.host}:${tvConfig.port}`,
    steps
  };
}

export { listShows };
