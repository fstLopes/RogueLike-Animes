// Validação estrutural do estado salvo. Saves importados ou vindos do servidor
// são dados externos: nada é aceito sem passar por aqui.
import { TOTAL_DE_ANDARES } from "../dados/andares.ts";
import { catalogo } from "../dados/catalogo.ts";
import type { Batalha, EstadoDaPartida, ItemDoInventario, Sala, SlotEquipavel, Tela, TipoDeSala } from "../dominio/tipos.ts";

const TELAS: readonly Tela[] = ["titulo", "combate", "recompensa", "rota", "evento", "loja", "descanso", "vitoria", "derrota"];
const TIPOS_DE_SALA: readonly TipoDeSala[] = ["combate", "evento", "loja", "descanso", "chefe"];
const SLOTS_EQUIPAVEIS: readonly SlotEquipavel[] = ["cabeca", "tronco", "calca", "pes", "arma", "poder", "passiva"];

export class SaveInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "SaveInvalido";
  }
}

type Objeto = Record<string, unknown>;

function objeto(valor: unknown, campo: string): Objeto {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new SaveInvalido(campo + " deve ser um objeto.");
  return valor as Objeto;
}

function inteiro(valor: unknown, campo: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < min || valor > max) {
    throw new SaveInvalido(`${campo} deve ser um inteiro entre ${min} e ${max}.`);
  }
  return valor;
}

function booleano(valor: unknown, campo: string): boolean {
  if (typeof valor !== "boolean") throw new SaveInvalido(campo + " deve ser verdadeiro ou falso.");
  return valor;
}

function texto(valor: unknown, campo: string, max = 300): string {
  if (typeof valor !== "string" || valor.length > max) throw new SaveInvalido(campo + " deve ser um texto curto.");
  return valor;
}

function chaveDeItem(valor: unknown, campo: string): string {
  const chave = texto(valor, campo, 40);
  if (!Object.hasOwn(catalogo, chave)) throw new SaveInvalido(`${campo}: item desconhecido "${chave}".`);
  return chave;
}

function lista(valor: unknown, campo: string, max: number): unknown[] {
  if (!Array.isArray(valor) || valor.length > max) throw new SaveInvalido(campo + " deve ser uma lista.");
  return valor;
}

function validarItem(valor: unknown, i: number): ItemDoInventario {
  const o = objeto(valor, `itens[${i}]`);
  const chave = chaveDeItem(o.chave, `itens[${i}].chave`);
  const slot = catalogo[chave]?.slot;
  if (!slot || o.slot !== slot) throw new SaveInvalido(`itens[${i}].slot não corresponde ao item.`);
  return {
    id: inteiro(o.id, `itens[${i}].id`, 1),
    chave,
    slot: slot,
    xp: inteiro(o.xp, `itens[${i}].xp`, 0, 15),
    melhoria: inteiro(o.melhoria, `itens[${i}].melhoria`, 0, 999),
  };
}

function validarBatalha(valor: unknown, itens: ItemDoInventario[]): Batalha {
  const o = objeto(valor, "batalha");
  const pratica: Record<string, number> = {};
  for (const [id, n] of Object.entries(objeto(o.pratica, "batalha.pratica"))) {
    if (!/^\d+$/.test(id)) throw new SaveInvalido("batalha.pratica tem chave inválida.");
    pratica[id] = inteiro(n, "batalha.pratica", 0, 4);
  }
  let forma: Batalha["forma"] = null;
  if (o.forma !== null) {
    const f = objeto(o.forma, "batalha.forma");
    const itemId = inteiro(f.itemId, "batalha.forma.itemId", 1);
    const item = itens.find((i) => i.id === itemId);
    const id = texto(f.id, "batalha.forma.id", 60);
    if (!item || !catalogo[item.chave]?.efeitos.formas?.some((definida) => definida.id === id)) {
      throw new SaveInvalido("batalha.forma não pertence a um item da mochila.");
    }
    forma = {
      id,
      nome: texto(f.nome, "batalha.forma.nome", 60),
      atk: inteiro(f.atk, "batalha.forma.atk", 0, 100),
      def: inteiro(f.def, "batalha.forma.def", 0, 100),
      turnos: inteiro(f.turnos, "batalha.forma.turnos", 0, 6),
      itemId,
    };
  }
  const veu = o.veu === null ? null : texto(o.veu, "batalha.veu", 60);
  return {
    pv: inteiro(o.pv, "batalha.pv", 0, 10_000),
    energia: inteiro(o.energia, "batalha.energia", 0, 10_000),
    pvInimigo: inteiro(o.pvInimigo, "batalha.pvInimigo", 0, 10_000),
    turno: inteiro(o.turno, "batalha.turno", 1),
    pratica,
    primeiroGolpe: booleano(o.primeiroGolpe, "batalha.primeiroGolpe"),
    defendeuAntes: booleano(o.defendeuAntes, "batalha.defendeuAntes"),
    combo: inteiro(o.combo, "batalha.combo", 0, 3),
    forma,
    formaUsada: booleano(o.formaUsada, "batalha.formaUsada"),
    especiaisUsados: lista(o.especiaisUsados, "batalha.especiaisUsados", 50).map((id) => inteiro(id, "batalha.especiaisUsados", 1)),
    veu,
  };
}

function validarSala(valor: unknown): Sala {
  const o = objeto(valor, "sala");
  const sala: Sala = {};
  if (o.itens !== undefined) sala.itens = lista(o.itens, "sala.itens", 3).map((c) => chaveDeItem(c, "sala.itens"));
  if (o.drop !== undefined) sala.drop = o.drop === null ? null : chaveDeItem(o.drop, "sala.drop");
  if (o.moedas !== undefined) sala.moedas = inteiro(o.moedas, "sala.moedas", 0);
  if (o.xpGanho !== undefined) sala.xpGanho = inteiro(o.xpGanho, "sala.xpGanho", 0);
  return sala;
}

/** Confere tipos, limites e referências do estado. Lança SaveInvalido se algo estiver errado. */
export function validarEstado(valor: unknown): EstadoDaPartida {
  const o = objeto(valor, "estado");
  const tela = texto(o.tela, "tela", 20) as Tela;
  if (!TELAS.includes(tela)) throw new SaveInvalido("tela desconhecida.");
  const itens = lista(o.itens, "itens", 200).map(validarItem);
  const ids = new Set(itens.map((i) => i.id));
  if (ids.size !== itens.length) throw new SaveInvalido("itens com id repetido.");
  const proximoId = inteiro(o.proximoId, "proximoId", 1);
  if (itens.some((i) => i.id >= proximoId)) throw new SaveInvalido("proximoId menor que um id existente.");

  const equipados: EstadoDaPartida["equipados"] = {};
  for (const [slot, valorDoSlot] of Object.entries(objeto(o.equipados, "equipados"))) {
    if (!(SLOTS_EQUIPAVEIS as readonly string[]).includes(slot)) throw new SaveInvalido("slot de equipamento desconhecido.");
    const idsDoSlot = lista(valorDoSlot, "equipados." + slot, slot === "passiva" ? 3 : 1).map((id) => inteiro(id, "equipados." + slot, 1));
    for (const id of idsDoSlot) {
      const item = itens.find((i) => i.id === id);
      if (!item || item.slot !== slot) throw new SaveInvalido(`equipados.${slot} aponta para item inválido.`);
    }
    equipados[slot as SlotEquipavel] = idsDoSlot;
  }

  const bonus = objeto(o.bonus, "bonus");
  const historico = lista(o.historico, "historico", 100).map((h, i) => {
    const entrada = objeto(h, `historico[${i}]`);
    const tipo = texto(entrada.tipo, "historico.tipo", 20) as TipoDeSala;
    if (!TIPOS_DE_SALA.includes(tipo)) throw new SaveInvalido("historico com sala desconhecida.");
    return { andar: inteiro(entrada.andar, "historico.andar", 1, TOTAL_DE_ANDARES), tipo };
  });
  const obtidos = lista(o.obtidos, "obtidos", 200).map((c) => chaveDeItem(c, "obtidos"));
  for (const item of itens) if (!obtidos.includes(item.chave)) throw new SaveInvalido("item da mochila fora de obtidos.");

  const estado: EstadoDaPartida = {
    tela,
    andar: inteiro(o.andar, "andar", 1, TOTAL_DE_ANDARES),
    nivel: inteiro(o.nivel, "nivel", 1, 10),
    xp: inteiro(o.xp, "xp", 0),
    moedas: inteiro(o.moedas, "moedas", 0),
    proximoId,
    itens,
    historico,
    equipados,
    pontos: inteiro(o.pontos, "pontos", 0, 100),
    bonus: {
      atk: inteiro(bonus.atk, "bonus.atk", 0, 1000),
      def: inteiro(bonus.def, "bonus.def", 0, 1000),
      res: inteiro(bonus.res, "bonus.res", 0, 1000),
    },
    registro: lista(o.registro, "registro", 20).map((linha) => texto(linha, "registro", 200)),
    ultimoDerrotado: o.ultimoDerrotado === null ? null : texto(o.ultimoDerrotado, "ultimoDerrotado", 60),
    obtidos,
    sala: validarSala(o.sala),
    batalha: o.batalha === null ? null : validarBatalha(o.batalha, itens),
  };
  if (estado.tela === "combate" && !estado.batalha) throw new SaveInvalido("combate sem dados de batalha.");
  return estado;
}
