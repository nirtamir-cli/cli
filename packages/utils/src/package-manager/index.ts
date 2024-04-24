import { detectAgent } from "@skarab/detect-package-manager";

export const detectPackageManager = async () => {
	const agent = await detectAgent();
	return agent == null ? "pnpm" : agent.name;
};

export const getInstallCommand = (packageManager: PackageManager): string => {
	switch (packageManager) {
		case "npm":
			return "install";
		case "yarn":
			return "add";
		case "pnpm":
			return "add";
		case "bun":
			return "add";
	}
};

export const getRunnerCommand = (packageManager: PackageManager) => {
	switch (packageManager) {
		case "npm":
			return "npx";
		case "yarn":
			return "npx";
		case "pnpm":
			return "pnpx";
		case "bun":
			return "bunx";
	}
};

export type PackageManager = Awaited<ReturnType<typeof detectPackageManager>>;
