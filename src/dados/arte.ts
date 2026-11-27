// Recorte de cada ícone nas folhas de sprites (grade 4 × 4).
// As folhas ficam em src/assets/atlas e o CSS escolhe a folha pela classe.
import { catalogo } from "./catalogo.ts";
import type { Slot } from "../dominio/tipos.ts";

export type Folha = "base" | "relic" | "uniform" | "reference";

export interface RecorteDeIcone {
  folha: Folha;
  /** Posição na grade, de 0 a 15 (linha × 4 + coluna). */
  quadro: number;
}

const naUniform = [
  "vest",
  "pants",
  "boots",
  "greaves",
  "trousers",
  "sprint",
  "mist",
  "senbon",
  "grimoire",
  "armament",
  "sage",
  "star",
  "shadow",
  "mob",
  "ki",
  "ten",
];
const naReference = [
  "gum",
  "buggy",
  "leopard",
  "mera",
  "wado",
  "nichirin",
  "zabuza",
  "zange",
  "rukia",
  "elucidator",
  "lostvayne",
  "saber",
  "dragon",
  "mask",
  "frieren",
  "umbrella",
];
const naRelic: Record<string, number> = {
  frieren: 0,
  gloves: 1,
  gaebolg: 2,
  umbrella: 3,
  playful: 4,
  disk: 5,
  shield: 6,
  reagent: 7,
  scarf: 8,
  cape: 9,
  sprint: 10,
  chain: 11,
  ghoul: 12,
  kurama: 13,
  pill: 14,
  ration: 15,
};
const unicosNaBase: Record<string, number> = {
  gum: 0,
  buggy: 0,
  leopard: 0,
  mera: 1,
  hie: 2,
  goro: 3,
  pistol: 7,
  zabuza: 5,
  dragon: 5,
  zange: 5,
  lostvayne: 5,
  kunai: 6,
  dagger: 6,
  senbon: 6,
  grimoire: 15,
  haki: 13,
  armament: 12,
};
const porSlotNaBase: Record<Slot, number> = { arma: 4, poder: 12, passiva: 13, cabeca: 8, tronco: 9, calca: 10, pes: 11, consumivel: 14 };

/** Mesma regra de prioridade do jogo original: uniform, reference, relic e base. */
export function recorteDoIcone(chave: string): RecorteDeIcone {
  const u = naUniform.indexOf(chave);
  if (u >= 0) return { folha: "uniform", quadro: u };
  const r = naReference.indexOf(chave);
  if (r >= 0) return { folha: "reference", quadro: r };
  const relic = naRelic[chave];
  if (relic !== undefined) return { folha: "relic", quadro: relic };
  const unico = unicosNaBase[chave];
  if (unico !== undefined) return { folha: "base", quadro: unico };
  const item = catalogo[chave];
  return { folha: "base", quadro: item ? porSlotNaBase[item.slot] : 14 };
}

/** Posição CSS do recorte: cada quadro ocupa 1/4 da folha (background-size 400%). */
export function posicaoDoRecorte(quadro: number): string {
  const coluna = quadro % 4;
  const linha = Math.floor(quadro / 4);
  return `${(coluna * 100) / 3}% ${(linha * 100) / 3}%`;
}
