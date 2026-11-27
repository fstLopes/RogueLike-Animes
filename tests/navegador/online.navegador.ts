// Teste de ponta a ponta do modo online: dois "aparelhos" (contextos separados)
// na mesma conta. Precisa do jogo e da API na mesma origem, por exemplo:
//   npm run build
//   DB_DRIVER=sqlite DB_ARQUIVO=/tmp/torre.sqlite php server/bin/migrar.php
//   DB_DRIVER=sqlite DB_ARQUIVO=/tmp/torre.sqlite php -S localhost:8080 -t dist server/public/index.php
//   URL_DO_JOGO=http://localhost:8080/ npm run test:online
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";

const URL_DO_JOGO = process.env.URL_DO_JOGO ?? "http://localhost:8080/";
const CAPTURAS = fileURLToPath(new URL("./capturas/", import.meta.url));
const usuario = "teste" + Date.now().toString(36);
const senha = "senha-de-teste-123";

async function aparelho(navegador: Browser): Promise<Page> {
  const ctx = await navegador.newContext({ viewport: { width: 1100, height: 820 } });
  await ctx.addInitScript("globalThis.__name = (f) => f;");
  await ctx.addInitScript(() => localStorage.setItem("torre-do-eclipse:preferencias", JSON.stringify({ animacoes: "desligadas" })));
  const pagina = await ctx.newPage();
  pagina.on("pageerror", (e) => {
    throw e;
  });
  await pagina.goto(URL_DO_JOGO);
  await pagina.waitForFunction(() => !!(globalThis as any).torre);
  return pagina;
}

const status = (p: Page) => p.locator(".conta-resumo .status-save").innerText();
const esperarStatus = (p: Page, texto: string) =>
  p.waitForFunction((t) => document.querySelector(".conta-resumo .status-save")?.textContent?.includes(t), texto, { timeout: 10_000 });

async function entrar(p: Page, modo: "entrar" | "cadastrar") {
  await p.click('[data-acao="conta"]');
  await p.fill('input[name="usuario"]', usuario);
  await p.fill('input[name="senha"]', senha);
  await p.click(`button[value="${modo}"]`);
  await p.waitForFunction(() => (globalThis as any).torre.sincronizador.usuario !== null, null, { timeout: 10_000 });
}

async function principal() {
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  const a = await aparelho(navegador);
  assert.equal(await status(a), "Salvo neste aparelho");
  console.log("ok  servidor encontrado; sem conta, o jogo salva só no aparelho");

  await a.click("text=Iniciar jornada");
  await a.click('[data-arg="soco"]');
  await entrar(a, "cadastrar");
  await esperarStatus(a, "Sincronizado");
  console.log("ok  cadastro envia o progresso local para a conta (revisão 1)");

  await a.click('[data-acao="conta"]');
  await a.click('[data-arg="soco"]');
  assert.match(await status(a), /aguardando envio|Sincronizando/);
  await esperarStatus(a, "Sincronizado");
  const revisaoA = await a.evaluate(() => (globalThis as any).torre.sincronizador.status.revisao);
  assert.equal(revisaoA, 2);
  console.log("ok  cada jogada salva localmente e sincroniza em seguida (revisão 2)");

  // Aparelho B: entra na mesma conta, sem progresso local → adota o da conta.
  const b = await aparelho(navegador);
  await entrar(b, "entrar");
  await esperarStatus(b, "Sincronizado");
  const turnoB = await b.evaluate(() => (globalThis as any).torre.estado.batalha.turno);
  assert.equal(turnoB, 3);
  console.log("ok  outro aparelho entra na conta e recebe o mesmo progresso");

  // B joga e sincroniza (revisão 3). A, desatualizado, joga e tenta enviar → conflito.
  await b.click('[data-acao="conta"]');
  await b.click('[data-arg="defender"]');
  await esperarStatus(b, "Sincronizado");
  await a.click('[data-arg="soco"]');
  await esperarStatus(a, "Conflito");
  await a.click('[data-acao="conta"]');
  assert.ok(await a.isVisible("text=Escolha qual progresso manter"));
  await a.screenshot({ path: CAPTURAS + "online-conflito.png" });
  console.log("ok  progresso desatualizado não sobrescreve o servidor: conflito exibido");

  await a.click('[data-acao="usar-remoto"]');
  await esperarStatus(a, "Sincronizado");
  const [estadoA, estadoB] = await Promise.all([
    a.evaluate(() => JSON.stringify((globalThis as any).torre.estado)),
    b.evaluate(() => JSON.stringify((globalThis as any).torre.estado)),
  ]);
  assert.equal(estadoA, estadoB);
  console.log("ok  escolhendo o da conta, os dois aparelhos ficam iguais");

  await a.click('[data-acao="sair-da-conta"]');
  await esperarStatus(a, "Salvo neste aparelho");
  await a.click('[data-acao="conta"]');
  await a.click('[data-arg="soco"]');
  assert.equal(await status(a), "Salvo neste aparelho");
  console.log("ok  depois de sair, o jogo continua salvando localmente");
  await navegador.close();
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
