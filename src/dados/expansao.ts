import type { EfeitosDoItem, Item, Raridade, Slot } from "../dominio/tipos.ts";

const ds = "Demon Slayer";
const db = "Dragon Ball";
type Tecnica = readonly [string, string, string, number, number, string, string, number];

export const respiracoes = [
  ["resp_agua", "Respiração da Água", "Roda d’Água", 6, 34, "#5edfff", "onda", 160],
  ["resp_chamas", "Respiração das Chamas", "Mar de Chamas", 8, 40, "#ff7b45", "arco", 265],
  ["resp_trovao", "Respiração do Trovão", "Estrondo e Relâmpago", 7, 38, "#ffe083", "raio", 95],
  ["resp_fera", "Respiração da Fera", "Presas Duplas", 6, 35, "#c2edff", "garras", 125],
  ["resp_inseto", "Respiração do Inseto", "Dança da Borboleta", 6, 33, "#dd9cff", "feixe", 185],
  ["resp_nevoa", "Respiração da Névoa", "Nuvens Obscuras", 7, 37, "#bfdedc", "onda", 215],
  ["resp_vento", "Respiração do Vento", "Redemoinho de Poeira", 7, 39, "#a1f58b", "arco", 135],
  ["resp_pedra", "Respiração da Pedra", "Serpentinita Bipolar", 8, 42, "#edbc8c", "garras", 290],
  ["resp_sol", "Respiração do Sol", "Dança do Deus do Fogo", 11, 52, "#ffbb69", "arco", 310],
  ["resp_lua", "Respiração da Lua", "Lua Negra · Palácio Noturno", 11, 50, "#d5a8ff", "garras", 240],
] as const satisfies readonly Tecnica[];

export const tecnicasDeKi = [
  ["db_kame", "Kamehameha", "Onda Kamehameha", 8, 43, "#6bdcff", "feixe", 270],
  ["db_galick", "Galick Gun", "Canhão Galick", 8, 44, "#d898ff", "feixe", 215],
  ["db_kienzan", "Kienzan", "Disco Cortante", 7, 39, "#ffdd83", "disco", 170],
  ["db_makanko", "Makankōsappō", "Canhão de Feixe Especial", 9, 47, "#f6a6ff", "espiral", 330],
  ["db_big_bang", "Big Bang Attack", "Explosão Big Bang", 10, 50, "#9fb9ff", "esfera", 240],
  ["db_genki", "Genki Dama", "Esfera do Espírito", 13, 58, "#adf4ff", "esfera", 410],
  ["db_final_flash", "Final Flash", "Clarão Final", 12, 55, "#ffd369", "feixe", 360],
] as const satisfies readonly Tecnica[];

function item(chave: string, nome: string, obra: string, slot: Slot, raridade: Raridade, descricao: string, efeitos: EfeitosDoItem): Item {
  return { chave, nome, obra, slot, raridade, descricao, efeitos };
}

function poder([chave, nome, golpe, custo, dano]: Tecnica, obra: string, raridade: Raridade): Item {
  const tipo = ["resp_chamas", "resp_sol"].includes(chave) ? "fogo" : obra === ds || chave === "db_kienzan" ? "corte" : "energia";
  return item(chave, nome, obra, "poder", raridade, golpe + " · " + dano + " de dano base por " + custo + " de energia.",
    { habilidade: { id: "habilidade:" + chave, nome: golpe, custo, dano, tipo } });
}

export const itensDaExpansao: readonly Item[] = [
  ...respiracoes.map((r, i) => poder(r, ds, i >= 8 ? 4 : i % 3 === 0 ? 1 : 2)),
  item("ds_haori", "Haori Xadrez", ds, "tronco", 1, "+5 de defesa e +6 de Resistência.", { def: 5, res: 6 }),
  item("ds_uniforme", "Uniforme da Corporação", ds, "calca", 1, "+5 de defesa e +2 de ataque.", { def: 5, atk: 2 }),
  item("ds_hanafuda", "Brincos Hanafuda", ds, "cabeca", 3, "+7 de ataque e +8 de Resistência.", { atk: 7, res: 8 }),
  item("ds_sandalias", "Sandálias do Caçador", ds, "pes", 1, "+8 de Resistência e +2 de defesa.", { res: 8, def: 2 }),
  item("ds_mascara", "Máscara de Raposa", ds, "cabeca", 2, "+6 de defesa. Absorve até 10 de dano do primeiro golpe.", { def: 6, barreira: 10 }),
  ...tecnicasDeKi.map((t, i) => poder(t, db, i >= 5 ? 4 : i >= 3 ? 3 : 2)),
  item("db_armadura", "Armadura Saiyajin", db, "tronco", 3, "+11 de defesa e +4 ao defender.", { def: 11, guarda: 4 }),
  item("db_scouter", "Scouter", db, "cabeca", 2, "+4 de ataque e +10 de Resistência.", { atk: 4, res: 10 }),
  item("db_botasp", "Botas Saiyajin", db, "pes", 2, "+5 de defesa e +9 de Resistência.", { def: 5, res: 9 }),
  item("db_gi", "Gi da Escola da Tartaruga", db, "tronco", 2, "+7 de ataque e +6 de Resistência.", { atk: 7, res: 6 }),
  item("db_manto", "Manto do Piccolo", db, "tronco", 2, "+9 de defesa e +7 de Resistência.", { def: 9, res: 7 }),
  item("db_anel", "Anel de Treinamento", db, "passiva", 1, "+5 de ataque e +8 de Resistência.", { atk: 5, res: 8 }),
  item("db_capsula", "Cápsula de Emergência", db, "consumivel", 2, "Recupera 48 PV e 17 de energia.", { cura: 48, carga: 17 }),
  item("db_nuvem", "Nuvem Voadora", db, "passiva", 3, "+12 de Resistência. Absorve até 15 do primeiro dano.", { res: 12, barreira: 15 }),
];

export const andarInicialDoItem: ReadonlyMap<string, number> = new Map(itensDaExpansao.map(i => [i.chave, i.obra === ds ? 11 : 16]));

const simbolos = [
  "≋","♨","ϟ","⋔","❀","≡","↻","◆","☀","☾","▦","▤","☷","⌁","◇",
  "◉","⟫","⦿","◎","✸","◯","✷","⛨","⊡","»","◈","⚑","◌","✚","☁",
];
export const iconesDaExpansao = new Map(itensDaExpansao.map((i, index) => {
  const tecnica = [...respiracoes, ...tecnicasDeKi].find(t => t[0] === i.chave);
  return [i.chave, { simbolo: simbolos[index] ?? "✦", cor: tecnica?.[5] ?? (i.obra === ds ? "#f3a8ce" : "#ffd28a") }] as const;
}));
