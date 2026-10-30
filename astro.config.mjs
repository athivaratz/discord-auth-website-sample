// @ts-check
import { defineConfig } from 'astro/config';

// Dev renders each request so ?demo=in can switch the signed in state.
// The production build still prerenders a static page.
let command = 'dev';

// https://astro.build/config
export default defineConfig({
	integrations: [
		{
			name: 'dev-request-rendering',
			hooks: {
				'astro:config:setup': (options) => {
					command = options.command;
				},
				'astro:route:setup': ({ route }) => {
					if (command === 'dev') route.prerender = false;
				},
			},
		},
	],
});
