const items = new Map();
let db;
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("charmy-media", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("uploads", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
  });
}
export async function loadUploads() {
  try {
    await database();
    const rows = await new Promise((resolve, reject) => {
      const request = db.transaction("uploads").objectStore("uploads").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    for (const item of rows)
      items.set(item.id, { ...item, url: URL.createObjectURL(item.file) });
  } catch {}
}
export function uploaded(post) {
  return items.get(post.uploadId);
}
export async function storeUpload(id, file, originalFile = file) {
  if (!db) await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("uploads", "readwrite");
    tx.objectStore("uploads").put({
      id,
      file,
      name: file.name,
      type: file.type,
      originalFile,
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const old = items.get(id);
  if (old) URL.revokeObjectURL(old.url);
  const item = {
    id,
    file,
    name: file.name,
    type: file.type,
    url: URL.createObjectURL(file),
    originalFile,
  };
  items.set(id, item);
  return item;
}
export async function saveUploadToFolder(item) {
  if (!window.showDirectoryPicker) {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.name;
    a.click();
    return "Arquivo baixado. Mova-o para a pasta img do projeto.";
  }
  const directory = await window.showDirectoryPicker({
    id: "charmy-img",
    mode: "readwrite",
  });
  try {
    await directory.getFileHandle(item.name);
    if (!confirm("Já existe um arquivo com esse nome. Deseja substituí-lo?"))
      return "Gravação cancelada; o arquivo existente foi preservado.";
  } catch (error) {
    if (error.name !== "NotFoundError") throw error;
  }
  const handle = await directory.getFileHandle(item.name, { create: true });
  const stream = await handle.createWritable();
  await stream.write(item.file);
  await stream.close();
  return "Arquivo salvo na pasta escolhida. Faça commit e push para enviá-lo ao GitHub.";
}

export function isVideoUpload(post) {
  const item = uploaded(post);
  return Boolean(
    item &&
      (item.type?.startsWith("video/") ||
        /\.(mp4|mov|m4v|webm|ogv|avi|mkv)$/i.test(item.name)),
  );
}
