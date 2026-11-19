import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { artworkLibrary } from "../src/data/artwork-library.js";
import { highlights } from "../src/data/highlights.js";

// Build from the same current sources as the previews so downloads include revisions.
export async function buildArtworkBundle(root, output) {
  const entries = artworkLibrary.map((art) => ({
    source: art.src,
    name: `${art.format.startsWith("Story") ? "02-stories" : art.format.startsWith("Capa sugerida") ? "04-capas-sugeridas" : art.format.startsWith("Capa do Reels") ? "03-capas-reels" : "01-feed"}/${art.downloadName}`,
  }));
  for (const highlight of highlights) {
    entries.push({ source: `src/assets/highlights/${highlight.file}`, name: `05-capas-destaques/${highlight.file}` });
    for (const slide of highlight.slides) {
      const source = `src/assets/highlights/${slide.file}`;
      if (!entries.some((entry) => entry.source === source))
        entries.push({ source, name: `02-stories/${highlight.id}/${path.basename(slide.file)}` });
    }
  }
  const directory = path.join(output, "src/assets/downloads");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, "charmy-todas-as-artes.zip");
  execFileSync("python3", ["-c", `
import json, sys, zipfile
from pathlib import Path
data = json.load(sys.stdin)
with zipfile.ZipFile(data['target'], 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
    for entry in data['entries']:
        bundle.write(Path(data['root']) / entry['source'], entry['name'])
    bundle.writestr('LEIA-ME.txt', 'ARTES CHARMY — VERSÕES ATUAIS\\n\\nFeed e capas: 1080 × 1350 px (4:5).\\nStories: formato vertical 9:16.\\nCapas de destaques: formato quadrado.\\n\\nAs capas sugeridas identificam conteúdos a serem produzidos pela loja.\\nO pacote contém artes em PNG, sem os vídeos ou as fotos originais do banco.\\n')
print(len(data['entries']))
`], { input: JSON.stringify({ root, target, entries }) });
  console.log(`Pacote de artes: ${entries.length} imagens.`);
}
