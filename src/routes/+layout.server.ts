import { fetchCalendarEvents } from '#lib/server/calendar.js';
import type { LayoutServerLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: LayoutServerLoad = async () => {
	const events = await fetchCalendarEvents();
	return { events };
};
