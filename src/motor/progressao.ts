// Experiência do personagem, pontos de atributo e maestria dos itens.
import { nomesDosAtributos } from "../dados/andares.ts";
import type { Atributo, EstadoDaPartida, EventoDoTurno, ItemDoInventario } from "../dominio/tipos.ts";
import { SLOTS_COM_MAESTRIA, XP_MAXIMO_DO_ITEM, dadosDoItem, maestria, podeUsar } from "./consultas.ts";
import { anotar } from "./registro.ts";

export const NIVEL_MAXIMO = 10;
export const XP_POR_NIVEL = 3;
export const MAESTRIA_POR_LUTA = 4;

/**
 * Dá maestria a um item usado em combate. Cada item ganha no máximo 4 XP por luta
 * e 15 no total. Só armas, poderes e passivas utilizáveis ganham maestria.
 */
export function ganharMaestria(
  estado: EstadoDaPartida,
  item: ItemDoInventario | undefined,
  eventos: EventoDoTurno[],
  quantidade = 1,
): void {
  const batalha = estado.batalha;
  if (!item || !SLOTS_COM_MAESTRIA.includes(item.slot) || !podeUsar(estado, item) || !batalha) return;
  const ganho = batalha.pratica[item.id] ?? 0;
  const concedido = Math.min(quantidade, MAESTRIA_POR_LUTA - ganho, XP_MAXIMO_DO_ITEM - item.xp);
  if (concedido <= 0) return;
  const anterior = maestria(item);
  item.xp += concedido;
  batalha.pratica[item.id] = ganho + concedido;
  const atual = maestria(item);
  if (atual > anterior) {
    anotar(estado, dadosDoItem(item).nome + " alcançou maestria " + atual + ".");
    eventos.push({ tipo: "maestria", itemId: item.id, chave: item.chave, nivel: atual });
  }
}

/** Soma XP da jornada. A cada 3 XP, o personagem sobe de nível (até o 10) e ganha 1 ponto. */
export function ganharXp(estado: EstadoDaPartida, quantidade: number, eventos: EventoDoTurno[]): void {
  estado.xp += quantidade;
  while (estado.xp >= XP_POR_NIVEL && estado.nivel < NIVEL_MAXIMO) {
    estado.xp -= XP_POR_NIVEL;
    estado.nivel += 1;
    estado.pontos += 1;
    anotar(estado, "Nível " + estado.nivel + " · 1 ponto de atributo.");
    eventos.push({ tipo: "nivel", nivel: estado.nivel });
  }
}

export function ganhoDoAtributo(atributo: Atributo): number {
  return atributo === "res" ? 8 : 2;
}

/** Gasta 1 ponto: +2 de ataque, +2 de defesa ou +8 de Resistência. Fora do combate. */
export function distribuirPonto(estado: EstadoDaPartida, atributo: Atributo): boolean {
  if (estado.pontos <= 0 || estado.tela === "combate") return false;
  const ganho = ganhoDoAtributo(atributo);
  estado.bonus[atributo] += ganho;
  estado.pontos -= 1;
  anotar(estado, nomesDosAtributos[atributo] + " +" + ganho + ".");
  return true;
}

/** Itens que podem treinar no descanso: armas, poderes e passivas com menos de 15 XP. */
export function podeTreinar(item: ItemDoInventario): boolean {
  return SLOTS_COM_MAESTRIA.includes(item.slot) && item.xp < XP_MAXIMO_DO_ITEM;
}

/** Itens que podem ser melhorados no descanso: tudo menos passivas e consumíveis. */
export function podeMelhorar(item: ItemDoInventario): boolean {
  return item.slot !== "passiva" && item.slot !== "consumivel";
}
