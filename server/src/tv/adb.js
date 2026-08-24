import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getShowById, getTvSerial, tvConfig } from './config.js';
import { resolveHotstarLatestEpisode } from './hotstar.js';

const execFileAsync = promisify(execFile);

function createAdbError(message, details) {
  const error = new Error(message);
  error.status = 502;
  error.details = details;
  return error;
}

export async function runAdb(args, { timeoutMs = 15000 } = {}) {
  const adbBin = tvConfig.adbPath;

  try {
    const { stdout, stderr } = await execFileAsync(adbBin, args, {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });

    return {
      stdout: String(stdout ?? '').trim(),
      stderr: String(stderr ?? '').trim()
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createAdbError(
        `adb not found at "${adbBin}". Set TV_ADB_PATH to your adb.exe, then restart the Node server.`,
        error.message
      );
    }

    const stdout = String(error.stdout ?? '').trim();
    const stderr = String(error.stderr ?? error.message ?? '').trim();
    throw createAdbError(
      `ADB command failed: ${adbBin} ${args.join(' ')}`,
      [stdout, stderr].filter(Boolean).join('\n') || 'Unknown ADB error'
    );
  }
}

export async function connectTv() {
  const serial = getTvSerial();
  const result = await runAdb(['connect', serial]);
  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();

  if (
    combined.includes('unable to connect') ||
    combined.includes('failed to connect') ||
    combined.includes('connection refused')
  ) {
    throw createAdbError(`Could not connect to TV at ${serial}`, combined.trim());
  }

  return { serial, ...result };
}

async function shellOnTv(shellArgs) {
  const serial = getTvSerial();
  return runAdb(['-s', serial, 'shell', ...shellArgs]);
}

/**
 * Run a full shell command string on the TV (needed so deep-link URLs stay quoted).
 */
async function shellCommandOnTv(command) {
  const serial = getTvSerial();
  return runAdb(['-s', serial, 'shell', command]);
}

export async function togglePower() {
  // KEYCODE_POWER
  return shellOnTv(['input', 'keyevent', '26']);
}

export async function wakeTv() {
  // KEYCODE_WAKEUP
  return shellOnTv(['input', 'keyevent', '224']);
}

export async function goHome() {
  // KEYCODE_HOME (3). Note: 84 is KEYCODE_SEARCH, not Home.
  return shellOnTv(['input', 'keyevent', '3']);
}

export async function forceStopApp(appKey) {
  const pkg = tvConfig.packages[appKey];
  if (!pkg) {
    throw createAdbError(`Unknown TV app "${appKey}"`, 'No package configured');
  }
  return shellOnTv(['am', 'force-stop', pkg]);
}

export async function openApp(appKey) {
  const pkg = tvConfig.packages[appKey];
  if (!pkg) {
    throw createAdbError(`Unknown TV app "${appKey}"`, 'No package configured');
  }

  const component = tvConfig.launchComponents?.[appKey];
  if (component) {
    return shellOnTv(['am', 'start', '-n', component]);
  }

  try {
    return await shellOnTv([
      'monkey',
      '-p',
      pkg,
      '-c',
      'android.intent.category.LAUNCHER',
      '1'
    ]);
  } catch {
    return shellOnTv([
      'am',
      'start',
      '-a',
      'android.intent.action.MAIN',
      '-c',
      'android.intent.category.LEANBACK_LAUNCHER',
      pkg
    ]);
  }
}

function buildDeepLinkCandidates(show, preferredLinks = []) {
  const link = show.deepLink.trim();
  const candidates = [...preferredLinks, link];
  console.log('candidates', candidates);
  // Fallback only — https://www.zee5.com/... is what opens DetailsActivity on this TV
  if (show.app === 'zee5' && link.startsWith('https://')) {
    candidates.push(link.replace(/^https:\/\//, 'zee5://'));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function buildViewIntentCommand(deepLink, appKey) {
  const pkg = tvConfig.packages[appKey];
  const component = tvConfig.launchComponents?.[appKey];
  const quotedLink = deepLink.replace(/'/g, `'\\''`);

  // NEW_TASK | CLEAR_TOP so a warm Zee5 instance still receives the content URI
  const flags = '0x14000000';

  if (component) {
    return [
      'am start -W',
      '-a android.intent.action.VIEW',
      '-c android.intent.category.DEFAULT',
      '-c android.intent.category.BROWSABLE',
      `-d '${quotedLink}'`,
      `-n ${component}`,
      `-f ${flags}`
    ].join(' ');
  }

  return [
    'am start -W',
    '-a android.intent.action.VIEW',
    '-c android.intent.category.DEFAULT',
    '-c android.intent.category.BROWSABLE',
    `-d '${quotedLink}'`,
    `-p ${pkg}`,
    `-f ${flags}`
  ].join(' ');
}

export async function openShow(showId) {
  const show = getShowById(showId);
  if (!show) {
    const error = new Error(`Unknown show id "${showId}"`);
    error.status = 400;
    throw error;
  }

  const deepLink = show.deepLink?.trim();
  if (!deepLink) {
    return {
      show,
      skipped: true,
      warning: `Deep link for "${show.title}" is empty.`
    };
  }

  let preferredLinks = [];
  let resolvedEpisode = null;
  let resolveWarning;

  if (show.app === 'hotstar') {
    const resolved = await resolveHotstarLatestEpisode(deepLink);
    preferredLinks = resolved.candidates ?? [resolved.deepLink];
    resolvedEpisode = resolved.episode ?? null;
    resolveWarning = resolved.warning;
  }

  // Cold-ish start: force-stop so AppStartActivity handles the deep link cleanly
  await forceStopApp(show.app);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const attempts = [];
  let lastResult = null;
  let lastError = null;

  for (const candidate of buildDeepLinkCandidates(show, preferredLinks)) {
    const command = buildViewIntentCommand(candidate, show.app);
    try {
      console.log('command', command);
      lastResult = await shellCommandOnTv(command);
      console.log('lastResult', lastResult);
      attempts.push({ deepLink: candidate, ...lastResult });

      const combined = `${lastResult.stdout}\n${lastResult.stderr}`.toLowerCase();
      if (
        combined.includes('error') ||
        combined.includes('exception') ||
        combined.includes('unable to resolve')
      ) {
        lastError = combined.trim();
        continue;
      }

      return {
        show,
        skipped: false,
        deepLinkUsed: candidate,
        episode: resolvedEpisode,
        warning: resolveWarning,
        attempts,
        ...lastResult
      };
    } catch (error) {
      lastError = error.details || error.message;
      attempts.push({ deepLink: candidate, error: lastError });
    }
  }

  throw createAdbError(
    `Could not open "${show.title}" deep link on ${show.app}`,
    lastError || JSON.stringify(attempts)
  );
}

/** @deprecated Prefer openApp('hotstar') */
export async function openHotstar() {
  return openApp('hotstar');
}

/** @deprecated Prefer openShow('lapandav') */
export async function openLapandav() {
  return openShow('lapandav');
}
