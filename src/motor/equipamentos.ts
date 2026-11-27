// Equipar, retirar e montar a melhor build automaticamente.
import type { EstadoDaPartida, ItemDoInventario, SlotEquipavel } from "../dominio/tipos.ts";
import {
  LIMITE_DE_PASSIVAS,
  SLOTS_DE_ARMADURA,
  atributos,
  dadosDoItem,
  efeitos,
  equipadosNoSlot,
  formasDoItem,
  itemPorId,
  maestria,
} from "./consultas.ts";
import { anotar } from "./registro.ts";

/** Equipa ou retira. Passivas têm 3 espaços; os outros slots, 1. Não funciona em combate. */
export function alternarEquipamento(estado: EstadoDaPartida, itemId: number): boolean {
  const item = itemPorId(estado, itemId);
  if (!item || item.slot === "consumivel" || estado.tela === "combate") return false;
  const slot: SlotEquipavel = item.slot;
  const atuais = estado.equipados[slot] ?? [];
  if (atuais.includes(itemId)) {
    estado.equipados[slot] = atuais.filter((id) => id !== itemId);
  } else if (slot === "passiva") {
    if (atuais.length >= LIMITE_DE_PASSIVAS) {
      anotar(estado, "Retire uma passiva para liberar um dos 3 espaços.");
      return false;
    }
    estado.equipados.passiva = [...atuais, itemId];
  } else {
    estado.equipados[slot] = [itemId];
  }
  return true;
}

function valorDaForma(estado: EstadoDaPartida, item: ItemDoInventario): number {
  const energia = atributos(estado).energia;
  const valores = formasDoItem(item)
    .filter((f) => maestria(item) >= f.maestriaMinima && estado.nivel >= f.nivelMinimo && energia >= f.custo)
    .map((f) => f.atk + f.def * 0.9 - f.custo * 0.2);
  return Math.max(0, ...valores);
}

/** Pontuação heurística de um item para a build equilibrada (mesmos pesos do original). */
export function valorDoEquipamento(item: ItemDoInventario): number {
  const e = efeitos(item);
  const nivel = maestria(item);
  const bonus = 2 * (nivel + item.melhoria);
  const ataque = e.golpe ? e.golpe.dano + bonus : 0;
  const habilidade = e.habilidade && (item.slot === "poder" || nivel >= 2) ? e.habilidade.dano + bonus - e.habilidade.custo * 0.65 : 0;
  return (
    Math.max(ataque, habilidade) +
    (e.atk ?? 0) +
    (e.def ?? 0) * 1.25 +
    (e.res ?? 0) * 0.22 +
    ((SLOTS_DE_ARMADURA as readonly string[]).includes(item.slot) ? item.melhoria * 2.5 : 0) +
    (e.barreira ? (e.barreira + nivel * 2) * 0.45 : 0) +
    (e.guarda ?? 0) * 0.4 +
    (e.contra ?? 0) * 0.4 +
    (e.sequencia ? 3 : 0) +
    (e.previsao ? 4 : 0) +
    (e.especial && nivel >= 2 ? 5 : 0)
  );
}

/** Escolhe a melhor peça de cada slot e a melhor combinação de poder com até 3 passivas. */
export function equiparMelhores(estado: EstadoDaPartida): boolean {
  if (estado.tela === "combate") return false;
  const doSlot = (slot: string) => estado.itens.filter((item) => item.slot === slot);
  const equipadoAgora = (item: ItemDoInventario) =>
    item.slot !== "consumivel" && equipadosNoSlot(estado, item.slot).some((outro) => outro.id === item.id);
  const montagem: Partial<Record<SlotEquipavel, number[]>> = {};

  for (const slot of ["cabeca", "tronco", "calca", "pes", "arma"] as const) {
    const opcoes = doSlot(slot).sort(
      (a, b) => valorDoEquipamento(b) - valorDoEquipamento(a) || Number(equipadoAgora(b)) - Number(equipadoAgora(a)),
    );
    const melhor = opcoes[0];
    if (melhor) montagem[slot] = [melhor.id];
  }

  let melhorPontuacao = Number.NEGATIVE_INFINITY;
  let melhorDesempate = -1;
  for (const poder of [null, ...doSlot("poder")]) {
    const candidatas = doSlot("passiva").filter((p) => {
      const exige = efeitos(p).exige;
      return !exige || exige === poder?.chave;
    });
    const comparar = (selecionadas: ItemDoInventario[], inicio: number): void => {
      const conjunto = poder ? [poder, ...selecionadas] : selecionadas;
      const pontuacao =
        conjunto.reduce((soma, i) => soma + valorDoEquipamento(i), 0) + Math.max(0, ...conjunto.map((i) => valorDaForma(estado, i)));
      const desempate = conjunto.filter(equipadoAgora).length + conjunto.length * 0.01;
      if (pontuacao > melhorPontuacao || (pontuacao === melhorPontuacao && desempate > melhorDesempate)) {
        melhorPontuacao = pontuacao;
        melhorDesempate = desempate;
        montagem.poder = poder ? [poder.id] : [];
        montagem.passiva = selecionadas.map((i) => i.id);
      }
      if (selecionadas.length < LIMITE_DE_PASSIVAS) {
        for (let i = inicio; i < candidatas.length; i++) {
          const candidata = candidatas[i];
          if (candidata) comparar([...selecionadas, candidata], i + 1);
        }
      }
    };
    comparar([], 0);
  }

  estado.equipados = montagem;
  anotar(estado, "Melhores equipamentos aplicados para uma build equilibrada.");
  return true;
}

export function nomeDoItem(item: ItemDoInventario): string {
  return dadosDoItem(item).nome;
}
