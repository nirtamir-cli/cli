import { insertAfter, insertAtBeginning, insertAtEnd, writeFile } from "@nirtamir-cli/utils/fs";
import { fileExists, validateFilePath } from "./utils/helpers";
import { $ } from "execa";
import { getRunnerCommand, detectPackageManager } from "@nirtamir-cli/utils/package-manager";
import { createSignal } from "@nirtamir-cli/reactivity";
import * as p from "@clack/prompts";
import color from "picocolors";
import { cancelable } from "@nirtamir-cli/ui";
import { PluginOptions } from "@chialab/esbuild-plugin-meta-url";
import { flushQueue } from "@nirtamir-cli/utils/updates";
import { readFile } from "fs/promises";
import type { PackageJson, TsConfigJson } from "type-fest";

// All the integrations/packages that we support
export type Supported = keyof typeof integrations;

export type IntegrationsValue = {
	pluginOptions?: PluginOptions;
	installs?: string[];
	scripts?: Record<string, string>;
	devInstalls?: string[];
	additionalConfig?: () => Promise<void>;
	postInstall?: () => Promise<void>;
	tsconfig?: Partial<TsConfigJson>;
	packageJson?: Partial<PackageJson>;
};

export type Integrations = Record<Supported, IntegrationsValue>;

export const [rootFile, setRootFile] = createSignal<string | undefined>(undefined);

export const integrations = {
	// "tailwind": {
	// 	installs: ["tailwindcss", "postcss", "autoprefixer"],
	// 	postInstall: async () => {
	// 		const pM = detectPackageManager();
	// 		await $`${getRunnerCommand(pM)} tailwindcss init -p`;
	// 		let tailwindConfig = "tailwind.config.js";
	// 		if (!fileExists(tailwindConfig)) {
	// 			p.log.error(color.red(`Can't find tailwind config file`));
	// 			await cancelable(
	// 				p.text({
	// 					message: `Type path to tailwind config: `,
	// 					validate(value) {
	// 						if (!value.length) return `Path can not be empty`;
	// 						const path = validateFilePath(value, "tailwind.config");
	// 						if (!path) return `Tailwind config at \`${value}\` not found. Please try again`;
	// 						else {
	// 							tailwindConfig = path;
	// 						}
	// 					},
	// 				}),
	// 			);
	// 		}
	//
	// 		let indexCss = "./src/index.css";
	// 		if (!fileExists(indexCss)) {
	// 			p.log.error(color.red(`Can't find index.css`));
	// 			await cancelable(
	// 				p.text({
	// 					message: `Type path to index.css: `,
	// 					validate(value) {
	// 						if (!value.length) return `Path can not be empty`;
	// 						const path = validateFilePath(value, "index.css");
	// 						if (!path) return `index.css at \`${value}\` not found. Please try again`;
	// 						else {
	// 							indexCss = path;
	// 						}
	// 					},
	// 				}),
	// 			);
	// 		}
	// 		p.log.info("Updating tailwind config");
	// 		await insertAfter(tailwindConfig, "content: [", '"./index.html", "./src/**/*.{js,ts,jsx,tsx}"');
	// 		await insertAtBeginning(indexCss, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
	// 		// Instantly flush queue
	// 		await flushQueue();
	// 	},
	// },
	"prettier": {
		devInstalls: [
			"prettier",
			"prettier-plugin-tailwindcss",
			"@trivago/prettier-plugin-sort-imports",
			"prettier-plugin-packagejson",
		],
		scripts: {
			format: 'prettier "**/*" --write --ignore-unknown',
		},
		additionalConfig: async () => {
			writeFile(
				".prettierrc.mjs",
				`export default {
  plugins: [
    "prettier-plugin-packagejson",
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss", // must come last
  ],
  // @see https://github.com/tailwindlabs/prettier-plugin-tailwindcss#resolving-your-tailwind-configuration
  tailwindConfig: "./tailwind.config.ts",
  // @see https://github.com/trivago/prettier-plugin-sort-imports
  importOrder: [
    "^server-only$",
    "^react$",
    "<THIRD_PARTY_MODULES>",
    // Internal modules
    "^@app/(.*)$",
    // TypeScript TSConfig path aliases
    "^@/(.*)$",
    // Relative imports
    "^[./]",
  ],
  importOrderSortSpecifiers: true,
  overrides: [
    {
      files: "*.svg",
      options: {
        parser: "html",
      },
    },
  ],
};

			`,
			);
		},
	},
	"eslint": {
		devInstalls: ["eslint", "eslint-config-nirtamir2"],
		scripts: {
			lint: 'eslint --fix "./src/**/*.{ts,tsx,js,jsx}"',
		},
		additionalConfig: async () => {
			writeFile(
				".eslintrc.cjs",
				`module.exports = {
  root: true,
  settings: {
    // next: {
    //   rootDir: "src",
    // },
    react: {
      version: "detect",
    },
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  extends: [
    "nirtamir2",
    "nirtamir2/recommended",
    "nirtamir2/typescript",
    "nirtamir2/react",
    // "nirtamir2/query",
    // "nirtamir2/solid",
    // "nirtamir2/security",
    // "nirtamir2/compat",
    // "nirtamir2/jest",
    // "nirtamir2/storybook",
    // "nirtamir2/i18n",
    // "nirtamir2/query",
    "nirtamir2/tailwindcss",
    "nirtamir2/next", // should be after recommended react and typescript
  ],
  rules: {},
};
`,
			);
		},
	},
	"ci": {
		scripts: {
			ci: 'pnpm run --parallel --aggregate-output "/^(lint|format|type-check).*/"',
		},
	},
	"typescript": {
		devInstalls: ["typescript", "@tsconfig/strictest"],
		scripts: {
			"type-check": "tsc --pretty --noEmit",
		},
		tsconfig: {
			extends: "@tsconfig/strictest/tsconfig.json",
		},
	},
	"ts-reset": {
		devInstalls: ["@total-typescript/ts-reset"],
		tsconfig: {
			includes: ["reset.d.ts"],
		},
		additionalConfig: async () => {
			writeFile("reset.d.ts", `import "@total-typescript/ts-reset";`);
		},
	},
	"lodash": {
		installs: ["lodash"],
		devInstalls: ["@types/lodash"],
	},
	"type-fest": {
		devInstalls: ["type-fest"],
	},
	"jira-precommit-message": {
		devInstalls: ["jira-prepare-commit-msg"],
		packageJson: {
			"jira-prepare-commit-msg": {
				messagePattern: "$J - $M",
				jiraTicketPattern: "([A-Z]+-\\d+|\\d+)",
			},
		},
		postInstall: async () => {
			writeFile(
				".husky/prepare-commit-msg",
				`#!/bin/sh
npx jira-prepare-commit-msg $1
`,
			);
		},
	},
	"next-static-paths": {
		installs: ["@nirtamir2/next-static-paths"],
		scripts: {
			"generate-pages-types": "next-static-paths --pages-dir ./src --output . && :",
		},
		packageJson: {
			"lint-staged": {
				"src/app/**/page.tsx": "pnpm run generate-pages-types",
			},
		},
	},
	"knip": {
		devInstalls: ["knip"],
		scripts: {
			knip: "knip",
		},
	},
	// "TODO: alias, svg, t3-env, app icons, i18n": {},
	"clean-script": {
		scripts: {
			clean: "rm -rf ./dist",
		},
	},
	"sync-packages": {
		devInstalls: ["syncpack"],
		packageJson: {
			"lint-staged": {
				"**/package.json": "pnpm run sync-packages && :",
			},
		},
		scripts: {
			"sync-packages": "syncpack fix-mismatches",
		},
	},
	"precommit": {
		devInstalls: ["husky", "lint-staged"],
		// scripts: {
		// 	prepare: "husky",
		// },
		postInstall: async () => {
			const pM = detectPackageManager();
			await $`${getRunnerCommand(pM)} husky init`;

			if (!fileExists(".husky/pre-commit")) {
				p.log.error(color.red(`Can't find precommit file`));
			}
			await insertAtEnd(
				".husky/pre-commit",
				`#!/bin/sh
pnpm lint-staged`,
			);
			// Instantly flush queue
			await flushQueue();
		},
		packageJson: {
			"lint-staged": {
				"*.{ts,tsx,md}": "eslint --cache --fix",
				"*.{ts,tsx,css,html,svg,md,json,js}": "prettier --write",
			},
		},
	},

	// "unocss": {
	// 	pluginOptions: {
	// 		importName: "UnoCss",
	// 		importSource: "unocss/vite",
	// 		isDefault: true,
	// 		options: {},
	// 	},
	// 	installs: ["unocss"],
	// 	additionalConfig: async () => {
	// 		const path = rootFile();
	// 		if (!path) return;
	// 		await insertAtBeginning(path, `import "virtual:uno.css";\n`);
	// 	},
	// },
	// "vitepwa": {
	// 	pluginOptions: {
	// 		importName: "VitePWA",
	// 		importSource: "vite-plugin-pwa",
	// 		isDefault: false,
	// 		options: {},
	// 	},
	// 	installs: ["vite-plugin-pwa"],
	// },
	// "solid-devtools": {
	// 	pluginOptions: {
	// 		importName: "devtools",
	// 		importSource: "solid-devtools/vite",
	// 		isDefault: true,
	// 		options: {},
	// 	},
	// 	installs: ["solid-devtools"],
	// 	additionalConfig: async () => {
	// 		const path = rootFile();
	// 		if (!path) return;
	// 		await insertAtBeginning(path, `import "solid-devtools";\n`);
	// 	},
	// },
};
