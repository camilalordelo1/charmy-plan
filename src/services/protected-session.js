// Compatibility for older cached modules after the move to the static login.
// There is no encryption key or service-worker session to initialize or restore.
export async function initializeProtectedSession() {}
export async function reopenProtectedSite() { window.location.reload(); }
