import { existsSync } from "node:fs";
import path from "node:path";

const plugins = {
  tailwindcss: {},
};

const autoprefixerPackagePath = path.join(
  process.cwd(),
  "node_modules",
  "autoprefixer",
  "package.json",
);

if (existsSync(autoprefixerPackagePath)) {
  plugins.autoprefixer = {};
} else {
  console.warn(
    "[postcss] autoprefixer is not installed. Install it with: npm install -D autoprefixer",
  );
}

export default {
  plugins,
};
