import { notionPosts } from "./data/notion-posts.js";
import { openMediaLibrary } from "./views/media-library.js";
import { suggestions } from "./data/posts.js";
import { loadPosts, savePosts } from "./services/storage.js";
import { card } from "./views/post-card.js";

const $ = (selector) => document.querySelector(selector);
let posts = loadPosts([...notionPosts, ...suggestions]);
let view = "grid";
let ideas = false;
let kpis = false;
let media = false;
let editing = null;

function save() {
  try {
    savePosts(posts);
  } catch {
    alert(
      "Não foi possível salvar neste navegador. Exporte uma cópia do planejamento.",
    );
  }
  render();
}
function filtered() {
  return posts
    .filter(
      (p) =>
        (!ideas || p.status === "Ideia") &&
        (!$("#channel").value || p.channel === $("#channel").value) &&
        (!$("#status").value || p.status === $("#status").value) &&
        `${p.title} ${p.notes} ${p.pillar}`
          .toLowerCase()
          .includes($("#search").value.toLowerCase()),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function render() {
  $("#kpisPanel").hidden = !kpis;
  $("#calendarPanel").hidden = kpis || media;
  $("#mediaPanel").hidden = !media;
  $("#new").hidden = kpis || media;
  $("main > .localnote").hidden = kpis || media;
  for (const [id, active] of [
    ["calendarNav", !ideas && !kpis && !media],
    ["ideasNav", ideas && !kpis && !media],
    ["kpisNav", kpis],
    ["mediaNav", media],
  ]) {
    const button = $("#" + id);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  $("#total").textContent = posts.length;
  $("#approved").textContent = posts.filter(
    (p) => p.status === "Aprovado",
  ).length;
  const data = filtered();
  $("#viewTitle").textContent = ideas
    ? "Banco de ideias"
    : "Calendário editorial";
  $("#viewDescription").textContent = ideas
    ? "Rascunhos para transformar em conteúdo."
    : "Cada post, uma nova conexão.";
  $("#gridView").classList.toggle("selected", view === "grid" && !ideas);
  $("#listView").classList.toggle("selected", view === "list" || ideas);
  if (view === "list" || ideas) {
    $("#calendar").innerHTML =
      `<div class="list">${data.length ? data.map((p) => card(p, true)).join("") : '<div class="empty">Nenhum post por aqui. Que tal criar uma nova ideia? ✧</div>'}</div>`;
  } else {
    let html =
      '<div class="weekdays">' +
      ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
        .map((d) => `<span>${d}</span>`)
        .join("") +
      '</div><div class="grid">';
    for (let i = 0; i < 35; i++) {
      const day = i,
        valid = day >= 1 && day <= 31;
      const date = `2026-12-${String(day).padStart(2, "0")}`;
      html += `<div class="day ${valid ? "" : "outside"}" ${valid ? `data-date="${date}" tabindex="0" role="button" aria-label="Adicionar post em ${day} de dezembro"` : ""}><div class="number">${valid ? day : day === 0 ? 30 : day - 31}<em>＋</em></div>${
        valid
          ? data
              .filter((p) => p.date === date)
              .map((p) => card(p))
              .join("")
          : ""
      }</div>`;
    }
    $("#calendar").innerHTML = html + "</div>";
  }
}
function openEditor(id, date) {
  editing = id || null;
  const p = id
    ? posts.find((p) => p.id === id)
    : {
        title: "",
        date: date || "2026-12-01",
        time: "18:00",
        channel: "Instagram",
        format: "Reels",
        status: "Ideia",
        pillar: "Estilo & identidade",
        notes: "",
      };
  for (const name of [
    "title",
    "date",
    "time",
    "channel",
    "format",
    "status",
    "pillar",
    "notes",
  ])
    $("#form").elements[name].value = p[name];
  $("#modalTitle").textContent = id ? "Editar post" : "Novo post";
  $("#delete").hidden = !id;
  $("#editor").showModal();
  $("#editor").scrollTop = 0;
  expandNotes();
}
$("#calendar").onclick = (e) => {
  const post = e.target.closest("[data-id]");
  if (post) return openEditor(post.dataset.id);
  const day = e.target.closest("[data-date]");
  if (day) openEditor(null, day.dataset.date);
};
$("#calendar").onkeydown = (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-date]")) {
    e.preventDefault();
    openEditor(null, e.target.dataset.date);
  }
};
$("#new").onclick = () => openEditor();
$("#close").onclick = () => $("#editor").close();
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(e.target));
  values.title = values.title.trim();
  if (!values.title) return;
  values.id = editing || crypto.randomUUID();
  if (editing)
    posts = posts.map((p) => (p.id === editing ? { ...p, ...values } : p));
  else posts.push(values);
  save();
  $("#editor").close();
};
$("#delete").onclick = () => {
  if (confirm("Excluir este post do planejamento?")) {
    posts = posts.filter((p) => p.id !== editing);
    save();
    $("#editor").close();
  }
};
for (const id of ["search", "channel", "status"])
  $("#" + id).addEventListener("input", render);
$("#gridView").onclick = () => {
  view = "grid";
  ideas = false;
  render();
};
$("#listView").onclick = () => {
  view = "list";
  render();
};
$("#ideasNav").onclick = () => {
  media = false;
  kpis = false;
  ideas = true;
  render();
};
$("#calendarNav").onclick = () => {
  media = false;
  kpis = false;
  ideas = false;
  view = "grid";
  render();
};
$("#kpisNav").onclick = () => {
  media = false;
  kpis = true;
  ideas = false;
  render();
};
$("#export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "charmy-dezembro-2026.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#import").onclick = () => $("#importFile").click();
$("#importFile").onchange = async (e) => {
  try {
    const incoming = JSON.parse(await e.target.files[0].text());
    const statuses = ["Ideia", "Em produção", "Aprovado", "Publicado"];
    if (
      !Array.isArray(incoming) ||
      incoming.some(
        (p) =>
          !p ||
          typeof p.title !== "string" ||
          !/^2026-12-(0[1-9]|[12]\d|3[01])$/.test(p.date) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) ||
          !statuses.includes(p.status) ||
          !["Instagram", "TikTok", "WhatsApp"].includes(p.channel) ||
          !["Reels", "Carrossel", "Stories", "Vídeo", "Imagem"].includes(
            p.format,
          ) ||
          ![
            "Estilo & identidade",
            "Comunidade",
            "Bastidores",
            "Produto",
          ].includes(p.pillar) ||
          typeof p.notes !== "string",
      )
    )
      throw Error();
    if (confirm("Substituir o planejamento atual pelo arquivo?")) {
      posts = incoming.map((p) => ({ ...p, id: crypto.randomUUID() }));
      save();
    }
  } catch {
    alert(
      "Arquivo inválido. Use um JSON exportado deste calendário de dezembro de 2026.",
    );
  }
  e.target.value = "";
};
// Existing browser records are only changed when the user requests it.
$("#addScripts").onclick = () => {
  const missing = suggestions.filter(
    (script) =>
      !posts.some(
        (post) => post.id === script.id || post.source === script.source,
      ),
  );
  if (!missing.length) {
    alert("Os seis roteiros já estão no planejamento.");
    return;
  }
  if (
    confirm(
      `Adicionar ${missing.length} roteiro(s) do PDF sem remover os posts atuais? As datas e horários são sugestões.`,
    )
  ) {
    posts.push(...missing.map((script) => ({ ...script })));
    save();
  }
};
render();

$("#mediaNav").onclick = () => {
  media = true;
  kpis = false;
  ideas = false;
  render();
  openMediaLibrary();
};

$("#addNotion").onclick = () => {
  const missing = notionPosts.filter(
    (item) =>
      !posts.some((post) => post.id === item.id || post.source === item.source),
  );
  if (!missing.length)
    return alert("Os posts do Notion já estão no calendário.");
  if (
    confirm(
      `Adicionar ${missing.length} posts do Notion, preservando os posts atuais?`,
    )
  ) {
    posts.push(...missing.map((item) => ({ ...item })));
    save();
  }
};

function expandNotes() {
  const notes = $("#form").elements.notes;
  notes.style.height = "auto";
  notes.style.height = `${notes.scrollHeight + 2}px`;
}
$("#form").elements.notes.addEventListener("input", expandNotes);
window.addEventListener("resize", () => {
  if ($("#editor").open) expandNotes();
});
