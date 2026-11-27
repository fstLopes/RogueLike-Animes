// Pequenos construtores de HTML. Todo texto que vem do estado passa por `esc`,
// porque saves importados ou vindos do servidor são dados externos.
import { posicaoDoRecorte, recorteDoIcone } from "../dados/arte.ts";
import { iconesDaExpansao } from "../dados/expansao.ts";

const ENTIDADES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c] ?? c);
}

export function botao(
  acao: string,
  arg: string | number | null,
  conteudo: string,
  classes = "button",
  desativado = false,
  extras = "",
): string {
  return `<button type="button" class="${classes}" data-acao="${esc(acao)}" data-arg="${esc(arg ?? "")}"${desativado ? " disabled" : ""}${extras ? " " + extras : ""}>${conteudo}</button>`;
}

/** Barra com rótulo e números ao lado. `alvo` liga a barra às animações (data-medidor). */
export function medidor(rotulo: string, atual: number, maximo: number, estilo = "", alvo = ""): string {
  const largura = Math.max(0, Math.min(100, (atual / Math.max(1, maximo)) * 100));
  return (
    `<div class="medidor"><div class="meter-label"><span>${esc(rotulo)}</span><strong${alvo ? ` data-valor="${alvo}"` : ""}>${atual} / ${maximo}</strong></div>` +
    `<div class="meter ${estilo}" role="meter" aria-label="${esc(rotulo)}" aria-valuemin="0" aria-valuemax="${maximo}" aria-valuenow="${atual}"${alvo ? ` data-medidor="${alvo}" data-maximo="${maximo}"` : ""}><i style="width:${largura}%"></i></div></div>`
  );
}

export function arteDoItem(chave: string): string {
  const icone = iconesDaExpansao.get(chave);
  if (icone) return `<span class="item-art icone-expansao" aria-hidden="true" style="--tom-icone:${icone.cor}">${esc(icone.simbolo)}</span>`;
  const { folha, quadro } = recorteDoIcone(chave);
  const classe = folha === "base" ? "item-art" : "item-art " + folha;
  return `<span class="${classe}" aria-hidden="true" style="background-position:${posicaoDoRecorte(quadro)}"></span>`;
}

export function historia(lugar: string, texto: string): string {
  return `<p class="story"><strong>${esc(lugar)}</strong>${esc(texto)}</p>`;
}

/** Cena de sala (rota, evento, loja, descanso, recompensa). `variante` define o acento. */
export function arena(rotulo: string, titulo: string, detalhe: string, simbolo = "", nevoa = false, extra = "", variante = ""): string {
  return (
    `<div class="arena${nevoa ? " mist" : ""}${variante ? " " + variante : ""}"><div class="arc-lines" aria-hidden="true"></div>` +
    `<div class="enemy-symbol" aria-hidden="true">${esc(simbolo)}</div>` +
    `<div class="eyebrow">${esc(rotulo)}</div><h2 tabindex="-1">${esc(titulo)}</h2><p>${esc(detalhe)}</p>${extra}</div>`
  );
}

export function eclipse(tamanho: number, classes = ""): string {
  return `<span class="eclipse ${classes}" style="--tam:${tamanho}px" aria-hidden="true"></span>`;
}
