// Mochila: entrada e saída de itens. Cada chave só pode ser obtida uma vez por jornada.
import { catalogo } from "../dados/catalogo.ts";
import type { EstadoDaPartida, ItemDoInventario } from "../dominio/tipos.ts";

export function jaObtido(estado: EstadoDaPartida, chave: string): boolean {
  return estado.obtidos.includes(chave);
}

/** Adiciona o item à mochila. Devolve null se a chave não existe ou já foi obtida. */
export function adicionarItem(estado: EstadoDaPartida, chave: string): ItemDoInventario | null {
  const definicao = catalogo[chave];
  if (!definicao || jaObtido(estado, chave)) return null;
  const item: ItemDoInventario = { id: estado.proximoId, chave, slot: definicao.slot, xp: 0, melhoria: 0 };
  estado.proximoId += 1;
  estado.itens.push(item);
  estado.obtidos.push(chave);
  return item;
}

/** Remove da mochila (consumível usado). A chave continua em `obtidos`, então não volta. */
export function removerItem(estado: EstadoDaPartida, itemId: number): void {
  estado.itens = estado.itens.filter((item) => item.id !== itemId);
}

export function itensDoSlot(estado: EstadoDaPartida, slot: string): ItemDoInventario[] {
  return estado.itens.filter((item) => item.slot === slot);
}
