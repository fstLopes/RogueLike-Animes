import { TOTAL_DE_ANDARES, historiasDeSala, regiaoDoAndar, rotas, tiposDeSala } from "../../dados/andares.ts";
import { respiracoes } from "../../dados/expansao.ts";
import { catalogo, nomesDosSlots, raridades } from "../../dados/catalogo.ts";
import { inimigoDoAndar } from "../../dados/inimigos.ts";
import type { EstadoDaPartida, TipoDeSala } from "../../dominio/tipos.ts";
import { dadosDoItem, precoNaLoja } from "../../motor/consultas.ts";
import { podeMelhorar, podeTreinar } from "../../motor/progressao.ts";
import { registroDaJornada } from "./lateral.ts";
import { arena, arteDoItem, botao, eclipse, esc } from "../html.ts";

/** Carta de item. Lendárias e Míticas recebem a classe `discovery` (revelação dourada ou rosa). */
export function carta(chave: string, acao: string, extra = "", desativada = false): string {
  const item = catalogo[chave];
  if (!item) return "";
  return botao(
    acao,
    chave,
    `<span class="carta-topo">${arteDoItem(chave)}<span class="selo-raridade">${raridades[item.raridade]}</span></span>` +
      `<strong>${esc(item.nome)}</strong><small>${esc(item.obra)} · ${nomesDosSlots[item.slot]}</small><p>${esc(item.descricao)}</p>${extra}`,
    `card carta-item r${item.raridade}${item.raridade >= 3 ? " discovery" : ""}`,
    desativada,
  );
}

export function revelacaoDoDrop(chave: string): string {
  const item = catalogo[chave];
  if (!item) return "";
  return (
    `<div data-arg="${esc(chave)}" class="headline-drop r${item.raridade}${item.raridade >= 3 ? " discovery" : ""}">` +
    `${arteDoItem(chave)}<div><div class="rarity-stamp">Drop exclusivo · ${raridades[item.raridade]}</div>` +
    `<strong>${esc(item.nome)}</strong><p>Guardado na mochila</p></div></div>`
  );
}

/** Painel que junta a descrição da sala com as opções do jogador. */
function escolhas(titulo: string, texto: string, opcoes: string, rodape = "", classe = ""): string {
  return (
    `<section class="escolhas ${classe}"><header class="escolhas-texto"><span class="eyebrow">${esc(titulo)}</span><p>${esc(texto)}</p></header>` +
    `<div class="cards">${opcoes}</div>${rodape ? `<div class="escolhas-rodape">${rodape}</div>` : ""}</section>`
  );
}

const ICONES_DE_SALA: Record<TipoDeSala, string> = { combate: "⚔", evento: "✦", loja: "◈", descanso: "☾", chefe: "♛" };

function maiorRecompensa(estado: EstadoDaPartida) {
  return [...estado.itens].sort((a, b) => dadosDoItem(b).raridade - dadosDoItem(a).raridade || b.id - a.id)[0];
}

function telaDeVitoria(estado: EstadoDaPartida): string {
  const total = estado.andar;
  const chefe = inimigoDoAndar(total).nome;
  const continuar = total === 10 ? botao("rota", "combate", "Continuar no andar 11", "button primary grande") : "";
  const destaque = maiorRecompensa(estado);
  const dados = destaque ? dadosDoItem(destaque) : null;
  const resumo =
    `<div class="resumo-item"><small>Andares concluídos</small><strong>${total}<span>/${total}</span></strong></div>` +
    `<div class="resumo-item"><small>Nível final</small><strong>${estado.nivel}</strong></div>` +
    `<div class="resumo-item ouro"><small>Moedas</small><strong>${estado.moedas}</strong></div>` +
    (destaque && dados
      ? `<div class="resumo-item destaque r${dados.raridade}"><small>Recompensa de destaque</small><div class="resumo-recompensa">${arteDoItem(destaque.chave)}` +
        `<div><strong>${esc(dados.nome)}</strong><span class="selo-raridade">${raridades[dados.raridade]}</span></div></div></div>`
      : "");
  const historico = estado.historico
    .map(
      (h) =>
        `<li class="${h.tipo === "chefe" ? "chefe" : ""}"><span class="historico-andar">${h.andar}</span>` +
        `<span class="historico-sala"><span aria-hidden="true">${ICONES_DE_SALA[h.tipo]}</span> ${tiposDeSala[h.tipo].nome}</span></li>`,
    )
    .join("");
  return (
    `<section class="tela-final vitoria" aria-labelledby="titulo-final">` +
    `<div class="final-cena" aria-hidden="true"><div class="linhas-velocidade"></div>${eclipse(200, "girando")}<div class="faiscas"></div></div>` +
    `<div class="final-texto"><span class="eyebrow">${total} andares concluídos</span>` +
    `<h2 id="titulo-final" class="titulo-impacto" tabindex="-1">Torre conquistada</h2>` +
    `<p>Você derrotou ${esc(chefe)} e terminou a jornada no nível ${estado.nivel}.</p></div>` +
    `<div class="resumo" aria-label="Resumo da jornada">${resumo}</div>` +
    `<div class="acoes-finais">${continuar}${botao("iniciar", null, "Nova jornada", continuar ? "button secundario grande" : "button primary grande")}${botao("mochila", null, "Ver mochila", "button secundario grande")}</div>` +
    `<section class="historico" aria-label="Histórico da jornada"><div class="painel-cabecalho"><h3>Histórico da jornada</h3><small>${estado.historico.length} salas</small></div>` +
    `<ol class="historico-lista">${historico}</ol></section>` +
    registroDaJornada(estado) +
    `</section>`
  );
}

function telaDeDerrota(estado: EstadoDaPartida): string {
  return (
    `<section class="tela-final derrota" aria-labelledby="titulo-final">` +
    `<div class="final-cena" aria-hidden="true">${eclipse(120)}</div>` +
    `<div class="final-texto"><span class="eyebrow">Andar ${estado.andar} · ${esc(inimigoDoAndar(estado.andar).nome)}</span>` +
    `<h2 id="titulo-final" class="titulo-impacto" tabindex="-1">Fim da jornada</h2>` +
    `<p>Você chegou ao ${estado.andar}º andar, no nível ${estado.nivel}. A próxima subida começa no 1º andar com a mochila vazia.</p></div>` +
    `<div class="acoes-finais">${botao("iniciar", null, "Tentar de novo", "button primary grande")}</div>` +
    `</section>`
  );
}

function telaDeTitulo(): string {
  return (
    `<section class="tela-final titulo" aria-labelledby="titulo-final">` +
    `<div class="final-cena" aria-hidden="true"><div class="linhas-velocidade"></div>${eclipse(170, "girando")}</div>` +
    `<div class="final-texto"><span class="eyebrow">Roguelike por turnos</span><h2 id="titulo-final" class="titulo-impacto" tabindex="-1">Torre do Eclipse</h2>` +
    `<p>De East Blue à Arena do Ki. Escolha sua rota e monte seu equipamento a cada luta.</p></div>` +
    `<div class="acoes-finais">${botao("iniciar", null, "Iniciar jornada", "button primary grande")}</div>` +
    `<ul class="fatos-titulo"><li><strong>${TOTAL_DE_ANDARES}</strong> andares</li><li><strong>${TOTAL_DE_ANDARES / 5}</strong> chefes</li><li><strong>${Object.keys(catalogo).length}</strong> itens</li><li><strong>${respiracoes.length}</strong> Respirações</li></ul>` +
    `<p class="help centro">Você começa sem equipamento. No modo Normal, vida e energia são restauradas antes de cada luta.</p>` +
    `</section>`
  );
}

export function telaDeSala(estado: EstadoDaPartida): string {
  const sala = estado.sala;
  const metade = Math.floor((estado.andar - 1) / 5);
  const regiao = regiaoDoAndar(estado.andar);
  const nevoa = regiao.tema === "mist";
  switch (estado.tela) {
    case "recompensa": {
      const itens = sala.itens ?? [];
      return (
        arena(
          "Andar " + estado.andar,
          "Vitória",
          `+${sala.xpGanho ?? 0} XP · +${sala.moedas ?? 0} moedas`,
          "✦",
          nevoa,
          "",
          "sala-recompensa",
        ) +
        `<div class="main-content">${sala.drop ? revelacaoDoDrop(sala.drop) : ""}` +
        (itens.length
          ? escolhas(
              "Escolha uma recompensa",
              "Leve um destes itens para a mochila. Os outros ficam para trás.",
              itens.map((c) => carta(c, "pegar")).join(""),
            )
          : `<div>${botao("continuar", null, "Continuar a jornada", "button primary")}</div>`) +
        `</div>`
      );
    }
    case "rota":
      return (
        arena(`Andar ${estado.andar} concluído`, "Escolha a rota", "Próximo andar · " + (estado.andar + 1), "✧", nevoa, "", "sala-rota") +
        `<div class="main-content">` +
        escolhas(
          "Bifurcação",
          (rotas[estado.andar] ?? []).length > 1
            ? "Dois caminhos levam ao próximo andar. Escolha um."
            : "Só há um caminho para o próximo andar.",
          (rotas[estado.andar] ?? [])
            .map((tipo) => {
              const t = tiposDeSala[tipo];
              return botao(
                "rota",
                tipo,
                `<span class="rota-icone" aria-hidden="true">${t.icone}</span><strong>${t.nome}</strong><p>${t.dica}</p>`,
                `card carta-rota rota-${tipo}`,
              );
            })
            .join(""),
        ) +
        `</div>`
      );
    case "evento":
      return (
        arena(
          `Andar ${estado.andar} · Evento`,
          regiao.evento,
          "Escolha um item encontrado ou fique com as moedas.",
          "✦",
          nevoa,
          "",
          "sala-evento",
        ) +
        `<div class="main-content">` +
        escolhas(
          "O que aconteceu",
          historiasDeSala.evento[metade] ?? historiasDeSala.evento[0],
          (sala.itens ?? []).map((c) => carta(c, "pegar")).join(""),
          botao("moedas-evento", null, "Ficar com +18 moedas", "button"),
          "acento-evento",
        ) +
        `</div>`
      );
    case "loja": {
      const cartas = (sala.itens ?? [])
        .map((c) => {
          const falta = precoNaLoja(c) - estado.moedas;
          return carta(
            c,
            "comprar",
            `<span class="preco${falta > 0 ? " caro" : ""}">${precoNaLoja(c)} moedas${falta > 0 ? " · faltam " + falta : ""}</span>`,
            falta > 0,
          );
        })
        .join("");
      return (
        arena(`Andar ${estado.andar} · Loja`, "Mercador da torre", `Sua bolsa tem ${estado.moedas} moedas.`, "◈", nevoa, "", "sala-loja") +
        `<div class="main-content">` +
        escolhas(
          "Encontro com o mercador",
          historiasDeSala.loja[metade] ?? historiasDeSala.loja[0],
          cartas || '<p class="soft">Estoque esgotado.</p>',
          `<span class="bolsa">Bolsa: <strong>${estado.moedas} moedas</strong></span>${botao("sair-loja", null, "Sair da loja", "button primary")}`,
          "acento-loja",
        ) +
        `</div>`
      );
    }
    case "descanso":
      return (
        arena(`Andar ${estado.andar} · Descanso`, "Acampamento", "Escolha um benefício antes de seguir.", "☾", nevoa, "", "sala-descanso") +
        `<div class="main-content">` +
        escolhas(
          "Pausa na subida",
          historiasDeSala.descanso[metade] ?? historiasDeSala.descanso[0],
          estado.itens
            .filter((item) => item.slot !== "consumivel")
            .map((item) => {
              const d = dadosDoItem(item);
              return (
                `<article class="card carta-descanso r${d.raridade}"><span class="carta-topo">${arteDoItem(item.chave)}<span class="selo-raridade">${raridades[d.raridade]}</span></span>` +
                `<strong>${esc(d.nome)}${item.melhoria ? " +" + item.melhoria : ""}</strong>` +
                `<div class="carta-botoes">${podeMelhorar(item) ? botao("melhorar", item.id, "Melhorar · +1") : ""}` +
                `${podeTreinar(item) ? botao("treinar", item.id, "Treinar · +4 maestria") : ""}</div></article>`
              );
            })
            .join("") || '<p class="soft">Nenhum equipamento para melhorar ainda.</p>',
          botao("moedas-descanso", null, "Descansar e ganhar +8 moedas", "button"),
          "acento-descanso",
        ) +
        `</div>`
      );
    case "vitoria":
      return telaDeVitoria(estado);
    case "derrota":
      return telaDeDerrota(estado);
    default:
      return telaDeTitulo();
  }
}
