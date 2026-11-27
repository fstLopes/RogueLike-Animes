import { historiasDeEncontro, regiaoDoAndar } from "../../dados/andares.ts";
import { nomesDosTiposDeDano } from "../../dados/catalogo.ts";
import { inimigoDoAndar } from "../../dados/inimigos.ts";
import type { AcaoDeCombate, EstadoDaPartida } from "../../dominio/tipos.ts";
import { acoesDisponiveis, intencao, opcoesDeForma } from "../../motor/combate.ts";
import { atributos, duracaoDaForma, efeitos, itemPorId, temPrevisao } from "../../motor/consultas.ts";
import { heroiSvg } from "../heroi.ts";
import { botao, esc, historia, medidor } from "../html.ts";

/** Como cada tipo de ação aparece: ícone, rótulo e cor (classe). */
const TIPOS = {
  ataque: { icone: "⚔", rotulo: "Ataque" },
  poder: { icone: "✦", rotulo: "Poder" },
  esquiva: { icone: "◈", rotulo: "Esquiva" },
  defesa: { icone: "⛨", rotulo: "Defesa" },
  consumivel: { icone: "✚", rotulo: "Consumível" },
  forma: { icone: "✹", rotulo: "Forma" },
} as const;
type TipoVisual = keyof typeof TIPOS;

interface Apresentacao {
  tipo: TipoVisual;
  texto: string;
  /** Custo de energia (negativo = recupera energia). */
  energia: number;
  motivo: string;
}

function apresentar(estado: EstadoDaPartida, acao: AcaoDeCombate): Apresentacao {
  const b = estado.batalha;
  const item = itemPorId(estado, acao.itemId);
  const e = item ? efeitos(item) : undefined;
  const falta = b ? acao.custo - b.energia : 0;
  let motivo = falta > 0 ? `Faltam ${falta} de energia` : "";
  switch (acao.categoria) {
    case "basico":
      return acao.id === "defender"
        ? { tipo: "defesa", texto: "Recebe metade do dano", energia: -3, motivo }
        : { tipo: "ataque", texto: "10 de dano base", energia: -4, motivo };
    case "golpe":
      return {
        tipo: "ataque",
        texto: `${e?.golpe?.dano ?? 0} de dano base · ${nomesDosTiposDeDano[e?.golpe?.tipo ?? "impacto"]}`,
        energia: -2,
        motivo,
      };
    case "habilidade": {
      const h = e?.habilidade;
      if (acao.desativada) motivo = "Vença uma luta para capturar uma sombra";
      return {
        tipo: "poder",
        texto: `${h?.dano ?? 0} de dano base · ${nomesDosTiposDeDano[h?.tipo ?? "energia"]}`,
        energia: acao.custo,
        motivo,
      };
    }
    case "especial":
      if (acao.desativada) motivo = "Já usado nesta luta";
      return { tipo: "esquiva", texto: "Evita a próxima ação inimiga", energia: acao.custo, motivo };
    case "consumivel":
      return { tipo: "consumivel", texto: `+${e?.cura ?? 0} PV · +${e?.carga ?? 0} energia · uso único`, energia: 0, motivo };
    case "forma":
      return { tipo: "forma", texto: "", energia: acao.custo, motivo };
  }
}

function botaoDeAcao(id: string, nome: string, a: Apresentacao, desativado: boolean, extra = ""): string {
  const tipo = TIPOS[a.tipo];
  const energia =
    a.energia > 0
      ? `<span class="acao-custo" title="Custo de energia">${a.energia} energia</span>`
      : a.energia < 0
        ? `<span class="acao-custo ganho" title="Energia recuperada">+${-a.energia} energia</span>`
        : "";
  const rotulo = `${tipo.rotulo}: ${nome}${a.motivo ? ". Indisponível: " + a.motivo : ""}`;
  return botao(
    "turno",
    id,
    `<span class="acao-topo"><span class="acao-icone" aria-hidden="true">${tipo.icone}</span>${tipo.rotulo}${energia}</span>` +
      `<strong>${esc(nome)}</strong>${a.texto ? `<small>${esc(a.texto)}</small>` : ""}${extra}` +
      (a.motivo ? `<small class="acao-motivo">${esc(a.motivo)}</small>` : ""),
    `button action acao-${a.tipo}`,
    desativado,
    `aria-label="${esc(rotulo)}"`,
  );
}

const ORDEM: Record<TipoVisual, number> = { ataque: 0, poder: 1, esquiva: 2, defesa: 3, consumivel: 4, forma: 5 };

/** Arena do combate: texto, herói (com a forma ativa) e inimigo, mais a camada de efeitos. */
export function arenaDeCombate(estado: EstadoDaPartida): string {
  const b = estado.batalha;
  const inimigo = inimigoDoAndar(estado.andar);
  const regiao = regiaoDoAndar(estado.andar);
  const forma = b?.forma;
  return (
    `<div class="arena combate ${regiao.tema}" data-arena>` +
    `<div class="arc-lines" aria-hidden="true"></div>` +
    `<div class="arena-texto"><div class="eyebrow">${esc(regiao.nome)} · Andar ${estado.andar}</div>` +
    `<h2 tabindex="-1">${esc(inimigo.nome)}</h2>` +
    `<div class="chips-arena"><span class="chip">Turno ${b?.turno ?? 1}</span>` +
    (estado.andar % 5 === 0 ? `<span class="chip chefe">♛ Chefe</span>` : "") +
    (forma
      ? `<span class="chip forma" data-forma-ativa>✹ ${esc(forma.nome)} · ${forma.turnos} ${forma.turnos === 1 ? "turno" : "turnos"}</span>`
      : "") +
    `</div></div>` +
    `<div class="enemy-symbol" data-inimigo aria-hidden="true"><span>${esc(inimigo.simbolo)}</span></div>` +
    `<div class="heroi" data-heroi data-forma="${esc(forma?.id ?? "")}">${heroiSvg()}</div>` +
    `<div class="combat-fx" data-fx aria-hidden="true"></div>` +
    `</div>`
  );
}

function painelDeFormas(estado: EstadoDaPartida): string {
  const opcoes = opcoesDeForma(estado);
  if (!opcoes.length) return "";
  const botoes = opcoes.map(({ acaoId, forma, motivo }) =>
    botaoDeAcao(
      acaoId,
      forma.nome,
      {
        tipo: "forma",
        texto: `+${forma.atk} ataque${forma.def ? " · +" + forma.def + " defesa" : ""} · ${duracaoDaForma(estado)} turnos`,
        energia: forma.custo,
        motivo,
      },
      !!motivo,
    ),
  );
  return (
    `<section class="form-panel" aria-label="Transformações"><div class="painel-cabecalho"><h3>Transformações</h3><small>Uma por luta</small></div>` +
    `<div class="action-grid">${botoes.join("")}</div></section>`
  );
}

export function telaDeCombate(estado: EstadoDaPartida): string {
  const b = estado.batalha;
  if (!b) return "";
  const s = atributos(estado);
  const inimigo = inimigoDoAndar(estado.andar);
  const lugar = historiasDeEncontro[estado.andar - 1];
  const agora = intencao(estado, b.turno);
  const acoes = acoesDisponiveis(estado)
    .filter((a) => a.categoria !== "forma")
    .map((a) => ({ a, p: apresentar(estado, a) }))
    .sort((x, y) => ORDEM[x.p.tipo] - ORDEM[y.p.tipo])
    .map(({ a, p }) => botaoDeAcao(a.id, a.nome, p, a.desativada || b.energia < a.custo))
    .join("");
  const icone =
    agora.tipo === "nevoa" || agora.tipo === "preparacao"
      ? "◌"
      : agora.tipo === "pesado" || agora.tipo === "emboscada"
        ? "☄"
        : agora.tipo === "corpo-separado"
          ? "✂"
          : "⚔";
  return (
    arenaDeCombate(estado) +
    `<div class="main-content">` +
    `<div class="hud-batalha">` +
    `<div class="hud-bloco hud-heroi"><div class="hud-bloco-titulo"><span>Você</span><span>Nível ${estado.nivel}</span></div>` +
    medidor("Vida", b.pv, s.pv, "", "heroi") +
    medidor("Energia", b.energia, s.energia, "energy", "energia") +
    `</div>` +
    `<div class="hud-bloco hud-inimigo"><div class="hud-bloco-titulo"><span>${esc(inimigo.nome)}</span><span>${estado.andar % 5 === 0 ? "Chefe" : "Inimigo"}</span></div>` +
    medidor("PV do inimigo", b.pvInimigo, inimigo.pv, "inimigo", "inimigo") +
    `</div></div>` +
    (b.turno === 1 && lugar ? historia(lugar[0], lugar[1]) : "") +
    `<div class="intent${agora.dano ? "" : " calmo"}"><span class="intent-icone" aria-hidden="true">${icone}</span><div><strong>Intenção do inimigo</strong> · ${esc(agora.rotulo)}` +
    (temPrevisao(estado) ? `<small>Haki · próximo turno: ${esc(intencao(estado, b.turno + 1).rotulo)}</small>` : "") +
    `</div></div>` +
    `<section class="painel-acoes" aria-label="Ações do turno"><div class="painel-cabecalho"><h3>Ações do turno</h3>` +
    `<small>Energia ${b.energia} de ${s.energia}</small></div><div class="action-grid">${acoes}</div></section>` +
    painelDeFormas(estado) +
    `</div>`
  );
}
