import { readdir, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "src/assets/previews");
await mkdir(output, { recursive: true });
const previews = {};
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (/\.(heic|heif)$/i.test(entry.name)) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      const name =
        createHash("sha256").update(relative).digest("hex").slice(0, 20) +
        ".jpg";
      execFileSync(
        "magick",
        [
          file + "[0]",
          "-auto-orient",
          "-resize",
          "1200x1200>",
          "-strip",
          "-quality",
          "85",
          path.join(output, name),
        ],
        { stdio: "pipe" },
      );
      previews[relative] = "src/assets/previews/" + name;
    }
  }
}
await scan(path.join(root, "img"));
await writeFile(
  path.join(root, "src/data/media-previews.js"),
  "export const mediaPreviews = " + JSON.stringify(previews, null, 2) + ";\n",
);
console.log(`${Object.keys(previews).length} prévias JPEG geradas.`);
