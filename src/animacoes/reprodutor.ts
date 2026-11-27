// Toca os eventos de um turno já resolvido pelo motor. Nada aqui muda o estado
// do jogo: a animação só mostra o resultado calculado.
import type { EstadoDaPartida, EventoDoTurno } from "../dominio/tipos.ts";
import type { ModoDeAnimacao } from "../salvamento/save.ts";
import { Cena } from "./cena.ts";
import type { ContextoDeGolpe, ContextoInimigo } from "./contexto.ts";
import { Diretor, juntos } from "./diretor.ts";
import { anel, luz, numero, reacaoDoInimigo, rotulo } from "./efeitos.ts";
import { golpeFinal, quedaDoHeroi } from "./inimigos.ts";
import { animacaoDaAcao, registroDeEvasivas, registroDeFormas, registroInimigo } from "./registro.ts";

type Evento<T extends EventoDoTurno["tipo"]> = Extract<EventoDoTurno, { tipo: T }>;

function primeiro<T extends EventoDoTurno["tipo"]>(eventos: EventoDoTurno[], tipo: T): Evento<T> | undefined {
  return eventos.find((e): e is Evento<T> => e.tipo === tipo);
}

/** Atualiza uma barra (vida/energia) sem redesenhar a tela. */
function ajustarMedidor(raiz: ParentNode, alvo: string, valor: number): void {
  // A mesma barra pode aparecer duas vezes (HUD da batalha e painel lateral).
  for (const barra of raiz.querySelectorAll<HTMLElement>(`[data-medidor="${alvo}"]`)) {
    const maximo = Number(barra.dataset.maximo ?? 0);
    const preenchimento = barra.querySelector<HTMLElement>("i");
    if (!maximo) continue;
    if (preenchimento) preenchimento.style.width = `${Math.max(0, Math.min(100, (valor / maximo) * 100))}%`;
    barra.setAttribute("aria-valuenow", String(valor));
  }
  for (const texto of raiz.querySelectorAll<HTMLElement>(`[data-valor="${alvo}"]`)) {
    const maximo = texto.textContent?.split("/")[1]?.trim();
    if (maximo) texto.textContent = `${valor} / ${maximo}`;
  }
}

/** Mostra o resultado da ação do jogador no momento do impacto. */
function mostrarResultadoDoJogador(c: Cena, eventos: EventoDoTurno[], estadoFinal: EstadoDaPartida, forca: number): void {
  const dano = primeiro(eventos, "danoNoInimigo");
  const esquiva = primeiro(eventos, "esquivaDoInimigo");
  const cura = primeiro(eventos, "cura");
  const vitoria = primeiro(eventos, "vitoria");
  if (dano) {
    void numero(c, c.inimigoCentro, String(dano.valor), vitoria ? "forte" : "dano");
    if (dano.reduzidoPelaNevoa) void numero(c, { x: c.inimigoCentro.x, y: c.inimigoCentro.y + 36 }, "névoa −25%", "nevoa", 120);
    ajustarMedidor(c.raiz, "inimigo", dano.pvRestante);
    if (!c.d.pulado) void reacaoDoInimigo(c, forca);
  }
  if (esquiva) {
    void numero(c, c.inimigoCentro, "ESQUIVOU", "esquiva");
    void c.d.animar(
      c.inimigo,
      [
        { transform: "translate(0,0)", opacity: 1 },
        { transform: "translate(18px,-14px)", opacity: 0.35 },
        { transform: "translate(0,0)", opacity: 1 },
      ],
      { duration: 460 },
    );
  }
  if (cura) {
    void numero(c, c.heroiCentro, `+${cura.pv} PV`, "cura");
    if (cura.energia) void numero(c, { x: c.heroiCentro.x + 30, y: c.heroiCentro.y + 20 }, `+${cura.energia} energia`, "energia", 160);
  }
  const b = estadoFinal.batalha;
  if (b) {
    ajustarMedidor(c.raiz, "energia", b.energia);
    if (cura) ajustarMedidor(c.raiz, "heroi", b.pv);
  }
}

function mostrarDanoRecebido(c: Cena, eventos: EventoDoTurno[]): void {
  const dano = primeiro(eventos, "danoNoJogador");
  if (!dano) return;
  if (dano.absorvido) {
    void numero(c, { x: c.heroiCentro.x, y: c.heroiCentro.y - 30 }, `ABSORVEU ${dano.absorvido}`, "absorvido");
    void anel(c, c.heroiCentro, { cor: "#8bdfff", raio: 46, espessura: 3, duracao: 360 });
  }
  if (dano.bloqueado) {
    void numero(c, c.heroiCentro, `BLOQUEIO −${dano.valor}`, "bloqueio", 80);
    void luz(c, { x: c.heroiCentro.x + 24, y: c.heroiCentro.y }, { cor: "#8bdfff", raio: 40, duracao: 320 });
  } else {
    void numero(c, c.heroiCentro, dano.valor > 0 ? `−${dano.valor}` : "0", "dano", 60);
  }
  ajustarMedidor(c.raiz, "heroi", dano.pvRestante);
}

export interface OpcoesDoReprodutor {
  raiz: ParentNode;
  modo: ModoDeAnimacao;
  diretor: Diretor;
  estadoFinal: EstadoDaPartida;
}

/**
 * Toca a sequência do turno: ação do jogador → (golpe final) → ação do inimigo →
 * fim de transformação → derrota. Sempre termina, mesmo se for pulada no meio.
 */
export async function tocarTurno(eventos: EventoDoTurno[], o: OpcoesDoReprodutor): Promise<void> {
  if (o.modo === "desligadas") return;
  const c = Cena.encontrar(o.raiz, o.diretor);
  if (!c) return;
  c.arena.classList.add("animando");
  try {
    if (o.modo === "reduzidas") await tocarReduzido(c, eventos, o.estadoFinal);
    else await tocarCompleto(c, eventos, o.estadoFinal);
  } finally {
    c.arena.classList.remove("animando");
  }
}

async function tocarCompleto(c: Cena, eventos: EventoDoTurno[], estadoFinal: EstadoDaPartida): Promise<void> {
  const acao = primeiro(eventos, "acaoDoJogador");
  const vitoria = primeiro(eventos, "vitoria");
  if (!acao) return;

  let impactou = false;
  const ctx: ContextoDeGolpe = {
    c,
    final: !!vitoria,
    impacto: (forca = 1) => {
      if (impactou) return;
      impactou = true;
      mostrarResultadoDoJogador(c, eventos, estadoFinal, forca);
    },
  };
  if (vitoria) c.d.ritmo = 1.2;
  if (acao.categoria === "forma") {
    const forma = registroDeFormas[acao.animacaoId];
    if (forma) await forma.entrada(c, acao.animacaoId);
    ctx.impacto();
  } else {
    await animacaoDaAcao(acao.animacaoId)(ctx);
    ctx.impacto();
  }
  c.d.ritmo = 1;

  if (vitoria) {
    await golpeFinal(c);
    return;
  }

  const evitada = primeiro(eventos, "acaoInimigaEvitada");
  const inimiga = primeiro(eventos, "acaoInimiga");
  await c.d.esperar(160);
  if (evitada) {
    await (registroDeEvasivas[evitada.especialId] ?? (async () => void (await rotulo(c, "Ação evitada"))))(c);
  } else if (inimiga) {
    let recebeu = false;
    const ctxInimigo: ContextoInimigo = {
      c,
      impacto: () => {
        if (recebeu) return;
        recebeu = true;
        mostrarDanoRecebido(c, eventos);
      },
    };
    const animacao = registroInimigo[inimiga.animacaoId] ?? registroInimigo["inimigo:ataque"];
    if (animacao) await animacao(ctxInimigo);
    ctxInimigo.impacto();
  }

  const fim = primeiro(eventos, "formaEncerrada");
  if (fim) await registroDeFormas[fim.formaId]?.saida(c);
  if (primeiro(eventos, "derrota")) await quedaDoHeroi(c);
  await mostrarProgresso(c, eventos);
}

async function mostrarProgresso(c: Cena, eventos: EventoDoTurno[]): Promise<void> {
  const avisos = eventos.filter((e) => e.tipo === "maestria" || e.tipo === "nivel");
  for (const e of avisos) {
    if (e.tipo === "maestria") void numero(c, { x: c.heroiCentro.x, y: c.heroiCentro.y - 70 }, `Maestria ${e.nivel}`, "aviso");
    if (e.tipo === "nivel") void numero(c, { x: c.heroiCentro.x, y: c.heroiCentro.y - 70 }, `Nível ${e.nivel}`, "aviso");
    await c.d.esperar(260);
  }
}

/** Modo reduzido: sem deslocamentos, só rótulos e números que aparecem e somem. */
async function tocarReduzido(c: Cena, eventos: EventoDoTurno[], estadoFinal: EstadoDaPartida): Promise<void> {
  c.arena.classList.add("reduzido");
  const acao = primeiro(eventos, "acaoDoJogador");
  if (acao) {
    void rotulo(c, acao.nome, "#ffe9ab", 700);
    if (acao.categoria === "forma") c.heroi.dataset.forma = acao.animacaoId;
    mostrarResultadoDoJogador(c, eventos, estadoFinal, 0);
    await c.d.esperar(420);
  }
  if (primeiro(eventos, "vitoria")) {
    void rotulo(c, "Vitória", "#ffe7a6", 600);
    await c.d.esperar(450);
    return;
  }
  if (primeiro(eventos, "acaoInimigaEvitada")) {
    void numero(c, c.heroiCentro, "EVITADO", "evitado");
    await c.d.esperar(420);
  } else if (primeiro(eventos, "acaoInimiga")) {
    mostrarDanoRecebido(c, eventos);
    await c.d.esperar(420);
  }
  if (primeiro(eventos, "formaEncerrada")) {
    c.heroi.dataset.forma = "";
    void rotulo(c, "Forma encerrada", "#cdbbe0", 600);
    await c.d.esperar(300);
  }
}

export { Diretor, juntos };
