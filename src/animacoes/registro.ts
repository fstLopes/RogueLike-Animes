// Registro único de animações, indexado pelo id da habilidade, golpe, especial,
// consumível ou forma (os mesmos ids do catálogo). Para um item novo, adicione a
// entrada aqui; tests/animacoes.test.ts verifica que nada do catálogo ficou de fora.
import type { AnimacaoDeForma, AnimacaoDeGolpe, AnimacaoInimiga } from "./contexto.ts";
import { animacoesDeForma } from "./formas.ts";
import { basicos, consumiveis, golpeGenerico, golpesDeArma, habilidades } from "./golpes.ts";
import { acoesInimigas, ativacaoDeEspeciais, evasivas } from "./inimigos.ts";
import type { Cena } from "./cena.ts";
import { acoesDaExpansao, inimigosDaExpansao } from "./expansao.ts";

export const registroDeAcoes: Readonly<Record<string, AnimacaoDeGolpe>> = {
  ...basicos,
  ...golpesDeArma,
  ...habilidades,
  ...ativacaoDeEspeciais,
  ...consumiveis,
  ...acoesDaExpansao,
};

export const registroDeFormas: Readonly<Record<string, AnimacaoDeForma>> = animacoesDeForma;
export const registroInimigo: Readonly<Record<string, AnimacaoInimiga>> = { ...acoesInimigas, ...inimigosDaExpansao };
export const registroDeEvasivas: Readonly<Record<string, (c: Cena) => Promise<void>>> = evasivas;

export function animacaoDaAcao(id: string): AnimacaoDeGolpe {
  return registroDeAcoes[id] ?? golpeGenerico;
}

export function temAnimacao(id: string): boolean {
  return Object.hasOwn(registroDeAcoes, id) || Object.hasOwn(registroDeFormas, id);
}
