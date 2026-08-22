import { sheetsConfig } from './config.js';
import { appendRow, nextSerialNumber } from './client.js';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function extractLeetCodeSlug(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /leetcode\.com\/problems\/([a-z0-9-]+)(?:\/|$)/i
  );
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  return null;
}

export async function resolveProblemLabel({ problemUrl, problemTitle }) {
  const slug = extractLeetCodeSlug(problemUrl || problemTitle || '');

  if (slug) {
    try {
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://leetcode.com'
        },
        body: JSON.stringify({
          query: `
            query questionTitle($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                questionFrontendId
                title
                titleSlug
              }
            }
          `,
          variables: { titleSlug: slug }
        })
      });

      if (response.ok) {
        const body = await response.json();
        const question = body?.data?.question;
        if (question?.title) {
          const id = question.questionFrontendId ?? '';
          return id ? `${id}. ${question.title}` : question.title;
        }
      }
    } catch {
      // fall through to slug-based label
    }

    return slugToTitle(slug);
  }

  const title = (problemTitle || problemUrl || '').trim();
  if (!title) {
    throw createHttpError(
      400,
      'Provide a LeetCode problem URL or title (e.g. "217. Contains Duplicate").'
    );
  }

  return title;
}

/**
 * Appends a new Problems row and a new Log row. Does not touch Topics (formulas).
 */
export async function completeDsaProblem({
  problemUrl,
  problemTitle,
  approach = '',
  trick = '',
  xp,
  comments = '',
  speedDemon = false
}) {
  const label = await resolveProblemLabel({ problemUrl, problemTitle });
  const xpValue = Number(xp);
  if (!Number.isFinite(xpValue) || xpValue < 0) {
    throw createHttpError(400, 'xp must be a non-negative number.');
  }

  const problemsTab = sheetsConfig.tabs.problems;
  const logTab = sheetsConfig.tabs.log;

  const problemSr = await nextSerialNumber(problemsTab);
  const logSr = await nextSerialNumber(logTab);

  await appendRow(problemsTab, [
    problemSr,
    label,
    approach ?? '',
    trick ?? '',
    speedDemon ? 'TRUE' : 'FALSE'
  ]);

  await appendRow(logTab, [logSr, label, xpValue, comments ?? '']);

  return {
    problemLabel: label,
    problemsSerial: problemSr,
    logSerial: logSr,
    xp: xpValue,
    speedDemon: Boolean(speedDemon)
  };
}
