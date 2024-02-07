import { readFile, writeFile } from "@nirtamir-cli/utils/fs";
import * as p from "@clack/prompts";
import { cancelable } from "@nirtamir-cli/ui";

export const supportedAdapters = [
	"aws",
	"cloudflare-pages",
	"cloudflare-workers",
	"deno",
	"netlify",
	"node",
	"static",
	"vercel",
] as const;

type SupportedAdapters = (typeof supportedAdapters)[number];

const handleAutocompleteAdapter = async () => {
	const name = (await cancelable(
		p.select({
			message: "Select an adapter",
			options: supportedAdapters.map((a) => ({ value: a, label: a })),
		}),
	)) as SupportedAdapters;
	await handleAdapter(name, true);
};

export const handleAdapter = async (name?: string, forceTransform = false) => {
	if (!name) {
		await handleAutocompleteAdapter();
	}
};
