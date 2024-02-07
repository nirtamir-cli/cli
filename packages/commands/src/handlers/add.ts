import { autocomplete } from "@nirtamir-cli/ui";
import { S_BAR, cancelable, spinnerify } from "@nirtamir-cli/ui";
import { Integrations, Supported, integrations, setRootFile } from "../lib/integrations";
import * as p from "@clack/prompts";
import color from "picocolors";
import { primitives, loadPrimitives } from "@nirtamir-cli/utils/primitives";
import { t } from "@nirtamir-cli/utils";
import { fileExists, getRootFile, getViteConfig, validateFilePath } from "../lib/utils/helpers";
import { writeFile, readFile } from "@nirtamir-cli/utils/fs";
import { transformPlugins, type PluginOptions } from "@nirtamir-cli/utils/transform";
import {
	UPDATESQUEUE,
	clearQueue,
	flushCommandUpdates,
	flushFileUpdates,
	flushPackageUpdates,
	queueUpdate,
	summarizeUpdates,
	flushDevPackageUpdates,
	flushScriptAdditions,
	flushTSConfigAdditions,
	flushUpdatePackageJson,
} from "@nirtamir-cli/utils/updates";
const handleAutocompleteAdd = async () => {
	const supportedIntegrations = (Object.keys(integrations) as Supported[]).map((value) => ({ label: value, value }));
	const opts = () => [...supportedIntegrations, ...primitives()];
	loadPrimitives().catch((e) => p.log.error(e));
	const a = await cancelable(
		autocomplete({
			message: t.ADD_PACKAGES,
			options: opts,
		}),
	);

	if (a.length === 0) {
		p.log.warn(t.NOTHING_SELECTED);
		return;
	}
	const shouldInstall = await cancelable<unknown>(
		p.select({
			options: [
				{ label: t.YES, value: true },
				{ label: t.NO, value: false },
				{ label: t.YES_FORCE, value: [true, "force"] },
			],
			message: `${t.CONFIRM_INSTALL(a.length)} \n${color.red(S_BAR)} \n${color.red(S_BAR)}  ${
				" " + color.yellow(a.map((opt) => opt.label).join(" ")) + " "
			} \n${color.red(S_BAR)} `,
		}),
	);

	if (!shouldInstall) return;

	let forceTransform = false;
	if (Array.isArray(shouldInstall) && shouldInstall[1] === "force") {
		forceTransform = true;
	}
	const packages = a.map((opt) => opt.value as Supported);

	return { packages, forceTransform };
};
const isIntegration = (str: string) => {
	if (Object.keys(integrations).includes(str)) return true;
	return false;
};
/**
 * Transforms a list containing primitives, either by name or full package name, and returns the corresponding primitive objects
 */
const transformPrimitives = async (ps: string[]) => {
	if (!ps.length) return [];
	if (!primitives().length) {
		await spinnerify({
			startText: t.LOADING_PRIMITIVES,
			finishText: t.PRIMITIVES_LOADED,
			fn: loadPrimitives,
		});
	}
	const mappedInput = ps.map((p) => p.replace("@solid-primitives/", ""));
	return primitives().filter((p) => mappedInput.includes(p.value.replace("@solid-primitives/", "")));
};
type Configs = Integrations[keyof Integrations][];
export const handleAdd = async (packages?: string[], forceTransform: boolean = false) => {
	if (!packages?.length) {
		const autocompleted = await handleAutocompleteAdd();

		if (!autocompleted) return;

		packages = autocompleted.packages;
		forceTransform = autocompleted.forceTransform;
	}
	const possiblePrimitives: string[] = [];
	const configs: Configs = packages
		.map((n) => {
			if (!n) return;
			if (!isIntegration(n)) {
				possiblePrimitives.push(n);
				return;
			}
			const res = integrations[n as Supported];
			if (!res) {
				p.log.error(t.NO_SUPPORT(n));
				return;
			}
			return res;
		})
		.filter((p) => p) as Configs;

	// const viteConfig = await getViteConfig();

	for (let i = 0; i < configs.length; i++) {
		const config = configs[i];
		config.installs?.forEach((p) => queueUpdate({ type: "package", name: p }));
		config.devInstalls?.forEach((p) => queueUpdate({ type: "dev-package", name: p }));
		Object.entries(config.scripts ?? {}).forEach(([name, content]) => queueUpdate({ type: "script", name, content }));
		if (config.tsconfig) {
			queueUpdate({ type: "tsconfig", name: Object.keys(config.tsconfig).toString(), tsconfig: config.tsconfig });
		}
		if (config.packageJson) {
			queueUpdate({
				type: "package-json",
				name: Object.keys(config.packageJson).toString(),
				packageJson: config.packageJson,
			});
		}
	}
	// Queue primitives
	for (const primitive of await transformPrimitives(possiblePrimitives)) {
		queueUpdate({ type: "package", name: primitive.value });
	}

	if (!configs.length) return;

	// await spinnerify({
	// 	startText: "Processing config",
	// 	finishText: "Config processed",
	// 	fn: async () => {
	// 		const code = await transformPlugins(
	// 			configs.map((c) => c.pluginOptions).filter(Boolean) as PluginOptions[],
	// 			{ name: viteConfig, contents: (await readFile(viteConfig)).toString() },
	// 			forceTransform,
	// 			undefined,
	// 		);
	// 		writeFile(viteConfig, code);
	// 	},
	// });

	// p.log.info("Preparing post install steps for integrations");
	// let projectRoot = await getRootFile();
	// setRootFile(projectRoot);
	// if (!fileExists(projectRoot)) {
	// 	p.log.error(color.red(`Can't find root file \`${projectRoot.split("/")[1]}\`.`));
	// 	await cancelable(
	// 		p.text({
	// 			message: `Type path to root: `,
	// 			validate(value) {
	// 				if (!value.length) return `Path can not be empty`;
	// 				const path = validateFilePath(value, ["root.tsx", "index.tsx"]);
	// 				if (!path) return `File at \`${value}\` not found. Please try again`;
	// 				else setRootFile(path);
	// 			},
	// 		}),
	// 	);
	// }
	// Run our additional configs
	await spinnerify({
		startText: "Running additional config steps",
		finishText: "Additional config steps complete",
		fn: async () => {
			for (const cfg of configs) {
				await cfg.additionalConfig?.();
			}
		},
	});
	if (UPDATESQUEUE.length === 0) return;
	const {
		fileUpdates,
		packageUpdates,
		commandUpdates,
		devPackageUpdates,
		scriptsUpdates,
		tsconfigUpdates,
		packageJsonUpdates,
	} = summarizeUpdates();
	// Inspired by Qwik's CLI
	if (fileUpdates.length) p.log.message([`${color.cyan("Modify")}`, ...fileUpdates.map((f) => `  - ${f}`)].join("\n"));
	if (scriptsUpdates.length)
		p.log.message([`${color.cyan("Adding Script")}`, ...scriptsUpdates.map((f) => `  - ${f}`)].join("\n"));
	if (packageUpdates.length)
		p.log.message([`${color.cyan("Install")}`, ...packageUpdates.map((p) => `  - ${p}`)].join("\n"));
	if (packageUpdates.length)
		p.log.message([`${color.cyan("Install Dev")}`, ...devPackageUpdates.map((p) => `  - ${p}`)].join("\n"));
	if (commandUpdates.length)
		p.log.message([`${color.cyan("Run commands")}`, ...commandUpdates.map((p) => `  - ${p}`)].join("\n"));
	if (tsconfigUpdates.length)
		p.log.message([`${color.cyan("Update tsconfig.json")}`, ...tsconfigUpdates.map((p) => `  - ${p}`)].join("\n"));
	if (packageJsonUpdates.length)
		p.log.message([`${color.cyan("Update package.json")}`, ...packageJsonUpdates.map((p) => `  - ${p}`)].join("\n"));

	const confirmed = await p.confirm({ message: "Do you wish to continue?" });
	if (!confirmed || p.isCancel(confirmed)) return;
	await spinnerify({ startText: "Writing files...", finishText: "Updates written", fn: flushFileUpdates });
	await spinnerify({ startText: "Installing packages...", finishText: "Packages installed", fn: flushPackageUpdates });
	await spinnerify({
		startText: "Installing dev packages...",
		finishText: "Dev Packages installed",
		fn: flushDevPackageUpdates,
	});
	await spinnerify({ startText: "Running setup commands", finishText: "Setup commands ran", fn: flushCommandUpdates });
	await spinnerify({ startText: "Updating tsconfig", finishText: "tsconfig.json updated", fn: flushTSConfigAdditions });
	await spinnerify({ startText: "Adding scripts", finishText: "Scripts Added", fn: flushScriptAdditions });
	await spinnerify({
		startText: "Updating package.json",
		finishText: "package.json updated",
		fn: flushUpdatePackageJson,
	});
	clearQueue();
	const postInstalls = configs.filter((c) => c.postInstall);
	if (postInstalls.length === 0) return;
	p.log.message(
		`${postInstalls.length} ${
			postInstalls.length === 1 ? "package has" : "packages have"
		} post install steps that need to run.`,
	);
	const pInstallConfirmed = await p.confirm({ message: "Do you wish to continue?" });
	if (!pInstallConfirmed || p.isCancel(pInstallConfirmed)) return;
	p.log.info("Running post installs");
	// Run postInstalls
	for (const cfg of configs) {
		await cfg.postInstall?.();
	}
	p.log.success("Post install steps complete!");
	// await spinnerify({
	// 	startText: t.POST_INSTALL,
	// 	finishText: t.POST_INSTALL_COMPLETE,
	// 	fn: async () => {
	// 		for (const cfg of configs) {
	// 			await cfg.postInstall?.();
	// 		}
	// 	},
	// });
};
