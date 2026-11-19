import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../unlock.js", import.meta.url), "utf8");
const loginHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const plannerHtml = await readFile(new URL("../planner.html", import.meta.url), "utf8");
const build = await readFile(new URL("../scripts/build.mjs", import.meta.url), "utf8");
assert.match(loginHtml, /<form>/);
assert.match(loginHtml, /unlock\\.js\\?v=plain-1/);
assert.match(plannerHtml, /src\\/main\\.js/);
assert.match(plannerHtml, /charmy:access/);
assert.match(build, /planner\\.html/);
assert.doesNotMatch(build, /protect\\.mjs/);
assert.doesNotMatch(js, /crypto\\.subtle|serviceWorker\\.register/);

function scenario(password, blockStorage = false) {
  const input = { value: password, type: "password", focus() {}, setAttribute() {} };
  const message = { textContent: "" };
  const toggle = { setAttribute() {} };
  let submit, destination = null, stored = null;
  const form = { addEventListener(type, callback) {
    assert.equal(type, "submit");
    submit = callback;
  } };
  const document = { querySelector(selector) {
    return { form, "#password": input, "#message": message, "#togglePassword": toggle }[selector];
  } };
  const sessionStorage = { setItem(key, value) {
    if (blockStorage) throw Error("blocked");
    stored = [key, value];
  } };
  const location = { href: "https://site.test/charmy-plan/" };
  const window = { location: { assign(url) { destination = url; } } };
  vm.runInNewContext(js, { document, sessionStorage, window, location, navigator: {}, URL });
  let prevented = false;
  submit({ preventDefault() { prevented = true; } });
  assert(prevented);
  return { destination, message: message.textContent, stored, input };
}

const good = scenario("charmy2026");
assert.equal(good.destination, "https://site.test/charmy-plan/planner.html");
assert.equal(good.stored?.[0], "charmy:access");
assert.equal(good.stored?.[1], "ok");
assert.equal(good.input.value, "");
const bad = scenario("senha-errada");
assert.equal(bad.destination, null);
assert.match(bad.message, /Senha incorreta/);
const unavailable = scenario("charmy2026", true);
assert.equal(unavailable.destination, null);
assert.match(unavailable.message, /bloqueou/);
console.log("OK: login simples, erro de senha, sessão, redirecionamento e build sem criptografia.");
