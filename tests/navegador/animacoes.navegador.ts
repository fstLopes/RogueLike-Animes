// Teste no navegador real (Playwright + Chromium). Rode com o jogo servido em
// URL_DO_JOGO (padrão: vite preview em http://localhost:4173):
//   npm run build && npm run preview      (num terminal)
//   npm run test:navegador                (em outro)
// Capturas de tela vão para tests/navegador/capturas/.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { catalogo } from "../../src/dados/catalogo.ts";
import type { EstadoDaPartida } from "../../src/dominio/tipos.ts";
import { acoesDisponiveis } from "../../src/motor/combate.ts";
import { atributos } from "../../src/motor/consultas.ts";
import { cenario, idDoItem, type ItemDoCenario } from "../ajudantes/cenario.ts";

const URL_DO_JOGO = process.env.URL_DO_JOGO ?? "http://localhost:4173/";
const CAPTURAS = fileURLToPath(new URL("./capturas/", import.meta.url));
mkdirSync(CAPTURAS, { recursive: true });

interface Caso {
  rotulo: string;
  estado: EstadoDaPartida;
  acaoId: string;
  animacaoId: string;
}

/** Estado de combate com o item equipado, maestria máxima, nível 10 e energia cheia. */
function emCombate(itens: ItemDoCenario[], andar = 3): EstadoDaPartida {
  const e = cenario({ andar, nivel: 10, itens });
  e.batalha!.pvInimigo = 900;
  e.batalha!.energia = atributos(e).energia;
  return e;
}

function todosOsCasos(): Caso[] {
  const casos: Caso[] = [];
  const base = emCombate([]);
  for (const a of acoesDisponiveis(base)) casos.push({ rotulo: a.nome, estado: base, acaoId: a.id, animacaoId: a.animacaoId });
  for (const item of Object.values(catalogo)) {
    const e = item.efeitos;
    if (!e.golpe && !e.habilidade && !e.especial && !e.formas && item.slot !== "consumivel") continue;
    const itens: ItemDoCenario[] = [{ chave: item.chave, xp: 15 }];
    if (e.exige) itens.unshift({ chave: e.exige, xp: 15 });
    const estado = emCombate(itens);
    if (e.habilidade?.tipo === "sombra") estado.ultimoDerrotado = "Marinheiro";
    const id = idDoItem(estado, item.chave);
    for (const a of acoesDisponiveis(estado).filter((x) => x.itemId === id)) {
      casos.push({ rotulo: a.nome, estado, acaoId: a.id, animacaoId: a.animacaoId });
    }
  }
  return casos;
}

async function carregar(pagina: Page, estado: EstadoDaPartida): Promise<void> {
  await pagina.evaluate((e) => {
    const app = (globalThis as any).torre;
    app.estado = e;
    app.ui.mochila = app.ui.perfil = app.ui.conta = false;
    app.desenhar();
  }, estado);
}

/** Dispara o turno sem esperar; devolve quanto tempo a sequência levou. */
async function jogar(pagina: Page, acaoId: string, capturas: [number, string][] = []): Promise<{ ms: number; desenhou: boolean }> {
  await pagina.evaluate((id) => {
    const w = globalThis as any;
    w.__inicio = performance.now();
    w.__fim = null;
    w.__desenhou = false;
    const observar = () => {
      const fx = document.querySelector("[data-fx]");
      if (fx && fx.childElementCount > 0) w.__desenhou = true;
      if (document.getAnimations().length > 0) w.__desenhou = true;
      if (w.__fim === null) requestAnimationFrame(observar);
    };
    requestAnimationFrame(observar);
    w.torre.comandar({ tipo: "turno", acaoId: id }).then(() => (w.__fim = performance.now()));
  }, acaoId);
  for (const [espera, nome] of capturas) {
    await pagina.waitForTimeout(espera);
    await pagina.locator(".arena").screenshot({ path: CAPTURAS + nome });
  }
  await pagina.waitForFunction(() => (globalThis as any).__fim !== null, null, { timeout: 15_000 });
  return pagina.evaluate(() => {
    const w = globalThis as any;
    return { ms: Math.round(w.__fim - w.__inicio), desenhou: w.__desenhou as boolean };
  });
}

async function principal(): Promise<void> {
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  const contexto = await navegador.newContext({ viewport: { width: 1100, height: 820 } });
  // O tsx injeta __name em funções nomeadas enviadas ao navegador; define um substituto.
  const semNomes = "globalThis.__name = (f) => f;";
  await contexto.addInitScript(semNomes);
  await contexto.addInitScript(() => localStorage.setItem("torre-do-eclipse:preferencias", JSON.stringify({ animacoes: "completas" })));
  const pagina = await contexto.newPage();
  const erros: string[] = [];
  pagina.on("pageerror", (e) => erros.push(e.message));
  await pagina.goto(URL_DO_JOGO);
  await pagina.waitForFunction(() => !!(globalThis as any).torre);
  const resultados: string[] = [];
  const ok = (texto: string) => {
    resultados.push("ok  " + texto);
    console.log("ok  " + texto);
  };

  // 1. Cada ação do catálogo toca uma animação até o fim, sem erro.
  const casos = todosOsCasos();
  const tempos: Record<string, number> = {};
  for (const caso of casos) {
    await carregar(pagina, caso.estado);
    const { ms, desenhou } = await jogar(pagina, caso.acaoId);
    tempos[caso.animacaoId] = ms;
    assert.ok(desenhou, `${caso.animacaoId} não desenhou nada`);
    assert.ok(ms < 8000, `${caso.animacaoId} demorou ${ms} ms`);
    assert.equal(await pagina.evaluate(() => (globalThis as any).torre.ocupado), false);
  }
  assert.equal(erros.length, 0, "erros de JavaScript durante as animações: " + erros.join(" | "));
  ok(
    `${casos.length} ações animadas (${new Set(casos.map((c) => c.animacaoId)).size} animações distintas), entre ${Math.min(...Object.values(tempos))} e ${Math.max(...Object.values(tempos))} ms por turno`,
  );

  // 2. Corte: Wado Ichimonji e Dragon Slayer.
  for (const [chave, nome] of [
    ["wado", "corte-wado"],
    ["dragon", "corte-dragon-slayer"],
  ] as const) {
    const e = emCombate([{ chave, xp: 3 }]);
    await carregar(pagina, e);
    await jogar(pagina, "golpe:" + idDoItem(e, chave), [[chave === "dragon" ? 820 : 430, `${nome}.png`]]);
  }
  ok("corte (Wado Ichimonji e Dragon Slayer) com captura");

  // 3. Tiro: pistola de pederneira.
  {
    const e = emCombate([{ chave: "pistol" }]);
    await carregar(pagina, e);
    await jogar(pagina, "golpe:" + idDoItem(e, "pistol"), [[300, "tiro-pistola.png"]]);
    ok("tiro (pederneira) com captura");
  }

  // 4. Poderes: Hiken e El Thor.
  {
    const e = emCombate([{ chave: "mera" }]);
    await carregar(pagina, e);
    await jogar(pagina, "habilidade:" + idDoItem(e, "mera"), [
      [560, "poder-hiken-voo.png"],
      [260, "poder-hiken-explosao.png"],
    ]);
    const g = emCombate([{ chave: "goro" }]);
    await carregar(pagina, g);
    await jogar(pagina, "habilidade:" + idDoItem(g, "goro"), [
      [650, "poder-el-thor-ceu.png"],
      [420, "poder-el-thor-raio.png"],
    ]);
    ok("poderes (Hiken e El Thor) com captura");
  }

  // 5. Transformação com término: Gear 2 entra, fica visível entre os turnos e sai.
  {
    const e = emCombate([{ chave: "gum", xp: 3 }]);
    e.nivel = 2;
    e.batalha!.energia = atributos(e).energia;
    await carregar(pagina, e);
    const id = idDoItem(e, "gum");
    await jogar(pagina, `forma:${id}:forma:gear-2`, [[900, "forma-gear2-entrada.png"]]);
    assert.equal(await pagina.getAttribute("[data-heroi]", "data-forma"), "forma:gear-2");
    const vapor = await pagina.evaluate(() => getComputedStyle(document.querySelector(".acc-vapor")!).display);
    assert.notEqual(vapor, "none", "o vapor do Gear 2 deve aparecer com a arena parada");
    await pagina.locator(".arena").screenshot({ path: CAPTURAS + "forma-gear2-ativa.png" });
    const turnos = await pagina.evaluate(() => (globalThis as any).torre.estado.batalha.forma.turnos);
    for (let i = 0; i < turnos; i++) {
      await pagina.evaluate(() => ((globalThis as any).torre.estado.batalha.pv = 999));
      const ultimo = i === turnos - 1;
      await jogar(pagina, "soco", ultimo ? [[1500, "forma-gear2-saida.png"]] : []);
    }
    assert.equal(await pagina.getAttribute("[data-heroi]", "data-forma"), "");
    ok(`transformação com término (Gear 2: entrada, ${turnos} turnos ativa, saída)`);

    // Outras formas para conferir as silhuetas paradas.
    for (const [chave, forma, nivel] of [
      ["kurama", "forma:modo-chakra-da-kurama", 5],
      ["super", "forma:super-saiyajin", 1],
      ["gum", "forma:gear-4", 4],
      ["gum", "forma:gear-5", 6],
      ["grimoire", "forma:black-asta", 3],
      ["ghoul", "forma:kagune-rinkaku", 1],
    ] as const) {
      const itens: ItemDoCenario[] =
        chave === "super"
          ? [
              { chave: "ki", xp: 15 },
              { chave, xp: 15 },
            ]
          : [{ chave, xp: 15 }];
      const s = emCombate(itens);
      s.nivel = nivel;
      await carregar(pagina, s);
      await jogar(pagina, `forma:${idDoItem(s, chave)}:${forma}`);
      await pagina.locator(".arena").screenshot({ path: CAPTURAS + `silhueta-${forma.replace("forma:", "")}.png` });
    }
    ok("silhuetas de seis formas capturadas com a arena parada");
  }

  // 6. Golpe final antes da tela de vitória.
  {
    const e = emCombate([{ chave: "dragon" }], 1);
    e.batalha!.pvInimigo = 3;
    await carregar(pagina, e);
    const r = await jogar(pagina, "golpe:" + idDoItem(e, "dragon"), [
      [1200, "golpe-final-impacto.png"],
      [700, "golpe-final-desfaz.png"],
    ]);
    assert.equal(await pagina.evaluate(() => (globalThis as any).torre.estado.tela), "recompensa");
    assert.ok(await pagina.isVisible("text=Vitória"));
    await pagina.screenshot({ path: CAPTURAS + "golpe-final-tela-de-vitoria.png" });
    ok(`golpe final animado (${r.ms} ms) e só depois a tela de vitória`);
  }

  // 7. Cliques rápidos não gastam energia nem aplicam dano duas vezes.
  {
    const e = emCombate([{ chave: "mera" }]);
    await carregar(pagina, e);
    const botao = pagina.locator(`[data-acao="turno"][data-arg="habilidade:${idDoItem(e, "mera")}"]`);
    await botao.evaluate((b) => {
      (b as HTMLElement).click();
      (b as HTMLElement).click();
      (b as HTMLElement).click();
    });
    await pagina.waitForFunction(() => !(globalThis as any).torre.ocupado, null, { timeout: 15_000 });
    const depois = await pagina.evaluate(() => (globalThis as any).torre.estado.batalha);
    assert.equal(depois.turno, 2, "só um turno");
    assert.equal(depois.energia, e.batalha!.energia - 8, "energia gasta uma vez");
    assert.equal(depois.pvInimigo, 900 - (35 + 9), "dano aplicado uma vez");
    ok("três cliques seguidos resolvem um único turno");
  }

  // 8. Pular termina a sequência na hora e o turno fecha normalmente.
  {
    const e = emCombate([{ chave: "saber", xp: 15 }]);
    await carregar(pagina, e);
    await pagina.evaluate(
      (id) => {
        const w = globalThis as any;
        w.__fim = null;
        w.__inicio = performance.now();
        w.torre.comandar({ tipo: "turno", acaoId: id }).then(() => (w.__fim = performance.now()));
      },
      "habilidade:" + idDoItem(e, "saber"),
    );
    await pagina.waitForTimeout(250);
    await pagina.click(".pular-animacao");
    await pagina.waitForFunction(() => (globalThis as any).__fim !== null, null, { timeout: 3000 });
    const ms = await pagina.evaluate(() => (globalThis as any).__fim - (globalThis as any).__inicio);
    assert.ok(ms < 900, `pular levou ${ms} ms`);
    assert.equal(await pagina.evaluate(() => (globalThis as any).torre.estado.batalha.turno), 2);
    ok(`botão Pular encerra a Excalibur em ${Math.round(ms)} ms`);
  }

  // 9. Animações desligadas: o turno termina imediatamente.
  {
    await pagina.evaluate(() => ((globalThis as any).torre.preferencias = { animacoes: "desligadas" }));
    const e = emCombate([{ chave: "goro" }]);
    await carregar(pagina, e);
    const { ms } = await jogar(pagina, "habilidade:" + idDoItem(e, "goro"));
    assert.ok(ms < 100, `desligadas levou ${ms} ms`);
    assert.equal(await pagina.evaluate(() => (globalThis as any).torre.estado.batalha.turno), 2);
    ok(`animações desligadas: turno resolvido em ${ms} ms`);
  }
  await pagina.close();

  // 10. prefers-reduced-motion sem escolha salva: modo reduzido, sem deslocamento.
  {
    const ctx = await navegador.newContext({ reducedMotion: "reduce", viewport: { width: 1100, height: 820 } });
    await ctx.addInitScript(semNomes);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => erros.push(e.message));
    await p.goto(URL_DO_JOGO);
    await p.waitForFunction(() => !!(globalThis as any).torre);
    assert.equal(await p.evaluate(() => (globalThis as any).torre.modoDeAnimacao), "reduzidas");
    const e = emCombate([{ chave: "gum", xp: 3 }]);
    e.nivel = 2;
    await carregar(p, e);
    const id = idDoItem(e, "gum");
    const transformacoes = await p.evaluate(async (acao) => {
      const w = globalThis as any;
      const movimentos: string[] = [];
      const espiar = () => {
        for (const a of document.getAnimations()) {
          const quadros = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
          for (const q of quadros)
            if (q.transform && !/^translate\(-50%, ?-100%\)$/.test(String(q.transform))) movimentos.push(String(q.transform));
        }
        if (w.torre.ocupado) requestAnimationFrame(espiar);
      };
      const fim = w.torre.comandar({ tipo: "turno", acaoId: acao });
      requestAnimationFrame(espiar);
      await fim;
      return movimentos;
    }, `forma:${id}:forma:gear-2`);
    assert.deepEqual(transformacoes, [], "modo reduzido não deve deslocar nada");
    assert.equal(await p.getAttribute("[data-heroi]", "data-forma"), "forma:gear-2");
    assert.equal(await p.evaluate(() => (globalThis as any).torre.estado.batalha.turno), 2);
    ok("prefers-reduced-motion: modo reduzido sem deslocamentos e turno concluído");
    await ctx.close();
  }

  assert.equal(erros.length, 0, "erros de JavaScript: " + erros.join(" | "));
  await navegador.close();
  console.log(`\n${resultados.length} verificações no navegador passaram. Capturas em ${CAPTURAS}`);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
