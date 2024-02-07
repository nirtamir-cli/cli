#! /usr/bin/env node
import { run, subcommands } from "cmd-ts";
import * as p from "@clack/prompts";
import color from "picocolors";
import { t, setLocale, getField } from "@nirtamir-cli/utils";
import { name, version } from "../package.json";
import { readConfig } from "@nirtamir-cli/utils";
import loadCommands from "./plugins/plugins_entry";
import updater from "tiny-updater";
import { createAsync } from "@nirtamir-cli/reactivity";
import {
	handleAdapter,
	handleAdd,
	handleApi,
	handleData,
	handleNew,
	handleRoute,
} from "@nirtamir-cli/commands";
const possibleActions = () =>
	[
		{ value: "add", label: t.ACTION_ADD, hint: "nirtamir-cli add ..." },
		{ value: "new", label: t.ACTION_NEW, hint: "nirtamir-cli new ..." },
		{ value: "start", label: t.ACTION_START, hint: "nirtamir-cli start ..." },
	] as const;

export const provideStartSuggestions = async () => {
	let startAction = await p.select({
		message: t.SELECT_START_ACTION,
		options: [
			{ value: "route", label: t.START_ROUTE, hint: t.START_ROUTE_HINT },
			{ value: "data", label: t.START_DATA, hint: t.START_DATA_HINT },
			{
				value: "adapter",
				label: t.START_ADAPTER,
				hint: t.START_ADAPTER_HINT,
			},
			{
				value: "api",
				label: t.START_API,
				hint: t.START_API_HINT,
			},
		],
	});
	switch (startAction) {
		case "route":
			await handleRoute();
			break;
		case "data":
			await handleData();
			break;
		case "adapter":
			await handleAdapter();
			break;
		case "api":
			await handleApi();
			break;
	}
};

const provideSuggestions = async () => {
	type ActionType = ReturnType<typeof possibleActions>[number]["value"];
	let action = (await p.select({
		message: t.SELECT_ACTION,
		// This thing really doesn't like `as const` things
		options: possibleActions() as any,
	})) as ActionType;
	if (!action) return;
	switch (action) {
		case "add":
			await handleAdd();
			break;
		case "new":
			await handleNew();
			break;
		case "start":
			await provideStartSuggestions();
			break;
	}
};

const main = async () => {
	p.intro(`\n${color.bgCyan(color.black(" nirtamir-cli "))}`);
	await readConfig();
	const needsUpdate = createAsync(async () => await updater({ name, version, ttl: 86_400_000 }));
	setLocale(getField("lang"));
	const cli = subcommands({
		name: "nirtamir-cli",
		cmds: await loadCommands(),
		version,
	});
	const args = process.argv.slice(2);

	if (args.length === 0) {
		await provideSuggestions();
		return;
	}

	if (args.length === 1 && args[0] === "start") {
		await provideStartSuggestions();
		return;
	}

	await run(cli, args);
};
main();
