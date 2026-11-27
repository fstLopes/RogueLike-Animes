import { TOTAL_DE_ANDARES, regioes } from "../../dados/andares.ts";
import type { EstadoDaPartida } from "../../dominio/tipos.ts";
import { atributos } from "../../motor/consultas.ts";
import { descreverStatus, type StatusDaSincronizacao } from "../../online/sincronizacao.ts";
import { esc, medidor } from "../html.ts";

/** Trilha dos dez andares: concluídos (✓), atual (dourado) e chefes (losango ♛). */
function trilhaDaTorre(estado: EstadoDaPartida): string {
  const comecou = estado.tela !== "titulo";
  const venceu = estado.tela === "vitoria";
  const regiao = (inicio: number, nome: string) => {
    const andares = Array.from({ length: 5 }, (_, i) => {
      const andar = inicio + i;
      const chefe = andar % 5 === 0;
      const concluido = comecou && (andar < estado.andar || (venceu && andar === estado.andar));
      const atual = comecou && !concluido && andar === estado.andar;
      const estadoTexto = concluido ? "concluído" : atual ? "andar atual" : "a seguir";
      const classes = ["trilha-andar", chefe ? "chefe" : "", concluido ? "concluido" : "", atual ? "atual" : ""].filter(Boolean).join(" ");
      const marca = concluido ? "✓" : chefe ? "♛" : String(andar);
      return (
        `<li class="${classes}" aria-label="Andar ${andar}${chefe ? ", chefe" : ""}, ${estadoTexto}"${atual ? ' aria-current="step"' : ""}>` +
        `<span class="no"><span>${marca}</span></span><span aria-hidden="true">${andar}</span></li>`
      );
    }).join("");
    return `<li class="trilha-regiao"><small>${nome}</small><ol class="trilha-andares">${andares}</ol></li>`;
  };
  return `<ol class="trilha" aria-label="Progresso na torre">${regioes.map(r => regiao(r.inicio, r.nome)).join("")}</ol>`;
}

export function painelLateral(estado: EstadoDaPartida, status: StatusDaSincronizacao, usuario: string | null): string {
  const comecou = estado.tela !== "titulo";
  const lutando = estado.tela === "combate" && estado.batalha;
  let html = "";
  if (comecou && estado.tela !== "derrota") {
    const s = atributos(estado);
    html +=
      `<section class="panel pad hud-personagem" aria-label="Personagem"><div class="hud-titulo" style="margin:0"><h3>Personagem</h3><span class="nivel">Nível ${estado.nivel}</span></div>` +
      medidor("Vida", lutando ? estado.batalha!.pv : s.pv, s.pv, "", "heroi") +
      medidor("Energia", lutando ? estado.batalha!.energia : s.energia, s.energia, "energy", "energia") +
      medidor(estado.nivel >= 10 ? "XP · nível máximo" : "XP para o próximo nível", Math.min(3, estado.xp), 3, "exp") +
      `<div class="atributos">` +
      `<div class="atributo"><small>Ataque</small><strong>${s.atk}</strong></div>` +
      `<div class="atributo"><small>Defesa</small><strong>${s.def}</strong></div>` +
      `<div class="atributo"><small>Resist.</small><strong>${s.res}</strong></div>` +
      `<div class="atributo moedas"><small>Moedas</small><strong>${estado.moedas}</strong></div>` +
      `</div></section>`;
  }
  html +=
    `<section class="panel pad" aria-label="Torre"><div class="hud-titulo"><h3>Torre</h3><span class="tag">${comecou ? `Andar ${estado.andar} de ${TOTAL_DE_ANDARES}` : `${TOTAL_DE_ANDARES} andares`}</span></div>` +
    trilhaDaTorre(estado) +
    `</section>`;
  const { rotulo, classe } = descreverStatus(status, usuario);
  html +=
    `<section class="panel pad conta-resumo" aria-label="Save"><div class="hud-titulo" style="margin:0 0 8px"><h3>Save</h3>${usuario ? `<span class="tag">${esc(usuario)}</span>` : ""}</div>` +
    `<p class="status-save ${classe}" role="status">${esc(rotulo)}</p></section>`;
  return html;
}

export function registroDaJornada(estado: EstadoDaPartida): string {
  if (!estado.registro.length) return "";
  return (
    `<section class="log" aria-label="Registro da jornada"><div class="painel-cabecalho"><h3>Registro</h3><small>Mais recente primeiro</small></div>` +
    `<ul class="feed" aria-live="polite">${estado.registro.map((linha, i) => `<li${i === 0 ? ' class="ultima"' : ""}>${esc(linha)}</li>`).join("")}</ul></section>`
  );
}
