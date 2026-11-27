// Captura as telas principais em vários tamanhos (para comparar antes e depois).
//   URL_DO_JOGO=http://localhost:4173/ tsx tests/navegador/capturar-telas.ts <pasta> [larguras]
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";
import type { EstadoDaPartida } from "../../src/dominio/tipos.ts";
import { adicionarItem } from "../../src/motor/inventario.ts";
import { gerarCenarios } from "./cenarios-visuais.ts";

const URL_DO_JOGO = process.env.URL_DO_JOGO ?? "http://localhost:4173/";
const pasta = process.argv[2] ?? "capturas-telas";
const larguras = (process.argv[3] ?? "1440").split(",").map(Number);
mkdirSync(pasta, { recursive: true });

const c = gerarCenarios();
const mochila = structuredClone(c.vitoria);
for (const chave of ["gum", "shadow", "ration", "reagent", "super", "senzu"]) adicionarItem(mochila, chave);
const telas: [string, EstadoDaPartida, Record<string, unknown>][] = [
  ["batalha", c.batalha, {}],
  ["mochila", mochila, { mochila: true }],
  ["ficha", mochila, { mochila: true, inspecionado: mochila.itens.find((i) => i.chave === "leopard")?.id }],
  ["perfil", mochila, { perfil: true }],
  ["vitoria", c.vitoria, {}],
  ["derrota", c.derrota, {}],
  ["loja", c.loja, {}],
  ["descanso", c.descanso, {}],
  ["evento", c.evento, {}],
  ["conta", c.batalha, { conta: true }],
];

async function mostrar(p: Page, estado: EstadoDaPartida, ui: Record<string, unknown>) {
  await p.evaluate(
    ([e, u]) => {
      const app = (globalThis as any).torre;
      app.estado = e;
      Object.assign(app.ui, { mochila: false, perfil: false, conta: false, inspecionado: null }, u);
      app.desenhar();
    },
    [estado, ui] as const,
  );
  await p.waitForTimeout(150);
}

const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const problemas: string[] = [];
for (const largura of larguras) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: largura < 500 ? 780 : 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript("globalThis.__name = (f) => f;");
  const p = await ctx.newPage();
  await p.goto(URL_DO_JOGO);
  await p.waitForFunction(() => !!(globalThis as any).torre);
  for (const [nome, estado, ui] of telas) {
    await mostrar(p, estado, ui);
    await p.screenshot({ path: `${pasta}/${nome}-${largura}.png`, fullPage: true });
    const r = await p.evaluate(() => {
      const largura = document.documentElement.clientWidth;
      const rolagem = document.documentElement.scrollWidth > largura;
      const cortados: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("button, .button, .card, .loot, h1, h2, h3, strong")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > largura + 1 || r.left < -1) cortados.push("fora da tela: " + (el.textContent ?? "").trim().slice(0, 40));
        else if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible")
          cortados.push("texto cortado: " + (el.textContent ?? "").trim().slice(0, 40));
      }
      return { rolagem, cortados: [...new Set(cortados)].slice(0, 6) };
    });
    if (r.rolagem) problemas.push(`${nome} ${largura}px: rolagem horizontal`);
    for (const x of r.cortados) problemas.push(`${nome} ${largura}px: ${x}`);
  }
  await ctx.close();
}
await navegador.close();
console.log(problemas.length ? "Problemas:\n" + problemas.join("\n") : "Nenhum problema de layout encontrado.");
