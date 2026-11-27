// Correspondência entre os IDs do inventário proposto
// (docs/inventario-ids-animaveis.json, ex.: "weapon.wado.basic", "form.gum.gear_2")
// e os IDs que o projeto já usa no registro de animações e nos saves
// (ex.: "golpe:wado", "forma:gear-2"). Os IDs do projeto não mudam, porque o
// save guarda o id da forma ativa; esta tabela é a ponte entre os dois nomes.
import { catalogo } from "../dados/catalogo.ts";
import { inimigos } from "../dados/inimigos.ts";

export type DestinoDoId =
  | { tipo: "acao"; id: string }
  | { tipo: "forma"; id: string }
  | { tipo: "inimigo"; id: string }
  | { tipo: "revelacao"; id: string };

/** "Gomu Gomu no Pistol" → "gomu_gomu_no_pistol"; "forma:gear-2" → "gear_2". */
export function lesma(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[a-z]+:/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function montarTabela(): Map<string, DestinoDoId> {
  const t = new Map<string, DestinoDoId>();
  t.set("action.punch", { tipo: "acao", id: "basico:soco" });
  t.set("action.guard", { tipo: "acao", id: "basico:defender" });
  for (const [chave, item] of Object.entries(catalogo)) {
    const e = item.efeitos;
    if (e.golpe) t.set(`weapon.${chave}.basic`, { tipo: "acao", id: e.golpe.id });
    if (e.habilidade) {
      const prefixo = item.slot === "arma" ? "weapon" : "power";
      t.set(`${prefixo}.${chave}.${lesma(e.habilidade.nome)}`, { tipo: "acao", id: e.habilidade.id });
    }
    if (e.especial) t.set(`technique.${chave}.${lesma(e.especial.nome)}`, { tipo: "acao", id: e.especial.id });
    for (const f of e.formas ?? []) t.set(`form.${chave}.${lesma(f.nome)}`, { tipo: "forma", id: f.id });
    if (item.slot === "consumivel") t.set(`consumable.${chave}.use`, { tipo: "acao", id: "consumivel:" + chave });
  }
  // Os inimigos usam as animações por intenção: ataque, golpe pesado, corpo separado, névoa e emboscada.
  inimigos.forEach((inimigo, i) => {
    const andar = i + 1;
    const nome = lesma(inimigo.nome);
    t.set(`enemy.${nome}.basic`, { tipo: "inimigo", id: andar === 5 ? "inimigo:buggy-ataque" : "inimigo:ataque" });
    const pesado = andar === 10 ? "inimigo:emboscada" : andar === 15 || andar === 20 ? `inimigo:${andar}:pesado` : "inimigo:pesado";
    t.set(`enemy.${nome}.heavy`, { tipo: "inimigo", id: pesado });
  });
  t.set("enemy.buggy.split", { tipo: "inimigo", id: "inimigo:corpo-separado" });
  t.set("enemy.zabuza.mist", { tipo: "inimigo", id: "inimigo:nevoa" });
  t.set("enemy.kokushibo.charge", { tipo: "inimigo", id: "inimigo:15:preparacao" });
  t.set("enemy.vegeta.charge", { tipo: "inimigo", id: "inimigo:20:preparacao" });
  t.set("loot.legendary.reveal", { tipo: "revelacao", id: "revelacao:lendaria" });
  t.set("loot.mythic.reveal", { tipo: "revelacao", id: "revelacao:mitica" });
  return t;
}

export const tabelaDoInventario: ReadonlyMap<string, DestinoDoId> = montarTabela();

/** Destino no registro de um ID do inventário, ou null se o ID não for conhecido. */
export function resolverIdDoInventario(id: string): DestinoDoId | null {
  return tabelaDoInventario.get(id) ?? null;
}
