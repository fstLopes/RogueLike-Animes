// Carrega o jogo original (v1) numa sandbox para comparar regras com o motor novo.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { catalogo } from "../../src/dados/catalogo.ts";
import type { Aleatorio, Comando, EstadoDaPartida } from "../../src/dominio/tipos.ts";

const caminho = fileURLToPath(new URL("../referencia/jogo-original.js", import.meta.url));
const codigo = readFileSync(caminho, "utf8");

function falso(): unknown {
  const alvo = function () {};
  return new Proxy(alvo, {
    get: (_t, chave) => (chave === Symbol.toPrimitive ? () => 0 : chave === "length" ? 0 : falso()),
    set: () => true,
    apply: () => falso(),
    construct: () => falso() as object,
  });
}

export interface JogoOriginal {
  executar(comando: Comando, estadoNovo: EstadoDaPartida): void;
  estado(): Record<string, unknown>;
  avaliar<T>(expressao: string): T;
}

export function carregarOriginal(aleatorio: Aleatorio): JogoOriginal {
  const math = Object.create(Math) as Math;
  math.random = aleatorio;
  const contexto: Record<string, unknown> = {
    console: { log() {}, warn() {}, error() {} },
    Math: math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Number,
    String,
    Boolean,
    Date,
    Promise,
    Symbol,
    Error,
    document: {
      querySelector: () => falso(),
      querySelectorAll: () => [],
      createElement: () => falso(),
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: { matchMedia: () => ({ matches: true }) },
    confirm: () => true,
  };
  vm.createContext(contexto);
  vm.runInContext(codigo, contexto);
  const avaliar = <T>(expressao: string): T => vm.runInContext(expressao, contexto) as T;
  const perform = (acao: string, arg?: string | number) =>
    vm.runInContext(`perform(${JSON.stringify(acao)}, ${arg === undefined ? "undefined" : JSON.stringify(String(arg))})`, contexto);

  const tipos: Record<string, string> = { combate: "fight", evento: "event", loja: "shop", descanso: "rest", chefe: "boss" };

  return {
    avaliar,
    estado: () => avaliar<Record<string, unknown>>("JSON.parse(JSON.stringify(state))"),
    executar(comando, estadoNovo) {
      switch (comando.tipo) {
        case "iniciar":
          return perform("start");
        case "turno": {
          const partes = comando.acaoId.split(":");
          const tipo = partes[0];
          const itemId = partes[1];
          const formaId = partes.slice(2).join(":");
          if (tipo === "soco") return perform("turn", "punch");
          if (tipo === "defender") return perform("turn", "guard");
          if (tipo === "golpe") return perform("turn", "weapon" + itemId);
          if (tipo === "habilidade") return perform("turn", "skill" + itemId);
          if (tipo === "especial") return perform("turn", "special" + itemId);
          if (tipo === "usar") return perform("turn", "use" + itemId);
          if (tipo === "forma") {
            const item = estadoNovo.itens.find((i) => i.id === Number(itemId));
            const forma = item && catalogo[item.chave]?.efeitos.formas?.find((f) => f.id === formaId);
            return perform("turn", "form" + itemId + (forma?.nome ?? "?"));
          }
          throw new Error("Ação sem tradução: " + comando.acaoId);
        }
        case "rota":
          return perform("next", tipos[comando.destino]);
        case "pegar":
          return perform("take", comando.chave);
        case "moedasDoEvento":
          return perform("eventcoins");
        case "comprar":
          return perform("buy", comando.chave);
        case "continuar":
          return perform("continue");
        case "sairDaLoja":
          return perform("leave");
        case "moedasDoDescanso":
          return perform("restskip");
        case "treinar":
          return perform("practice", comando.itemId);
        case "melhorar":
          return perform("upgrade", comando.itemId);
        case "atributo":
          return perform("attribute", comando.atributo);
        case "equipar":
          perform("bag");
          perform("equip", comando.itemId);
          return perform("bag");
        case "equiparMelhores":
          perform("bag");
          perform("best");
          return perform("bag");
      }
    },
  };
}

const telas: Record<string, string> = {
  title: "titulo",
  fight: "combate",
  reward: "recompensa",
  route: "rota",
  event: "evento",
  shop: "loja",
  rest: "descanso",
  win: "vitoria",
  lose: "derrota",
};
const slots: Record<string, string> = {
  head: "cabeca",
  body: "tronco",
  legs: "calca",
  feet: "pes",
  weapon: "arma",
  power: "poder",
  passive: "passiva",
  consumable: "consumivel",
};

/** Projeção comparável do estado original. */
export function projetarOriginal(s: Record<string, any>): Record<string, unknown> {
  const equipados: Record<string, number[]> = {};
  for (const [slot, ids] of Object.entries((s.equipped ?? {}) as Record<string, number[]>)) equipados[slots[slot] ?? slot] = ids;
  const b = s.view === "fight" ? s.battle : null;
  return {
    tela: telas[s.view as string],
    andar: s.floor,
    nivel: s.level,
    xp: s.xp,
    moedas: s.coins,
    pontos: s.points,
    bonus: s.bonus,
    itens: (s.items ?? []).map((i: any) => ({ id: i.id, chave: i.key, slot: slots[i.slot], xp: i.xp, melhoria: i.upgrade })),
    equipados,
    obtidos: s.obtained ?? [],
    registro: s.log,
    salaItens: s.room?.items ?? [],
    batalha: b
      ? {
          pv: b.hp,
          energia: b.energy,
          pvInimigo: b.enemyHp,
          turno: b.turn,
          combo: b.combo,
          forma: b.form ? { nome: b.form.name, turnos: b.form.turns } : null,
          primeiroGolpe: b.firstHit,
          defendeuAntes: b.blockedLast,
        }
      : null,
  };
}

export function projetarNovo(s: EstadoDaPartida): Record<string, unknown> {
  const b = s.tela === "combate" ? s.batalha : null;
  return {
    tela: s.tela,
    andar: s.andar,
    nivel: s.nivel,
    xp: s.xp,
    moedas: s.moedas,
    pontos: s.pontos,
    bonus: s.bonus,
    itens: s.itens.map((i) => ({ id: i.id, chave: i.chave, slot: i.slot, xp: i.xp, melhoria: i.melhoria })),
    equipados: s.equipados,
    obtidos: s.obtidos,
    registro: s.registro,
    salaItens: s.sala.itens ?? [],
    batalha: b
      ? {
          pv: b.pv,
          energia: b.energia,
          pvInimigo: b.pvInimigo,
          turno: b.turno,
          combo: b.combo,
          forma: b.forma ? { nome: b.forma.nome, turnos: b.forma.turnos } : null,
          primeiroGolpe: b.primeiroGolpe,
          defendeuAntes: b.defendeuAntes,
        }
      : null,
  };
}
