import { generateMedia } from "./media.mjs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
await generateMedia();
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "src"), path.join(output, "src"), { recursive: true });
await writeFile(
  path.join(output, "index.html"),
  await readFile(path.join(root, "index.html")),
);
await cp(path.join(root, "img"), path.join(output, "img"), { recursive: true });
console.log("Build concluído: dist/");
