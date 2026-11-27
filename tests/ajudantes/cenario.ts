// Monta estados de teste sem precisar jogar até lá.
import type { EstadoDaPartida, SlotEquipavel } from "../../src/dominio/tipos.ts";
import { aleatorioFixo } from "../../src/motor/aleatorio.ts";
import { adicionarItem } from "../../src/motor/inventario.ts";
import { entrarNaSala, estadoInicial } from "../../src/motor/jornada.ts";

export interface ItemDoCenario {
  chave: string;
  xp?: number;
  melhoria?: number;
  equipar?: boolean;
}

export interface Cenario {
  andar?: number;
  nivel?: number;
  itens?: ItemDoCenario[];
  bonus?: Partial<EstadoDaPartida["bonus"]>;
  /** Sem combate: deixa o estado na tela de rota. */
  foraDeCombate?: boolean;
}

export function cenario(c: Cenario = {}): EstadoDaPartida {
  const estado = estadoInicial();
  estado.andar = c.andar ?? 1;
  estado.nivel = c.nivel ?? 1;
  Object.assign(estado.bonus, c.bonus ?? {});
  for (const definido of c.itens ?? []) {
    const item = adicionarItem(estado, definido.chave);
    if (!item) throw new Error("item repetido no cenário: " + definido.chave);
    item.xp = definido.xp ?? 0;
    item.melhoria = definido.melhoria ?? 0;
    if (definido.equipar !== false && item.slot !== "consumivel") {
      const slot: SlotEquipavel = item.slot;
      estado.equipados[slot] = slot === "passiva" ? [...(estado.equipados[slot] ?? []), item.id] : [item.id];
    }
  }
  if (c.foraDeCombate) {
    estado.tela = "rota";
  } else {
    entrarNaSala(estado, "combate", aleatorioFixo([0.5]));
  }
  return estado;
}

export function idDoItem(estado: EstadoDaPartida, chave: string): number {
  const item = estado.itens.find((i) => i.chave === chave);
  if (!item) throw new Error("item ausente: " + chave);
  return item.id;
}
