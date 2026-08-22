import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const apiUrl = process.env.TV_API_URL ?? 'http://127.0.0.1:3000/esp32/tv';
const showsUrl = process.env.TV_SHOWS_URL ?? 'http://127.0.0.1:3000/esp32/tv/shows';

async function fetchShows() {
  const response = await fetch(showsUrl);
  if (!response.ok) {
    throw new Error(`Could not load shows (${response.status})`);
  }
  const body = await response.json();
  return body.shows ?? [];
}

async function resolveCommand(shows) {
  const fromArg = process.argv[2];
  if (fromArg === '1' || fromArg === 'power') {
    return { action: 1 };
  }

  if (fromArg && fromArg !== '2') {
    const match = shows.find((show) => show.id === fromArg);
    if (!match) {
      throw new Error(
        `Unknown show "${fromArg}". Known ids: ${shows.map((show) => show.id).join(', ')}`
      );
    }
    return { action: 2, show: match.id };
  }

  const rl = readline.createInterface({ input, output });
  try {
    console.log('1) power');
    shows.forEach((show, index) => {
      console.log(`${index + 2}) ${show.id} — ${show.title} (${show.app})`);
    });

    const answer = (
      await rl.question('Enter number or show id: ')
    ).trim();

    if (answer === '1' || answer === 'power') {
      return { action: 1 };
    }

    const asNumber = Number(answer);
    if (Number.isInteger(asNumber) && asNumber >= 2 && asNumber <= shows.length + 1) {
      return { action: 2, show: shows[asNumber - 2].id };
    }

    const match = shows.find((show) => show.id === answer);
    if (match) {
      return { action: 2, show: match.id };
    }

    throw new Error('Please enter 1 (power) or a listed show.');
  } finally {
    rl.close();
  }
}

async function main() {
  const shows = await fetchShows();
  const payload = await resolveCommand(shows);

  console.log(`Posting to ${apiUrl} ...`, payload);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device: 'CLI',
      event: 'tv_command',
      ...payload
    })
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  console.log(JSON.stringify(body, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
