import { tmpdir } from "../paths";
import type { Option } from "../util-types";
import { createSignal } from "@nirtamir-cli/reactivity";
import { readFile, writeFile } from "fs/promises";
export const [primitives, setPrimitives] = createSignal<Option[]>([]);
const fetchPrimitives = async () => {
	// const result = await (
	// 	await fetch("https://registry.npmjs.com/-/v1/search?text=scope:solid-primitives&size=250.json")
	// ).json();
	//
	// const primitives: Option[] = result.objects.map((v: any) => {
	// 	const opt: Option = {
	// 		label: v.package.name.split("/")[1],
	// 		value: v.package.name,
	// 		group: "primitives",
	// 	};
	//
	// 	return opt;
	// });

	const primitives: Option[] = [
		{ label: "ts-extras", value: "ts-extras", group: "primitives" },
		{ label: "ts-pattern", value: "ts-pattern", group: "primitives" },
		{ label: "pattycake", value: "pattycake", group: "primitives" },
		{ label: "zod", value: "zod", group: "primitives" },
		{ label: "clsx", value: "clsx", group: "primitives" },
		{ label: "nanoid", value: "nanoid", group: "primitives" },
		{ label: "dayjs", value: "dayjs", group: "primitives" },
		{ label: "framer-motion", value: "framer-motion", group: "primitives" },
		{ label: "immer", value: "immer", group: "primitives" },
		{ label: "react-hook-form", value: "react-hook-form", group: "primitives" },
		{ label: "react-use", value: "react-use", group: "primitives" },
		{ label: "@tailwindcss/container-queries", value: "@tailwindcss/container-queries", group: "tailwindcss" },
		{ label: "tailwindcss-animate", value: "tailwindcss-animate", group: "tailwindcss" },
		{ label: "tailwindcss-signals", value: "tailwindcss-signals", group: "tailwindcss" },
	];

	return primitives;
};
type Cache = {
	timeCached: string;
	primitives: Option[];
};
const cache = async (primitives: Option[]) => {
	const tmp = tmpdir();
	const t = new Date();
	const cache: Cache = {
		timeCached: t.toUTCString(),
		primitives,
	};
	await writeFile(`${tmp}/primitives.json`, JSON.stringify(cache));
};
const daysSinceEpoch = (seconds: number) => {
	return seconds / (60 * 60 * 24);
};
const getCached = async () => {
	const tmp = tmpdir();
	const cached = JSON.parse((await readFile(`${tmp}/primitives.json`)).toString()) as Cache;
	const timeCached = new Date(Date.parse(cached.timeCached));
	const currentTime = new Date();
	if (daysSinceEpoch(currentTime.getTime() - timeCached.getTime()) > 1) {
		throw new Error("Stale cache");
	}
	return cached.primitives as Option[];
};
export const refetchPrimitives = async () => {
	const p = await fetchPrimitives();
	setPrimitives(p);
	await cache(p);
};
export const loadPrimitives = async () => {
	try {
		const cached = await getCached();
		setPrimitives(cached);
	} catch (e) {
		// Cannot fetch from cache, must fetch
		await refetchPrimitives();
	}
};
