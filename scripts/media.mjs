import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function generateMedia() {
  const files = [];
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (
        /\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|m4v|ogv)$/i.test(
          entry.name,
        )
      )
        files.push(path.relative(root, file).split(path.sep).join("/"));
    }
  }
  await scan(path.join(root, "img"));
  files.sort();
  await writeFile(
    path.join(root, "src/data/media.json"),
    JSON.stringify(files, null, 2) + "\n",
  );
  console.log(`${files.length} arquivo(s) de mídia indexados.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateMedia();
