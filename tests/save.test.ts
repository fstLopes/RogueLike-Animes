import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { aleatorioComSemente } from "../src/motor/aleatorio.ts";
import { aplicarComando, estadoInicial } from "../src/motor/jornada.ts";
import { VERSAO_ATUAL } from "../src/salvamento/migracoes.ts";
import {
  CHAVE_DO_SAVE,
  CHAVE_DO_SAVE_ANTIGO,
  carregarLocal,
  exportarSave,
  importarSave,
  salvarLocal,
  usarArmazenamento,
  type Armazenamento,
} from "../src/salvamento/save.ts";
import { proximoComando } from "./ajudantes/jogador.ts";
import { carregarOriginal, projetarNovo, projetarOriginal } from "./ajudantes/original.ts";

function memoria(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), removeItem: (c) => void dados.delete(c) };
}

let disco = memoria();
beforeEach(() => {
  disco = memoria();
  usarArmazenamento(disco);
});

/** Ao carregar, o original tirava da sala o que já foi obtido; só importa em sala ativa. */
function comparavel(p: Record<string, unknown>) {
  return ["recompensa", "evento", "loja"].includes(p.tela as string) ? p : { ...p, salaItens: [] };
}

/** Joga o original até um ponto e devolve o `state` dele como o jogo antigo gravaria. */
function saveDoOriginal(semente: number, passos: number) {
  const original = carregarOriginal(aleatorioComSemente(semente));
  const rng = aleatorioComSemente(semente);
  const decisao = aleatorioComSemente(semente + 1);
  const estado = estadoInicial();
  for (let i = 0; i < passos; i++) {
    const comando = proximoComando(estado, decisao);
    if (i > 0 && comando.tipo === "iniciar") break;
    original.executar(comando, estado);
    aplicarComando(estado, comando, rng, []);
    if (estado.andar === 10 && original.estado().view === "win" && estado.tela === "rota") {
      estado.tela = "vitoria";
      break;
    }
  }
  return { antigo: original.estado(), novo: estado };
}

describe("migração do save antigo", () => {
  test("saves reais do jogo original migram para o mesmo estado do motor novo", () => {
    let comparados = 0;
    for (let semente = 1; semente <= 60; semente++) {
      for (const passos of [3, 12, 30, 70]) {
        const { antigo, novo } = saveDoOriginal(semente * 31, passos);
        const lido = importarSave(JSON.stringify(antigo));
        assert.equal(lido.ok, true, lido.ok ? "" : lido.erro);
        if (!lido.ok) continue;
        assert.equal(lido.migrado, true);
        assert.deepEqual(comparavel(projetarNovo(lido.estado)), comparavel(projetarOriginal(antigo)));
        assert.deepEqual(comparavel(projetarNovo(lido.estado)), comparavel(projetarNovo(novo)));
        comparados++;
      }
    }
    assert.ok(comparados >= 200);
  });

  test("transformação ativa no save antigo vira a forma com id", () => {
    const antigo = {
      version: 1,
      view: "fight",
      floor: 1,
      level: 2,
      xp: 0,
      coins: 0,
      nextId: 2,
      items: [{ id: 1, key: "gum", slot: "power", xp: 3, upgrade: 0 }],
      history: [{ floor: 1, kind: "fight" }],
      equipped: { power: [1] },
      points: 0,
      bonus: { atk: 0, def: 0, res: 0 },
      log: [],
      lastDefeated: null,
      obtained: ["gum"],
      room: {},
      battle: {
        hp: 50,
        energy: 3,
        enemyHp: 20,
        turn: 2,
        practice: { 1: 1 },
        firstHit: false,
        blockedLast: false,
        combo: 0,
        form: { name: "Gear 2", atk: 7, def: 0, turns: 2, item: 1 },
        used: { form: true },
        veil: false,
      },
    };
    const lido = importarSave(JSON.stringify(antigo));
    assert.equal(lido.ok, true);
    if (!lido.ok) return;
    assert.equal(lido.estado.batalha?.forma?.id, "forma:gear-2");
    assert.equal(lido.estado.batalha?.formaUsada, true);
  });

  test("o jogo novo encontra o save no endereço antigo, migra e grava no novo", () => {
    const { antigo } = saveDoOriginal(5, 20);
    disco.setItem(CHAVE_DO_SAVE_ANTIGO, JSON.stringify(antigo));
    const carga = carregarLocal();
    assert.equal(carga.origem, "antigo");
    assert.ok(carga.estado);
    const gravado = JSON.parse(disco.getItem(CHAVE_DO_SAVE) ?? "null");
    assert.equal(gravado.versao, VERSAO_ATUAL);
    assert.ok(disco.getItem(CHAVE_DO_SAVE_ANTIGO), "o save antigo é preservado");
    assert.equal(carregarLocal().origem, "atual");
  });

  test("save antigo da tela de título é ignorado, como no original", () => {
    disco.setItem(CHAVE_DO_SAVE_ANTIGO, JSON.stringify({ version: 1, view: "title", log: [] }));
    assert.equal(carregarLocal().estado, null);
  });
});

describe("formato versionado, importação e exportação", () => {
  test("exportar e importar devolve o mesmo estado", () => {
    const { novo } = saveDoOriginal(9, 40);
    const texto = exportarSave(novo);
    const dados = JSON.parse(texto);
    assert.equal(dados.formato, "torre-do-eclipse");
    assert.equal(dados.versao, VERSAO_ATUAL);
    const lido = importarSave(texto);
    assert.equal(lido.ok, true);
    if (lido.ok) assert.deepEqual(lido.estado, novo);
  });

  test("salvar e carregar localmente", () => {
    const { novo } = saveDoOriginal(11, 25);
    salvarLocal(novo);
    assert.deepEqual(carregarLocal().estado, novo);
  });

  test("recusa versão futura, JSON inválido e dados adulterados", () => {
    const { novo } = saveDoOriginal(13, 25);
    const futuro = { formato: "torre-do-eclipse", versao: VERSAO_ATUAL + 1, salvoEm: "", estado: novo };
    assert.match((importarSave(JSON.stringify(futuro)) as { erro: string }).erro, /versão mais nova/);
    assert.equal(importarSave("{oops").ok, false);
    const adulterado = JSON.parse(exportarSave(novo));
    adulterado.estado.itens.push({ id: 9999, chave: "<img src=x onerror=alert(1)>", slot: "arma", xp: 0, melhoria: 0 });
    assert.equal(importarSave(JSON.stringify(adulterado)).ok, false);
    const negativo = JSON.parse(exportarSave(novo));
    negativo.estado.moedas = -5;
    assert.equal(importarSave(JSON.stringify(negativo)).ok, false);
  });

  test("save local corrompido não derruba o jogo", () => {
    disco.setItem(CHAVE_DO_SAVE, "não é json");
    const carga = carregarLocal();
    assert.equal(carga.estado, null);
    assert.ok(carga.erro);
  });
});
