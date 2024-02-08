import { open, writeFile } from "fs/promises";
import { $ } from "execa";
import { detectPackageManager, getInstallCommand } from "../package-manager";
import { readFile } from "../fs";
import deepmerge from "deepmerge";
import type { PackageJson, TsConfigJson } from "type-fest";
import { getTsconfig } from "get-tsconfig";

declare global {
	var UPDATESQUEUE: Update[] | undefined;
}
// Batch all updates here, so we can confirm with the user then flush
export const UPDATESQUEUE: Update[] = globalThis.UPDATESQUEUE ?? [];
globalThis.UPDATESQUEUE = UPDATESQUEUE;
type PackageUpdate = { type: "package"; name: string };
type DevPackageUpdate = { type: "dev-package"; name: string };
type CommandUpdate = { type: "command"; name: string };
type ScriptUpdate = { type: "script"; name: string; content: string };
type FileUpdate = { type: "file"; name: string; contents: string; checked: boolean };
type TSConfigUpdate = { type: "tsconfig"; name: string; tsconfig: Partial<TsConfigJson> };
type PackageJsonUpdate = { type: "package-json"; name: string; packageJson: Partial<PackageJson> };
// Don't bother explicitly handling plugin updates, since they're just a file update
export type Update =
	| PackageUpdate
	| CommandUpdate
	| FileUpdate
	| DevPackageUpdate
	| ScriptUpdate
	| TSConfigUpdate
	| PackageJsonUpdate;
type UpdateSummary = {
	packageUpdates: string[];
	devPackageUpdates: string[];
	commandUpdates: string[];
	fileUpdates: string[];
	scriptsUpdates: string[];
	tsconfigUpdates: string[];
	packageJsonUpdates: string[];
};

export const clearQueue = () => {
	UPDATESQUEUE.length = 0;
};
export const summarizeUpdates = (): UpdateSummary => {
	const fileUpdates = UPDATESQUEUE.filter((u) => u.type === "file").map((s) => s.name);
	const packageUpdates = UPDATESQUEUE.filter((u) => u.type === "package").map((s) => s.name);
	const devPackageUpdates = UPDATESQUEUE.filter((u) => u.type === "dev-package").map((s) => s.name);
	const commandUpdates = UPDATESQUEUE.filter((u) => u.type === "command").map((s) => s.name);
	const scriptsUpdates = UPDATESQUEUE.filter((u) => u.type === "script").map((s) => s.name);
	const tsconfigUpdates = UPDATESQUEUE.filter((u) => u.type === "tsconfig").map((s) => s.name);
	const packageJsonUpdates = UPDATESQUEUE.filter((u) => u.type === "package-json").map((s) => s.name);
	return {
		devPackageUpdates,
		packageUpdates,
		commandUpdates,
		fileUpdates,
		scriptsUpdates,
		tsconfigUpdates,
		packageJsonUpdates,
	};
};
export const queueUpdate = (update: Update) => {
	UPDATESQUEUE.push(update);
};
export const unqueueUpdate = (name: string, type: Update["type"]) => {
	const index = UPDATESQUEUE.findIndex((u) => u.name === name && u.type === type);
	if (index === -1) return;
	UPDATESQUEUE.splice(index, 1);
};
export const readQueued = (name: string) => {
	return UPDATESQUEUE.find((u) => u.name === name);
};
export const readQueuedFile = (name: string) => {
	const queued = readQueued(name);
	if (!queued || queued.type !== "file") return null;
	return queued;
};
export const flushFileUpdates = async () => {
	const fileUpdates = UPDATESQUEUE.filter((u) => u.type === "file") as FileUpdate[];

	for (const update of fileUpdates) {
		if (!update.checked) {
			await writeFile(update.name, update.contents);
			continue;
		}
		const handle = await open(update.name, "wx");
		try {
			await handle.writeFile(update.contents);
		} finally {
			await handle.close();
		}
	}
};
export const flushPackageUpdates = async () => {
	const packageUpdates = UPDATESQUEUE.filter((u) => u.type === "package") as PackageUpdate[];
	const pM = await detectPackageManager();
	const instlCmd = getInstallCommand(pM);
	for (const update of packageUpdates) {
		await $`${pM} ${instlCmd} ${update.name}`;
	}
};

export const flushDevPackageUpdates = async () => {
	const packageUpdates = UPDATESQUEUE.filter((u) => u.type === "dev-package") as PackageUpdate[];
	const pM = await detectPackageManager();
	const instlCmd = getInstallCommand(pM);
	const devFlag = "-D";
	for (const update of packageUpdates) {
		await $`${pM} ${instlCmd} ${devFlag} ${update.name}`;
	}
};

export const flushCommandUpdates = async () => {
	const commandUpdates = UPDATESQUEUE.filter((u) => u.type === "command") as CommandUpdate[];
	for (const update of commandUpdates) {
		await $`${update.name}`;
	}
};

export const flushScriptAdditions = async () => {
	const scriptUpdates = UPDATESQUEUE.filter((u) => u.type === "script") as ScriptUpdate[];

	const packageJsonFileName = "package.json";
	const packageJsonStr = (await readFile(packageJsonFileName)).toString();
	const packageJson = JSON.parse(packageJsonStr);

	const scripts = packageJson["scripts"] ?? {};
	if (scriptUpdates.length === 0) {
		return;
	}
	for (const update of scriptUpdates) {
		scripts[update.name] = update.content;
		packageJson["scripts"] = scripts;
	}

	await writeFile(packageJsonFileName, JSON.stringify(packageJson, null, 2));
};

// https://github.com/TehShrike/deepmerge
const combineMerge = (target: Array<any>, source: Array<object>, options: deepmerge.ArrayMergeOptions) => {
	const destination = target.slice();

	source.forEach((item, index) => {
		if (typeof destination[index] === "undefined") {
			destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
		} else if (options.isMergeableObject(item)) {
			destination[index] = deepmerge(target[index], item, options);
		} else if (target.indexOf(item) === -1) {
			destination.push(item);
		}
	});
	return destination;
};
export const flushTSConfigAdditions = async () => {
	const tsConfigUpdates = UPDATESQUEUE.filter((u) => u.type === "tsconfig") as TSConfigUpdate[];

	const tsConfigFileName = "tsconfig.json";
	const tsconfig = getTsconfig(tsConfigFileName) ?? {};

	const result = deepmerge.all([tsconfig, ...tsConfigUpdates.map((update) => update.tsconfig)], {
		arrayMerge: combineMerge,
	});

	await writeFile(tsConfigFileName, JSON.stringify(result, null, 2));
};
export const flushUpdatePackageJson = async () => {
	const packageJsonUpdates = UPDATESQUEUE.filter((u) => u.type === "package-json") as PackageJsonUpdate[];

	const packageJsonName = "package.json";
	const packageJsonStr = (await readFile(packageJsonName)).toString();
	const packageJson = JSON.parse(packageJsonStr) as PackageJson;

	const result = deepmerge.all([packageJson, ...packageJsonUpdates.map((update) => update.packageJson)]);

	await writeFile(packageJsonName, JSON.stringify(result, null, 2));
};

/**
 * Flushes every operation in the queue
 */
export const flushQueue = async () => {
	await flushFileUpdates();
	await flushScriptAdditions();
	await flushPackageUpdates();
	await flushCommandUpdates();
	await flushTSConfigAdditions();
	await flushUpdatePackageJson();
	clearQueue();
};
