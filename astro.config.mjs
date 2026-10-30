// @ts-check
import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	session: false,
	devToolbar: { enabled: false },
	adapter: cloudflare({ imageService: 'passthrough' }),
});
