// Hold the unlocked session only in the open tab's memory. A suspended worker
// can ask for it again without persisting a password or decryption key.
let session = null;
export async function initializeProtectedSession() {
  const workers = globalThis.navigator?.serviceWorker;
  if (!workers?.controller) return;
  workers.addEventListener("message", event => {
    if (event.data?.type === "restore-session") event.ports[0]?.postMessage(session);
    if (event.data?.type === "session-expired") {
      session = null;
      window.dispatchEvent(new Event("protected-session-expired"));
    }
  });
  session = await new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = value => { clearTimeout(timer); channel.port1.close(); resolve(value); };
    const timer = setTimeout(() => finish(null), 1500);
    channel.port1.onmessage = event => finish(event.data);
    workers.controller.postMessage({ type: "read-session" }, [channel.port2]);
  });
}
export async function reopenProtectedSite() {
  session = null;
  const worker = globalThis.navigator?.serviceWorker?.controller;
  if (worker) await new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = () => { clearTimeout(timer); channel.port1.close(); resolve(); };
    const timer = setTimeout(finish, 1500);
    channel.port1.onmessage = finish;
    worker.postMessage({ type: "lock" }, [channel.port2]);
  });
  window.location.reload();
}
