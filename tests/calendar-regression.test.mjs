import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { fetchCalendarEvents } from '../src/lib/server/calendar.ts';

async function parseFixture(lines) {
	const ical = [
		'BEGIN:VEVENT',
		'UID:dst-regression',
		'SUMMARY:Spieleabend',
		...lines,
		'END:VEVENT'
	].join('\r\n');

	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => ({ ok: true, text: async () => ical });
	try {
		return await fetchCalendarEvents();
	} finally {
		globalThis.fetch = originalFetch;
	}
}

test('weekly Berlin event keeps its wall-clock time after daylight saving ends', async () => {
	const events = await parseFixture([
		'DTSTART;TZID=Europe/Berlin:20261023T190000',
		'RRULE:FREQ=WEEKLY;COUNT=2'
	]);
	assert.deepEqual(
		events.map((event) => event.start.toISOString()),
		['2026-10-23T17:00:00.000Z', '2026-10-30T18:00:00.000Z']
	);
});

test('daily Berlin event keeps its wall-clock time after daylight saving begins', async () => {
	const events = await parseFixture([
		'DTSTART;TZID=Europe/Berlin:20260328T190000',
		'RRULE:FREQ=DAILY;COUNT=2'
	]);
	assert.deepEqual(
		events.map((event) => event.start.toISOString()),
		['2026-03-28T18:00:00.000Z', '2026-03-29T17:00:00.000Z']
	);
});

test('monthly Berlin event keeps its wall-clock time after daylight saving ends', async () => {
	const events = await parseFixture([
		'DTSTART;TZID=Europe/Berlin:20261002T190000',
		'RRULE:FREQ=MONTHLY;COUNT=2;BYDAY=1FR'
	]);
	assert.deepEqual(
		events.map((event) => event.start.toISOString()),
		['2026-10-02T17:00:00.000Z', '2026-11-06T18:00:00.000Z']
	);
});

function pagePaths(directory = join('src', 'routes'), route = '') {
	const paths = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			paths.push(...pagePaths(join(directory, entry.name), join(route, entry.name)));
		} else if (entry.name === '+page.svelte') {
			paths.push(route ? `/${route}/` : '/');
		}
	}
	return paths;
}

test('every page and every internal link has a directly loadable static URL', () => {
	const origin = 'https://www.spieletreff-tecklenburgerland.de';
	const pages = pagePaths();
	assert.ok(pages.length > 1, 'no subpages found');

	for (const page of pages) {
		const pageFile = join('build', page.slice(1), 'index.html');
		assert.ok(existsSync(pageFile), `${page} has no index.html`);

		const html = readFileSync(pageFile, 'utf8');
		for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
			const target = new URL(href, new URL(page, origin));
			if (target.origin !== origin) continue;

			const path = decodeURIComponent(target.pathname).slice(1);
			const file = target.pathname.endsWith('/')
				? join('build', path, 'index.html')
				: join('build', path);
			assert.ok(existsSync(file), `${page} links to unavailable ${target.pathname}`);
		}
	}
});
