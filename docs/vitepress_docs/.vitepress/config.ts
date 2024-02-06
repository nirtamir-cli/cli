import { defineConfig } from "vitepress";
import { SearchPlugin } from "vitepress-plugin-search";
// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "nirtamir-cli Docs",
	description: "Documentation for the Solid CLI",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Guide", link: "/about" },
		],

		sidebar: [
			{
				text: "Getting started",
				items: [
					{ text: "About", link: "/about" },
					{ text: "Installation", link: "/installation" },
					{ text: "Basic Commands", link: "/basic-commands" },
					{ text: "Solid-Start Commands", link: "/start-commands" },
				],
			},
			{ text: "Supported Integrations", link: "/supported-integrations" },
		],
		socialLinks: [
			{
				icon: "github",
				link: "https://github.com/nirtamir2/nirtamir-cli",
			},
		],
	},
	vite: { plugins: [SearchPlugin()] },
});
