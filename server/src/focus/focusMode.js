import { exec } from 'node:child_process';
import { sheetsConfig } from '../sheets/config.js';

const appsToClose = [
  'Discord.exe',
  'Spotify.exe',
  'Code.exe',
  'notepad.exe'
  // Browsers intentionally not closed so LeetCode/sheet can open
];

function runDetached(command) {
  exec(command, { windowsHide: true }, (error) => {
    if (error) {
      console.warn('Focus helper:', error.message);
    }
  });
}

/**
 * Laptop focus helpers: close selected distractors, open LeetCode + DSA sheet.
 */
export function startFocusMode() {
  console.log('Starting Focus Mode…');

  for (const appName of appsToClose) {
    runDetached(`taskkill /IM "${appName}" /F`);
  }

  setTimeout(() => {
    const leetcode = sheetsConfig.leetcodeHome;
    const sheet = sheetsConfig.sheetUrl;
    runDetached(`start "" "${leetcode}"`);
    runDetached(`start "" "${sheet}"`);
    console.log('Opened LeetCode and DSA sheet.');
  }, 800);
}
