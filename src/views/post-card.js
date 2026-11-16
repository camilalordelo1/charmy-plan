import { esc } from "../utils/html.js";

export function card(p, list = false) {
  return `<button class="post" data-id="${esc(p.id)}" data-status="${esc(p.status)}"><span class="posttop"><span>${list ? esc(p.date.slice(8)) + "/12 · " : ""}${esc(p.channel)}</span><span>${esc(p.time)}</span></span><strong>${esc(p.title)}</strong><small>${esc(p.format)} · ${esc(p.status)}</small></button>`;
}
