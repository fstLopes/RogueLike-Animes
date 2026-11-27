// Fluxo de jogador com a interface: começar uma jornada, lutar até vencer,
// escolher a recompensa, abrir a ficha de um item, acessar o save e testar
// o "Recomeçar" com confirmação. Roda em 360 px e 1440 px, só com cliques.
//   URL_DO_JOGO=http://localhost:4173/ npm run test:fluxo
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const URL_DO_JOGO = process.env.URL_DO_JOGO ?? "http://localhost:4173/";

async function semRolagemHorizontal(p: Page, onde: string) {
  const sobra = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(sobra <= 0, `${onde}: rolagem horizontal de ${sobra}px`);
}

async function fluxo(largura: number) {
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  const ctx = await navegador.newContext({ viewport: { width: largura, height: largura < 500 ? 760 : 900 } });
  await ctx.addInitScript(() => localStorage.setItem("torre-do-eclipse:preferencias", JSON.stringify({ animacoes: "desligadas" })));
  const p = await ctx.newPage();
  const erros: string[] = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(URL_DO_JOGO);

  // 1. Começar
  await p.getByRole("button", { name: "Iniciar jornada" }).click();
  await p.getByRole("heading", { name: "Marinheiro" }).waitFor();
  await semRolagemHorizontal(p, "combate");
  const ataque = p.getByRole("button", { name: /^Ataque: Soco/ });
  assert.ok(await ataque.isVisible(), "ação de ataque com rótulo");
  assert.ok(await p.getByRole("button", { name: /^Defesa: Defender/ }).isVisible(), "ação de defesa com rótulo");
  // O registro fica logo abaixo das ações.
  const yAcoes = (await p.locator(".painel-acoes").boundingBox())!.y;
  const yRegistro = (await p.locator(".log").boundingBox())!.y;
  assert.ok(yRegistro > yAcoes, "registro abaixo das ações");

  // 2. Lutar: socos até vencer (o Marinheiro tem 40 PV).
  for (let i = 0; i < 12 && (await p.locator('[data-acao="turno"][data-arg="soco"]').count()); i++) {
    await p.locator('[data-acao="turno"][data-arg="soco"]').click();
  }
  await p.getByRole("heading", { name: "Vitória" }).waitFor();
  assert.ok(await p.locator(".feed li.ultima").isVisible(), "última jogada em destaque");

  // 3. Escolher a recompensa e abrir a ficha do item.
  await p.locator('[data-acao="pegar"]').first().click();
  await p.getByRole("heading", { name: "Escolha a rota" }).waitFor();
  await p.locator("#bag").click();
  await p.getByRole("heading", { name: "Mochila" }).waitFor();
  await semRolagemHorizontal(p, "mochila");
  const nome = (await p.locator(".loot h3").first().innerText()).trim();
  await p.locator(".inspect-link").first().click();
  await p.locator(".item-sheet h2").waitFor();
  assert.equal((await p.locator(".item-sheet h2").innerText()).trim(), nome, "a ficha abre o item clicado");
  await p.getByRole("button", { name: "← Voltar à mochila" }).click();
  await p.locator("#bag").click();

  // 4. Acessar o save.
  await p.locator("#account").click();
  await p.getByRole("heading", { name: "Seu progresso" }).waitFor();
  assert.ok(await p.getByRole("button", { name: "Exportar save (.json)" }).isEnabled(), "exportar disponível");
  const download = p.waitForEvent("download");
  await p.getByRole("button", { name: "Exportar save (.json)" }).click();
  assert.match((await download).suggestedFilename(), /torre-do-eclipse-andar-1\.json/);
  await semRolagemHorizontal(p, "conta");
  await p.locator("#account").click();

  // 5. Foco visível pelo teclado.
  await p.locator("body").click({ position: { x: 2, y: 2 } });
  await p.keyboard.press("Tab");
  const contorno = await p.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, estilo: s.outlineStyle, largura: s.outlineWidth };
  });
  assert.equal(contorno.tag, "BUTTON");
  assert.notEqual(contorno.estilo, "none", "foco visível");

  // 6. Recomeçar pede confirmação; cancelar não muda nada.
  const telaAntes = await p.evaluate(() => (globalThis as any).torre.estado.tela);
  p.once("dialog", (d) => {
    assert.match(d.message(), /Recomeçar/);
    void d.dismiss();
  });
  await p.locator("#reset").click();
  assert.equal(await p.evaluate(() => (globalThis as any).torre.estado.tela), telaAntes);

  assert.deepEqual(erros, []);
  await navegador.close();
  console.log(`ok  ${largura}px: jornada, luta, vitória, recompensa, ficha do item, save, foco e confirmação`);
}

for (const largura of [360, 1440]) await fluxo(largura);
