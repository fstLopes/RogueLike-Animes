// Inimigos de cada andar (índice 0 = 1º andar). Números do jogo original.
import type { Inimigo } from "../dominio/tipos.ts";

export const inimigos: readonly Inimigo[] = [
  { nome: "Marinheiro", pv: 40, ataque: 8, ataquePesado: 24, drop: "marine", chanceDeDrop: 0.35, simbolo: "⚓" },
  { nome: "Pirata de Buggy", pv: 51, ataque: 10, ataquePesado: 23, drop: "dagger", chanceDeDrop: 0.38, simbolo: "☠" },
  { nome: "Atirador pirata", pv: 58, ataque: 12, ataquePesado: 26, drop: "pistol", chanceDeDrop: 0.34, simbolo: "✦" },
  { nome: "Espadachim pirata", pv: 66, ataque: 14, ataquePesado: 30, drop: "deck", chanceDeDrop: 0.42, simbolo: "⚔" },
  { nome: "Buggy", pv: 96, ataque: 15, ataquePesado: 34, drop: "buggy", chanceDeDrop: 0.52, simbolo: "☠" },
  { nome: "Ninja renegado", pv: 73, ataque: 15, ataquePesado: 31, drop: "kunai", chanceDeDrop: 0.43, simbolo: "✧" },
  { nome: "Ninja da Névoa", pv: 82, ataque: 17, ataquePesado: 34, drop: "mist", chanceDeDrop: 0.37, simbolo: "◈" },
  { nome: "Usuário de senbon", pv: 88, ataque: 18, ataquePesado: 36, drop: "senbon", chanceDeDrop: 0.4, simbolo: "✣" },
  { nome: "Espadachim da Névoa", pv: 96, ataque: 19, ataquePesado: 39, drop: "plate", chanceDeDrop: 0.4, simbolo: "⚔" },
  { nome: "Zabuza", pv: 145, ataque: 21, ataquePesado: 44, drop: "zabuza", chanceDeDrop: 0.6, simbolo: "◈" },
  { nome: "Demônio do Portão", pv: 151, ataque: 23, ataquePesado: 44, drop: "ds_haori", chanceDeDrop: 0.63, simbolo: "☾" },
  { nome: "Rui", pv: 161, ataque: 24, ataquePesado: 47, drop: "ds_uniforme", chanceDeDrop: 0.57, simbolo: "✣" },
  { nome: "Daki", pv: 174, ataque: 25, ataquePesado: 49, drop: "ds_sandalias", chanceDeDrop: 0.57, simbolo: "〰" },
  { nome: "Gyokko", pv: 183, ataque: 26, ataquePesado: 51, drop: "ds_mascara", chanceDeDrop: 0.62, simbolo: "◌" },
  { nome: "Kokushibo", pv: 228, ataque: 29, ataquePesado: 65, drop: "resp_lua", chanceDeDrop: 1, simbolo: "☽" },
  { nome: "Saibaman", pv: 195, ataque: 26, ataquePesado: 53, drop: "db_anel", chanceDeDrop: 0.62, simbolo: "✦" },
  { nome: "Raditz", pv: 212, ataque: 29, ataquePesado: 57, drop: "db_scouter", chanceDeDrop: 0.64, simbolo: "◉" },
  { nome: "Nappa", pv: 228, ataque: 30, ataquePesado: 61, drop: "db_botasp", chanceDeDrop: 0.62, simbolo: "✹" },
  { nome: "Androide 18", pv: 242, ataque: 32, ataquePesado: 64, drop: "db_final_flash", chanceDeDrop: 0.68, simbolo: "◇" },
  { nome: "Vegeta", pv: 285, ataque: 35, ataquePesado: 77, drop: "db_armadura", chanceDeDrop: 1, simbolo: "ϟ" },
];

export function inimigoDoAndar(andar: number): Inimigo {
  const inimigo = inimigos[andar - 1];
  if (!inimigo) throw new Error("Andar sem inimigo: " + andar);
  return inimigo;
}

/** Inimigo que deixa cair a chave, se houver. */
export function origemDoDrop(chave: string): Inimigo | undefined {
  return inimigos.find((inimigo) => inimigo.drop === chave);
}
