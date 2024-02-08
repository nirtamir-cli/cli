// Taken almost verbatim from https://github.com/solidjs/solid-start/blob/f351f42ba8566cbfa72b483dd63d4debcb386230/packages/create-app/cli/index.js#L62C1-L80C2
import { detect } from "detect-package-manager";

export const detectPackageManager = async () => {
	return await detect()
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
