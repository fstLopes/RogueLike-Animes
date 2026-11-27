import { nomesDosAtributos } from "../../dados/andares.ts";
import { nomesDosSlots, slotsDeEquipamento } from "../../dados/catalogo.ts";
import type { Atributo, EstadoDaPartida } from "../../dominio/tipos.ts";
import { atributos, dadosDoItem, equipadosNoSlot } from "../../motor/consultas.ts";
import { ganhoDoAtributo } from "../../motor/progressao.ts";
import type { EstadoDaInterface } from "../estado-da-interface.ts";
import { arteDoItem, botao, esc } from "../html.ts";

export function telaDoPerfil(estado: EstadoDaPartida, ui: EstadoDaInterface): string {
  const s = atributos(estado);
  const emCombate = estado.tela === "combate";
  const abas =
    `<div class="bag-tabs" role="tablist" aria-label="Perfil">` +
    (
      [
        ["equipados", "Equipados"],
        ["atributos", "Atributos"],
      ] as const
    )
      .map(
        ([chave, rotulo]) =>
          `<button type="button" class="bag-tab" id="perfil-${chave}" role="tab" aria-selected="${ui.abaDoPerfil === chave}" tabindex="${ui.abaDoPerfil === chave ? 0 : -1}" aria-controls="painel-perfil" data-acao="aba-perfil" data-arg="${chave}">${rotulo}${chave === "atributos" && estado.pontos ? " <b>" + estado.pontos + "</b>" : ""}</button>`,
      )
      .join("") +
    `</div>`;
  const equipamento = slotsDeEquipamento
    .map((slot) => {
      const lista = equipadosNoSlot(estado, slot);
      const pecas = lista
        .map(
          (item) =>
            `<div class="peca r${dadosDoItem(item).raridade}">${arteDoItem(item.chave)}<strong>${esc(dadosDoItem(item).nome)}</strong></div>`,
        )
        .join("");
      return `<article class="card slot-perfil${lista.length ? "" : " vazio"}"><small>${nomesDosSlots[slot]}${slot === "passiva" ? " · " + lista.length + "/3" : ""}</small>${pecas || '<span class="soft">Espaço vazio</span>'}</article>`;
    })
    .join("");
  const pontos =
    `<h3>${estado.pontos}${estado.pontos === 1 ? " ponto disponível" : " pontos disponíveis"}</h3>` +
    `<p class="help">${emCombate ? "Distribua os pontos entre combates." : "Cada melhoria custa 1 ponto."}</p><div class="cards">` +
    (Object.entries(nomesDosAtributos) as [Atributo, string][])
      .map(
        ([chave, rotulo]) =>
          `<article class="card atributo-perfil"><small>${rotulo}</small><strong class="valor">${s[chave]}</strong><small>+${estado.bonus[chave]} por pontos distribuídos</small>` +
          botao("atributo", chave, "Melhorar +" + ganhoDoAtributo(chave), "button", emCombate || !estado.pontos) +
          `</article>`,
      )
      .join("") +
    `</div>`;
  return (
    `<div class="bag-head"><div class="eyebrow">Personagem · Nível ${estado.nivel}</div><div class="row"><h2 tabindex="-1">Perfil</h2>${botao("perfil", null, "Voltar à jornada", "button secundario")}</div></div>` +
    `<div class="bag-body">${abas}<section class="main-content" id="painel-perfil" role="tabpanel" aria-labelledby="perfil-${ui.abaDoPerfil}">` +
    (ui.abaDoPerfil === "equipados" ? `<div class="cards">${equipamento}</div>` : pontos) +
    `</section></div>`
  );
}
