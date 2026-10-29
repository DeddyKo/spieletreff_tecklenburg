import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { relative, sep } from 'node:path';
import { defineConfig } from 'vite';

const rawBasePath = process.env.BASE_PATH ?? '';
if (rawBasePath !== '' && !rawBasePath.startsWith('/')) {
	throw new Error('BASE_PATH must be empty or start with /');
}
const basePath = rawBasePath as '' | `/${string}`;

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: ({ filename }) => {
					const relativePath = relative(import.meta.dirname, filename);
					const pathSegments = relativePath.toLowerCase().split(sep);
					return pathSegments.includes('node_modules') ? undefined : true;
				}
			},
			paths: {
				base: basePath,
				origin: 'https://www.spieletreff-tecklenburgerland.de'
			}
		})
	]
});
