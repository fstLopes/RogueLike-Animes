// Leituras do estado sem efeitos colaterais.
import { catalogo, definicao, slotsDeEquipamento } from "../dados/catalogo.ts";
import type { Atributos, EfeitosDoItem, EstadoDaPartida, Forma, Item, ItemDoInventario, SlotEquipavel } from "../dominio/tipos.ts";

export const SLOTS_DE_ARMADURA: readonly SlotEquipavel[] = ["cabeca", "tronco", "calca", "pes"];
export const SLOTS_COM_MAESTRIA: readonly string[] = ["arma", "poder", "passiva"];
export const XP_MAXIMO_DO_ITEM = 15;
export const LIMITE_DE_PASSIVAS = 3;

export function dadosDoItem(item: ItemDoInventario): Item {
  return definicao(item.chave);
}

export function efeitos(item: ItemDoInventario): EfeitosDoItem {
  return definicao(item.chave).efeitos;
}

export function itemPorId(estado: EstadoDaPartida, id: number | null | undefined): ItemDoInventario | undefined {
  if (id === null || id === undefined) return undefined;
  return estado.itens.find((item) => item.id === id);
}

export function equipadosNoSlot(estado: EstadoDaPartida, slot: SlotEquipavel): ItemDoInventario[] {
  const ids = estado.equipados[slot] ?? [];
  return estado.itens.filter((item) => item.slot === slot && ids.includes(item.id));
}

export function estaEquipado(estado: EstadoDaPartida, item: ItemDoInventario): boolean {
  if (item.slot === "consumivel") return false;
  return (estado.equipados[item.slot] ?? []).includes(item.id);
}

export function todosEquipados(estado: EstadoDaPartida): ItemDoInventario[] {
  return slotsDeEquipamento.flatMap((slot) => equipadosNoSlot(estado, slot));
}

/** Nível de maestria: 0 a 3 (marcos em 3, 7 e 15 de XP). */
export function maestria(item: ItemDoInventario): number {
  return item.xp >= 15 ? 3 : item.xp >= 7 ? 2 : item.xp >= 3 ? 1 : 0;
}

/** Um item que exige um poder só funciona com esse poder equipado. */
export function podeUsar(estado: EstadoDaPartida, item: ItemDoInventario): boolean {
  const exige = efeitos(item).exige;
  return !exige || equipadosNoSlot(estado, "poder").some((poder) => poder.chave === exige);
}

export function atributos(estado: EstadoDaPartida): Atributos {
  const nivel = estado.nivel;
  const s: Atributos = {
    pv: 100 + (nivel - 1) * 9,
    energia: 20 + (nivel - 1) * 2,
    atk: nivel - 1 + estado.bonus.atk,
    def: estado.bonus.def,
    res: estado.bonus.res,
  };
  for (const item of todosEquipados(estado).filter((i) => podeUsar(estado, i))) {
    const e = efeitos(item);
    s.atk += e.atk ?? 0;
    s.def += e.def ?? 0;
    s.res += e.res ?? 0;
    if ((SLOTS_DE_ARMADURA as readonly string[]).includes(item.slot)) s.def += item.melhoria * 2;
  }
  return s;
}

/** Turnos de ação de uma forma depois de ativada: 3 + 1 a cada 20 de Resistência, até 6. */
export function duracaoDaForma(estado: EstadoDaPartida): number {
  return Math.min(6, 3 + Math.floor(atributos(estado).res / 20));
}

export function formasDoItem(item: ItemDoInventario): Forma[] {
  return efeitos(item).formas ?? [];
}

export function precoNaLoja(chave: string): number {
  const precos = [13, 22, 31, 45, 62] as const;
  const item = catalogo[chave];
  return item ? precos[item.raridade] : Number.POSITIVE_INFINITY;
}

export function temPrevisao(estado: EstadoDaPartida): boolean {
  return equipadosNoSlot(estado, "passiva").some((item) => efeitos(item).previsao);
}
