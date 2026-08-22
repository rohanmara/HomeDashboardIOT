import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const defaultAdbCandidates = [
  process.env.TV_ADB_PATH,
  process.env.ADB_PATH,
  path.join(
    os.homedir(),
    'Downloads',
    'platform-tools-latest-windows',
    'platform-tools',
    'adb.exe'
  ),
  path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  'C:\\Android\\platform-tools\\adb.exe',
  'C:\\platform-tools\\adb.exe'
].filter(Boolean);

function resolveAdbPath() {
  for (const candidate of defaultAdbCandidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore invalid paths
    }
  }

  return process.platform === 'win32' ? 'adb.exe' : 'adb';
}

/** @typedef {'hotstar' | 'zee5'} TvApp */

/**
 * @typedef {object} TvShow
 * @property {string} id
 * @property {string} title
 * @property {string} titleMr
 * @property {TvApp} app
 * @property {string} deepLink
 */

/** @type {TvShow[]} */
export const tvShows = [
  {
    id: 'lapandav',
    title: 'Lapandav',
    titleMr: 'लपंडाव',
    app: 'hotstar',
    deepLink:
      process.env.TV_LAPANDAV_DEEPLINK ??
      'https://www.hotstar.com/in/shows/lapandav/1260148964'
  },
  {
    id: 'aamchya-ladkya-naik-bai',
    title: 'Aamchya Ladkya Naik Bai',
    titleMr: 'आमच्या लाडक्या नाईक बाई',
    app: 'hotstar',
    deepLink: 'https://www.hotstar.com/in/shows/aamchya-ladkya-naik-bai/1271659292'
  },
  {
    id: 'suna-yeti-ghara',
    title: 'Suna Yeti Ghara',
    titleMr: 'सुना येती घरा',
    app: 'hotstar',
    deepLink: 'https://www.hotstar.com/in/shows/suna-yeti-ghara/1271645451'
  },
  {
    id: 'tharala-tar-mag',
    title: 'Tharala Tar Mag',
    titleMr: 'ठरलं तर मग',
    app: 'hotstar',
    deepLink: 'https://www.hotstar.com/in/shows/tharala-tar-mag/1260124795'
  },
  {
    id: 'kamali',
    title: 'Kamali',
    titleMr: 'कमली',
    app: 'zee5',
    deepLink: 'https://www.zee5.com/tv-shows/details/kamali/0-6-4z5761692'
  },
  {
    id: 'savalyachi-janu-savali',
    title: 'Savalyachi Janu Savali',
    titleMr: 'सावळ्याची जणू सावली',
    app: 'zee5',
    deepLink:
      'https://www.zee5.com/tv-shows/details/savalyachi-janu-savali/0-6-4z5612147'
  },
  {
    id: 'sanai-chaughade',
    title: 'Sanai Chaughade',
    titleMr: 'सनई चौघडे',
    app: 'zee5',
    deepLink: 'https://www.zee5.com/tv-shows/details/sanai-chaughade/0-6-4z5922558'
  },
  {
    id: 'veen-doghatli-hi-tutena',
    title: 'Veen Doghatli Hi Tutena',
    titleMr: 'वीण दोघातली ही तुटेना',
    app: 'zee5',
    deepLink:
      'https://www.zee5.com/tv-shows/details/veen-doghatli-hi-tutena/0-6-4z5789800'
  },
  {
    id: 'devmanus-madhla-adhyay',
    title: 'Devmanus Madhla Adhyay',
    titleMr: 'देवमाणूस मधला अध्याय',
    app: 'zee5',
    deepLink:
      'https://www.zee5.com/tv-shows/details/devmanus-madhla-adhyay/0-6-4z5746086'
  },
  {
    id: 'lakshmi-niwas',
    title: 'Lakshmi Niwas',
    titleMr: 'लक्ष्मी निवास',
    app: 'zee5',
    deepLink: 'https://www.zee5.com/tv-shows/details/lakshmi-niwas/0-6-4z5666067'
  },
  {
    id: 'shubh-shravanii',
    title: 'Shubh Shravanii',
    titleMr: 'शुभ श्रावणी',
    app: 'zee5',
    deepLink: 'https://www.zee5.com/tv-shows/details/shubh-shravanii/0-6-4z5878839'
  }
];

export const tvConfig = {
  host: process.env.TV_ADB_HOST ?? '192.168.0.2',
  port: Number(process.env.TV_ADB_PORT ?? 5555),
  packages: {
    hotstar: process.env.TV_HOTSTAR_PACKAGE ?? 'in.startv.hotstar',
    zee5: process.env.TV_ZEE5_PACKAGE ?? 'com.graymatrix.did'
  },
  // Explicit launch activities (from dumpsys on the TV)
  launchComponents: {
    zee5:
      process.env.TV_ZEE5_COMPONENT ??
      'com.graymatrix.did/com.zee5.android.launch.presentation.AppStartActivity'
  },
  adbPath: resolveAdbPath(),
  shows: tvShows
};

export function getTvSerial() {
  return `${tvConfig.host}:${tvConfig.port}`;
}

export function getShowById(showId) {
  if (!showId) {
    return null;
  }
  return tvConfig.shows.find((show) => show.id === showId) ?? null;
}

export function listShows() {
  return tvConfig.shows.map(({ id, title, titleMr, app, deepLink }) => ({
    id,
    title,
    titleMr,
    app,
    deepLink
  }));
}
