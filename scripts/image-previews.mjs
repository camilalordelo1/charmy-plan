import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { imagePreviewPaths } from './image-preview-paths.mjs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../', import.meta.url));
const files=[];
async function scan(dir){for(const f of await readdir(root+dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory()) await scan(p);else if(/\.(png|jpe?g)$/i.test(p)) files.push(p);}}
for(const dir of ['src/assets/posts','src/assets/highlights','src/assets/previews']) await scan(dir);
await mkdir(root+'src/assets/image-previews',{recursive:true});
const map={};
// New artwork bytes get new preview URLs. Keep legacy files for already open tabs.
for(const file of files){map[file]=imagePreviewPaths(file,await readFile(root+file));for(const [size,width,quality] of [['thumb',400,76],['display',1080,84]]){const target=map[file][size];execFileSync('magick',[root+file,'-auto-orient','-resize',`${width}x${width}>`,'-strip','-quality',String(quality),root+target]);}}
await writeFile(root+'src/data/image-previews.js','export const imagePreviews = '+JSON.stringify(map,null,2)+';\n');
console.log(`Optimized ${files.length} images`);
