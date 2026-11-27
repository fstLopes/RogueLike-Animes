import { nomesDosAtributos } from "../../dados/andares.ts";
import { catalogo, nomesDosSlots, nomesDosTiposDeDano, raridades, slotsDeEquipamento } from "../../dados/catalogo.ts";
import { origemDoDrop } from "../../dados/inimigos.ts";
import type { EstadoDaPartida, ItemDoInventario } from "../../dominio/tipos.ts";
import {
  SLOTS_COM_MAESTRIA,
  SLOTS_DE_ARMADURA,
  dadosDoItem,
  duracaoDaForma,
  estaEquipado,
  formasDoItem,
  itemPorId,
  maestria,
  podeUsar,
  precoNaLoja,
} from "../../motor/consultas.ts";
import { abasDaMochila, type EstadoDaInterface } from "../estado-da-interface.ts";
import { arteDoItem, botao, esc } from "../html.ts";

function fichaDoItem(estado: EstadoDaPartida, item: ItemDoInventario): string {
  const { nome, obra, slot, raridade, descricao, efeitos: e } = dadosDoItem(item);
  const nivel = maestria(item);
  const ativo = estaEquipado(estado, item);
  const origem = origemDoDrop(item.chave);
  const fatos: [string, string][] = [
    ["Anime", obra],
    ["Categoria", nomesDosSlots[slot]],
    ["Raridade", raridades[raridade]],
    ["Estado", ativo ? "Equipado" : "Na mochila"],
    ["Melhoria", "+" + item.melhoria],
    [
      "Origem",
      origem
        ? origem.nome + " · " + Math.round(origem.chanceDeDrop * 100) + "% de drop"
        : item.chave === "leopard"
          ? "Evento do 2º andar ou sorteio geral"
          : "Recompensas, eventos e lojas da torre",
    ],
  ];
  if (!origem) fatos.push(["Preço na loja", precoNaLoja(item.chave) + " moedas"]);
  if (SLOTS_COM_MAESTRIA.includes(slot)) {
    fatos.push(["Maestria", nivel + " · " + item.xp + "/15 XP"], ["Próximo marco", nivel === 3 ? "Concluída" : [3, 7, 15][nivel] + " XP"]);
  }
  for (const [chave, rotulo] of Object.entries(nomesDosAtributos) as [keyof typeof nomesDosAtributos, string][]) {
    const valor = e[chave];
    if (valor) fatos.push([rotulo, "+" + valor]);
  }
  if ((SLOTS_DE_ARMADURA as readonly string[]).includes(slot) && item.melhoria) fatos.push(["Defesa da melhoria", "+" + item.melhoria * 2]);

  const efeitos: string[] = [];
  const extra = 2 * (nivel + item.melhoria);
  if (e.golpe)
    efeitos.push(
      `Ataque de ${nomesDosTiposDeDano[e.golpe.tipo]} · ${e.golpe.dano + extra} de dano antes dos atributos do personagem. Recupera 2 de energia.`,
    );
  if (e.habilidade) {
    const h = e.habilidade;
    efeitos.push(
      `${h.nome} · ${h.dano + extra} de dano de ${nomesDosTiposDeDano[h.tipo]} antes dos atributos. Custa ${h.custo} de energia.` +
        (slot === "arma" ? " Requer maestria II." : "") +
        (h.tipo === "sombra" ? " Requer uma sombra de inimigo derrotado." : ""),
    );
  }
  if (e.especial)
    efeitos.push(`${e.especial.nome} · ${e.especial.custo} de energia. Evita uma ação inimiga, uma vez por luta. Requer maestria II.`);
  if (e.barreira) efeitos.push(`Absorve até ${e.barreira + nivel * 2} de dano do primeiro golpe recebido.`);
  if (e.previsao) efeitos.push("Revela a intenção do turno seguinte e recupera 2 de energia extra ao defender um ataque.");
  if (e.contra) efeitos.push(`Após defender, o próximo ataque da arma recebe +${e.contra} de dano.`);
  if (e.sequencia) efeitos.push("Acertos em sequência aumentam o dano em 2, até +6.");
  if (e.guarda) efeitos.push(`Defender reduz o dano recebido em mais ${e.guarda}.`);
  if (e.cura || e.carga) efeitos.push(`Um uso · recupera ${e.cura ?? 0} PV e ${e.carga ?? 0} de energia.`);
  if (e.exige)
    fatos.push(["Poder exigido", (catalogo[e.exige]?.nome ?? e.exige) + (podeUsar(estado, item) ? " · equipado" : " · falta equipar")]);
  const formas = formasDoItem(item).map(
    (f) => `${f.nome} · custo ${f.custo} · +${f.atk} ataque / +${f.def} defesa · maestria ${f.maestriaMinima} e nível ${f.nivelMinimo}.`,
  );
  if (formas.length)
    formas.push(`Uma ativação por combate. Com sua Resistência atual, a forma dura ${duracaoDaForma(estado)} turnos após ativar.`);
  const lista = (titulo: string, linhas: string[]) =>
    linhas.length ? `<section><h3>${titulo}</h3><ul class="moves">${linhas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></section>` : "";

  return (
    `<div class="item-sheet r${raridade}${raridade >= 3 ? " brilho" : ""}"><div>${botao("fechar-ficha", null, "← Voltar à mochila", "button secundario")}</div>` +
    `<div class="sheet-top">${arteDoItem(item.chave)}<div class="sheet-titulo"><div class="loot-selos"><span class="selo-raridade">${raridades[raridade]}</span>` +
    `<span class="tag">${nomesDosSlots[slot]}</span>${ativo ? '<span class="worn">✓ Equipado</span>' : ""}</div>` +
    `<h2 tabindex="-1">${esc(nome)}</h2><small>${esc(obra)}</small></div></div><p class="sheet-descricao">${esc(descricao)}</p>` +
    `<dl class="facts">${fatos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` +
    lista("Habilidades e efeitos", efeitos) +
    lista("Transformações", formas) +
    (slot === "consumivel"
      ? ""
      : botao("equipar", item.id, ativo ? "Retirar equipamento" : "Equipar", "button primary", estado.tela === "combate")) +
    `</div>`
  );
}

export function telaDaMochila(estado: EstadoDaPartida, ui: EstadoDaInterface): string {
  const inspecionado = itemPorId(estado, ui.inspecionado);
  if (inspecionado) return fichaDoItem(estado, inspecionado);
  const nota =
    estado.tela === "combate"
      ? "Consulta durante o combate. Equipe os itens entre as lutas."
      : "Escolha o equipamento para a próxima luta.";
  const aba = ui.abaDaMochila;
  const visiveis = estado.itens.filter((item) => aba === "todos" || item.slot === aba);
  const abas = Object.entries(abasDaMochila)
    .map(([chave, [rotulo]]) => {
      const selecionada = chave === aba;
      const quantidade = chave === "todos" ? estado.itens.length : estado.itens.filter((i) => i.slot === chave).length;
      return `<button type="button" role="tab" class="bag-tab" id="aba-${chave}" aria-controls="painel-mochila" aria-selected="${selecionada}" tabindex="${selecionada ? 0 : -1}" data-acao="aba-mochila" data-arg="${chave}">${rotulo} <b>${quantidade}</b></button>`;
    })
    .join("");
  const cartas = visiveis
    .map((item) => {
      const { nome, obra, slot, raridade, descricao, efeitos: e } = dadosDoItem(item);
      const ativo = estaEquipado(estado, item);
      const progresso = SLOTS_COM_MAESTRIA.includes(slot)
        ? `<div><small>Maestria ${maestria(item)} · ${item.xp}/15</small><div class="mastery"><i style="width:${(100 * item.xp) / 15}%"></i></div></div>`
        : "";
      const requisito = e.exige ? `<p>Exige ${esc(catalogo[e.exige]?.nome)} equipado.</p>` : "";
      return (
        `<article class="loot inspect-card r${raridade}${raridade >= 3 ? " brilho" : ""}${ativo ? " equipado" : ""}">` +
        `<button type="button" class="inspect-link" data-acao="inspecionar" data-arg="${item.id}" aria-label="Ver ficha de ${esc(nome)}"></button>` +
        `<div class="loot-top">${arteDoItem(item.chave)}<div class="loot-selos"><span class="selo-raridade">${raridades[raridade]}</span>` +
        `${ativo ? '<span class="worn">✓ Equipado</span>' : ""}</div></div>` +
        `<div class="loot-nome"><h3>${esc(nome)}${item.melhoria ? ` <span class="melhoria">+${item.melhoria}</span>` : ""}</h3><small>${esc(obra)} · ${nomesDosSlots[slot]}</small></div>` +
        `<p>${esc(descricao)}</p>${progresso}${requisito}<small class="ver-ficha" aria-hidden="true">Ver ficha ↗</small>` +
        `<footer>${slot === "consumivel" ? "<small>Use no menu de combate</small>" : botao("equipar", item.id, ativo ? "Retirar" : "Equipar", ativo ? "button secundario" : "button", estado.tela === "combate")}</footer></article>`
      );
    })
    .join("");
  const vazio = estado.itens.length
    ? "Você ainda não encontrou itens deste tipo."
    : "Vença uma luta para escolher sua primeira recompensa.";
  const podeEquiparMelhores =
    estado.tela !== "combate" && estado.itens.some((i) => (slotsDeEquipamento as readonly string[]).includes(i.slot));
  const tituloDaAba = abasDaMochila[aba]?.[0] ?? "Todos";
  return (
    `<div class="bag-head"><div class="eyebrow">Equipamentos · Andar ${estado.andar}</div><div class="row"><h2 tabindex="-1">Mochila</h2>${botao("mochila", null, "Voltar à jornada", "button secundario")}</div><p>${nota}</p></div>` +
    `<div class="bag-body"><div class="bag-tools">${botao("equipar-melhores", null, "Equipar melhores", "button primary", !podeEquiparMelhores)}<small>Equilibra ataque, defesa e formas disponíveis.</small></div>` +
    `<div class="bag-tabs" role="tablist" aria-label="Tipos de item">${abas}</div>` +
    `<section role="tabpanel" tabindex="0" id="painel-mochila" aria-labelledby="aba-${aba}"><div class="bag-caption"><h3>${tituloDaAba}</h3><small>${visiveis.length}${visiveis.length === 1 ? " item" : " itens"}</small></div>` +
    (cartas
      ? `<div class="bag-grid">${cartas}</div>`
      : `<div class="empty-bin"><b>${estado.itens.length ? "Aba vazia" : "Mochila vazia"}</b>${vazio}</div>`) +
    `</section></div>`
  );
}
