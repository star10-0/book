import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { spawn } from "node:child_process";

const sourceSvg = path.resolve("public/icons/source-book-icon.svg");
const outputDir = path.resolve("public/icons");

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function findImagemagickCommand(): Promise<"magick" | "convert"> {
  try {
    await run("magick", ["-version"]);
    return "magick";
  } catch {
    try {
      await run("convert", ["-version"]);
      return "convert";
    } catch {
      throw new Error(
        "ImageMagick is required. Install it so either `magick` or `convert` is available in PATH.",
      );
    }
  }
}

async function ensureSourceExists(): Promise<void> {
  await access(sourceSvg, constants.F_OK);
}

async function generatePng(command: "magick" | "convert", size: number, fileName: string): Promise<void> {
  const outputPath = path.join(outputDir, fileName);
  await run(command, [sourceSvg, "-resize", `${size}x${size}`, outputPath]);
}

async function generateFavicon(command: "magick" | "convert"): Promise<void> {
  const icon192 = path.join(outputDir, "icon-192.png");
  const icon512 = path.join(outputDir, "icon-512.png");
  const favicon = path.join(outputDir, "favicon.ico");

  await run(command, [icon192, icon512, favicon]);
}

async function main() {
  await ensureSourceExists();
  await mkdir(outputDir, { recursive: true });
  const imageMagickCommand = await findImagemagickCommand();

  await generatePng(imageMagickCommand, 192, "icon-192.png");
  await generatePng(imageMagickCommand, 512, "icon-512.png");
  await generatePng(imageMagickCommand, 180, "apple-touch-icon.png");

  await generateFavicon(imageMagickCommand);

  console.log("Generated PWA icons in public/icons:");
  console.log("- icon-192.png");
  console.log("- icon-512.png");
  console.log("- apple-touch-icon.png");
  console.log("- favicon.ico");
}

main().catch((error) => {
  console.error("Failed to generate PWA icons.");
  console.error(error);
  process.exit(1);
});
