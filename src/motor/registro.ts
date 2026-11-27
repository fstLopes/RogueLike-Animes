import type { EstadoDaPartida } from "../dominio/tipos.ts";

export const TAMANHO_DO_REGISTRO = 20;

/** Adiciona uma linha no topo do registro da jornada (mantém as 20 mais recentes). */
export function anotar(estado: EstadoDaPartida, mensagem: string): void {
  estado.registro.unshift(mensagem);
  if (estado.registro.length > TAMANHO_DO_REGISTRO) estado.registro.length = TAMANHO_DO_REGISTRO;
}
