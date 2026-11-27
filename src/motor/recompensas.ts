// Sorteio de recompensas, ofertas de loja e drops.
import { catalogo, exclusivos, raridades } from "../dados/catalogo.ts";
import { andarInicialDoItem } from "../dados/expansao.ts";
import type { Aleatorio, EstadoDaPartida, Inimigo } from "../dominio/tipos.ts";

/** Peso de cada raridade (Comum → Mítica) no andar. Soma sempre 100. */
export function chancesPorRaridade(andar: number): number[] {
  const n = andar - 1;
  return [60 - 3 * n, 27 + n, 10 + n, 2.5 + 0.8 * n, 0.5 + 0.2 * n];
}

/**
 * Sorteia até 3 itens diferentes que ainda não foram obtidos e não são exclusivos de inimigos.
 * Primeiro sorteia a raridade pelo peso do andar e depois o item dentro da raridade.
 */
export function sortearOferta(estado: EstadoDaPartida, andar: number, aleatorio: Aleatorio): string[] {
  const grupos = raridades.map((_, r) =>
    Object.keys(catalogo).filter((chave) =>
      (andarInicialDoItem.get(chave) ?? 1) <= andar && !exclusivos.has(chave) &&
      !estado.obtidos.includes(chave) && catalogo[chave]?.raridade === r),
  );
  const escolhidos: string[] = [];
  for (let i = 0; i < 3; i++) {
    const pesos = chancesPorRaridade(andar).map((peso, r) => ((grupos[r]?.length ?? 0) > 0 ? peso : 0));
    const total = pesos.reduce((a, b) => a + b, 0);
    if (!total) break;
    let sorteio = aleatorio() * total;
    const indice = pesos.findIndex((peso) => (sorteio -= peso) < 0);
    const grupo = grupos[indice];
    if (!grupo) break;
    const [escolhido] = grupo.splice(Math.floor(aleatorio() * grupo.length), 1);
    if (escolhido) escolhidos.push(escolhido);
  }
  return escolhidos;
}

/** Drop exclusivo do inimigo. Só sorteia se o item ainda não foi obtido. */
export function sortearDrop(estado: EstadoDaPartida, inimigo: Inimigo, aleatorio: Aleatorio): string | null {
  if (estado.obtidos.includes(inimigo.drop)) return null;
  return aleatorio() < inimigo.chanceDeDrop ? inimigo.drop : null;
}

export function moedasDaVitoria(andar: number): number {
  return andar % 5 === 0 ? 22 : 9 + andar;
}

export function xpDaVitoria(andar: number): number {
  return andar % 5 === 0 ? 3 : 2;
}

export const MOEDAS_DO_EVENTO = 18;
export const MOEDAS_DO_DESCANSO = 8;
export const MAESTRIA_DO_TREINO = 4;
