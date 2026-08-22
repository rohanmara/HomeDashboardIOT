import fs from 'node:fs';
import { google } from 'googleapis';
import { sheetsConfig } from './config.js';

let sheetsApi = null;

export function getSheetsClient() {
  if (sheetsApi) {
    return sheetsApi;
  }

  const keyPath = sheetsConfig.serviceAccountFile;
  if (!fs.existsSync(keyPath)) {
    const error = new Error(
      `Google service account file not found at "${keyPath}". See README for setup.`
    );
    error.status = 503;
    throw error;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

export async function readColumn(sheetName, columnLetter) {
  const sheets = getSheetsClient();
  const range = `${sheetName}!${columnLetter}:${columnLetter}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsConfig.spreadsheetId,
    range
  });
  return response.data.values ?? [];
}

export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetsConfig.spreadsheetId,
    range: `${sheetName}!A:E`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values]
    }
  });
  return response.data;
}

/** Next numeric Sr No from column A (skip header). */
export async function nextSerialNumber(sheetName) {
  const rows = await readColumn(sheetName, 'A');
  let max = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const raw = rows[index]?.[0];
    const value = Number(raw);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max + 1;
}
