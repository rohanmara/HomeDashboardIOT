import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const sheetsConfig = {
  spreadsheetId:
    process.env.GOOGLE_SHEETS_ID ?? '1dKUxdCUVqzHvyv0Yk9x_uA8nPNSbnqpi0UFNaW3f6VY',
  serviceAccountFile:
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ??
    path.join(__dirname, '..', '..', 'secrets', 'google-service-account.json'),
  tabs: {
    problems: 'Problems',
    log: 'Log'
    // Topics uses formulas — never write to it
  },
  sheetUrl:
    process.env.DSA_SHEET_URL ??
    'https://docs.google.com/spreadsheets/d/1dKUxdCUVqzHvyv0Yk9x_uA8nPNSbnqpi0UFNaW3f6VY/edit',
  leetcodeHome: process.env.LEETCODE_HOME_URL ?? 'https://leetcode.com/'
};
