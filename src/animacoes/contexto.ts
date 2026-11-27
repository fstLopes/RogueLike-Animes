import type { Cena } from "./cena.ts";

/** Contexto entregue à animação de uma ação do jogador. */
export interface ContextoDeGolpe {
  c: Cena;
  /** Golpe que derrota o inimigo: a sequência pode caprichar no impacto. */
  final: boolean;
  /** Mostra o resultado já calculado pelo motor (dano, esquiva, cura) e atualiza as barras. */
  impacto(forca?: number): void;
}

/** Contexto da ação do inimigo. */
export interface ContextoInimigo {
  c: Cena;
  /** Mostra o dano recebido (e bloqueio ou absorção) e atualiza a vida do herói. */
  impacto(): void;
}

export type AnimacaoDeGolpe = (ctx: ContextoDeGolpe) => Promise<void>;
export type AnimacaoInimiga = (ctx: ContextoInimigo) => Promise<void>;

export interface AnimacaoDeForma {
  /** Entrada: termina com a silhueta já transformada (data-forma aplicado). */
  entrada: (c: Cena, id: string) => Promise<void>;
  /** Saída quando a forma acaba: termina com a silhueta normal. */
  saida: (c: Cena) => Promise<void>;
}
