// Migração dos formatos antigos de save para o formato atual.
//
// Versão 1: o jogo original (arquivo HTML único) gravava o objeto `state` inteiro em
// localStorage["torre-do-eclipse-1"], com campos em inglês e `version: 1`.
// Versão 2: envelope { formato, versao, salvoEm, estado } com o estado em português.
//
// Para criar a versão 3: aumente VERSAO_ATUAL, escreva `migrarV2ParaV3` e registre em `migracoes`.
import { catalogo } from "../dados/catalogo.ts";
import type { EstadoDaPartida, Slot, Tela, TipoDeSala } from "../dominio/tipos.ts";
import { SaveInvalido } from "./validacao.ts";

export const FORMATO = "torre-do-eclipse";
export const VERSAO_ATUAL = 2;

export interface ArquivoDeSave {
  formato: typeof FORMATO;
  versao: number;
  salvoEm: string;
  estado: unknown;
}

const telasV1: Record<string, Tela> = {
  fight: "combate",
  reward: "recompensa",
  route: "rota",
  event: "evento",
  shop: "loja",
  rest: "descanso",
  win: "vitoria",
  lose: "derrota",
};
const slotsV1: Record<string, Slot> = {
  head: "cabeca",
  body: "tronco",
  legs: "calca",
  feet: "pes",
  weapon: "arma",
  power: "poder",
  passive: "passiva",
  consumable: "consumivel",
};
const salasV1: Record<string, TipoDeSala> = { fight: "combate", event: "evento", shop: "loja", rest: "descanso", boss: "chefe" };

type Objeto = Record<string, any>;

/** O jogo original só carregava saves com version 1 e uma destas telas. */
export function pareceSaveV1(dados: unknown): dados is Objeto {
  const o = dados as Objeto | null;
  return !!o && typeof o === "object" && o.version === 1 && typeof o.view === "string" && o.view in telasV1;
}

/** Converte o `state` do jogo original para o estado da versão 2. */
export function migrarV1(antigo: Objeto): EstadoDaPartida {
  const itens = Array.isArray(antigo.items)
    ? antigo.items.map((i: Objeto) => ({
        id: i.id,
        chave: i.key,
        slot: slotsV1[i.slot] ?? i.slot,
        xp: i.xp ?? 0,
        melhoria: i.upgrade ?? 0,
      }))
    : [];
  const equipados: Objeto = {};
  for (const [slot, ids] of Object.entries((antigo.equipped ?? {}) as Objeto)) {
    const novo = slotsV1[slot];
    if (novo && novo !== "consumivel" && Array.isArray(ids)) equipados[novo] = ids;
  }
  // Mesma correção que o jogo original fazia ao carregar: obtidos inclui a mochila
  // e a sala não oferece de novo o que já foi obtido.
  const obtidos = [...new Set([...(Array.isArray(antigo.obtained) ? antigo.obtained : []), ...itens.map((i: Objeto) => i.chave)])];
  const sala: Objeto = { ...(antigo.room ?? {}) };
  if (Array.isArray(sala.items)) sala.itens = sala.items.filter((chave: string) => !obtidos.includes(chave));
  delete sala.items;
  if (sala.money !== undefined) sala.moedas = sala.money;
  if (sala.earnedXp !== undefined) sala.xpGanho = sala.earnedXp;
  delete sala.money;
  delete sala.earnedXp;

  const tela = telasV1[antigo.view] ?? "titulo";
  let batalha: EstadoDaPartida["batalha"] = null;
  const b = antigo.battle as Objeto | undefined;
  if (tela === "combate" && b) {
    const usados = (b.used ?? {}) as Objeto;
    let forma: NonNullable<EstadoDaPartida["batalha"]>["forma"] = null;
    if (b.form) {
      const item = itens.find((i: Objeto) => i.id === b.form.item);
      const definida = item ? catalogo[item.chave]?.efeitos.formas?.find((f) => f.nome === b.form.name) : undefined;
      if (definida) {
        forma = { id: definida.id, nome: definida.nome, atk: b.form.atk, def: b.form.def, turnos: b.form.turns, itemId: b.form.item };
      }
    }
    batalha = {
      pv: b.hp,
      energia: b.energy,
      pvInimigo: b.enemyHp,
      turno: b.turn,
      pratica: { ...(b.practice ?? {}) },
      primeiroGolpe: !!b.firstHit,
      defendeuAntes: !!b.blockedLast,
      combo: b.combo ?? 0,
      forma,
      formaUsada: !!usados.form,
      especiaisUsados: Object.keys(usados)
        .filter((k) => /^\d+$/.test(k) && usados[k])
        .map(Number),
      veu: null,
    };
  }

  return {
    tela,
    andar: antigo.floor,
    nivel: antigo.level,
    xp: antigo.xp,
    moedas: antigo.coins,
    proximoId: antigo.nextId,
    itens,
    historico: Array.isArray(antigo.history)
      ? antigo.history.map((h: Objeto) => ({ andar: h.floor, tipo: salasV1[h.kind] ?? h.kind }))
      : [],
    equipados,
    pontos: antigo.points ?? 0,
    bonus: { atk: antigo.bonus?.atk ?? 0, def: antigo.bonus?.def ?? 0, res: antigo.bonus?.res ?? 0 },
    registro: Array.isArray(antigo.log) ? antigo.log : [],
    ultimoDerrotado: antigo.lastDefeated ?? null,
    obtidos,
    sala,
    batalha,
  } as EstadoDaPartida;
}

/** Migrações de envelope: cada função leva da versão N para N+1. */
const migracoes: Record<number, (estado: unknown) => unknown> = {
  // 2: (estado) => migrarV2ParaV3(estado),
};

/** Aceita um envelope (qualquer versão até a atual) ou o state cru do jogo original. */
export function paraVersaoAtual(dados: unknown): unknown {
  if (pareceSaveV1(dados)) return migrarV1(dados);
  const envelope = dados as Partial<ArquivoDeSave> | null;
  if (!envelope || typeof envelope !== "object" || envelope.formato !== FORMATO) {
    throw new SaveInvalido("Arquivo não é um save da Torre do Eclipse.");
  }
  const versao = envelope.versao;
  if (typeof versao !== "number" || !Number.isInteger(versao) || versao < 2) throw new SaveInvalido("Versão de save desconhecida.");
  if (versao > VERSAO_ATUAL) throw new SaveInvalido("Este save foi criado por uma versão mais nova do jogo.");
  let estado = envelope.estado;
  for (let v = versao; v < VERSAO_ATUAL; v++) {
    const migrar = migracoes[v];
    if (!migrar) throw new SaveInvalido(`Falta a migração da versão ${v}.`);
    estado = migrar(estado);
  }
  return estado;
}
