// Motor de combate por turnos. Não usa o DOM: recebe o estado e a ação escolhida
// e devolve o novo estado e a lista de eventos que a interface vai animar.
import { catalogo } from "../dados/catalogo.ts";
import { inimigoDoAndar } from "../dados/inimigos.ts";
import type {
  AcaoDeCombate,
  Aleatorio,
  EstadoDaPartida,
  EventoDoTurno,
  Forma,
  Intencao,
  ItemDoInventario,
  ResultadoDoTurno,
  TipoDeDano,
} from "../dominio/tipos.ts";
import {
  atributos,
  dadosDoItem,
  duracaoDaForma,
  efeitos,
  equipadosNoSlot,
  formasDoItem,
  itemPorId,
  maestria,
  podeUsar,
  todosEquipados,
} from "./consultas.ts";
import { adicionarItem, removerItem } from "./inventario.ts";
import { ganharMaestria, ganharXp } from "./progressao.ts";
import { moedasDaVitoria, sortearDrop, sortearOferta, xpDaVitoria } from "./recompensas.ts";
import { anotar } from "./registro.ts";

export const DANO_DO_SOCO = 10;
export const ENERGIA_DO_SOCO = 4;
export const ENERGIA_DA_DEFESA = 3;
export const ENERGIA_DO_GOLPE = 2;
export const ENERGIA_DA_PREVISAO = 2;
const tecnicasDosChefes: Readonly<Record<number, string>> = { 15: "Corte Lunar", 20: "Canhão Galick" };

/** O que o inimigo do andar fará no turno (ciclo de 3 turnos). */
export function intencao(estado: EstadoDaPartida, turno: number): Intencao {
  const inimigo = inimigoDoAndar(estado.andar);
  const tecnica = tecnicasDosChefes[estado.andar];
  if (tecnica && turno % 3 === 2) {
    return { tipo: "preparacao", rotulo: inimigo.nome + " prepara " + tecnica + ".", dano: 0, separa: false };
  }
  if (estado.andar === 5 && turno % 3 === 2) {
    return { tipo: "corpo-separado", rotulo: "Buggy vai separar o corpo. Cortes falham neste turno.", dano: inimigo.ataque, separa: true };
  }
  if (estado.andar === 10 && turno % 3 === 2) {
    return { tipo: "nevoa", rotulo: "Zabuza cria névoa e prepara uma emboscada.", dano: 0, separa: false };
  }
  if (turno % 3 === 0) {
    const emboscada = estado.andar === 10;
    return {
      tipo: emboscada ? "emboscada" : "pesado",
      rotulo: (tecnica ?? (emboscada ? "Emboscada na névoa" : "Golpe pesado")) + " · " + inimigo.ataquePesado + " de dano base",
      dano: inimigo.ataquePesado,
      separa: false,
    };
  }
  return { tipo: "ataque", rotulo: "Ataque · " + inimigo.ataque + " de dano base", dano: inimigo.ataque, separa: false };
}

export function animacaoDaIntencao(estado: EstadoDaPartida, i: Intencao): string {
  if (i.tipo === "ataque" && estado.andar === 5) return "inimigo:buggy-ataque";
  if (tecnicasDosChefes[estado.andar] && i.tipo !== "ataque") return "inimigo:" + estado.andar + ":" + i.tipo;
  return "inimigo:" + i.tipo;
}

interface AcaoInterna extends AcaoDeCombate {
  defende: boolean;
  executar: (estado: EstadoDaPartida, eventos: EventoDoTurno[]) => void;
}

function recarregar(estado: EstadoDaPartida, valor: number, eventos: EventoDoTurno[]): void {
  const batalha = estado.batalha;
  if (!batalha) return;
  const antes = batalha.energia;
  batalha.energia = Math.min(atributos(estado).energia, batalha.energia + valor);
  if (batalha.energia > antes) eventos.push({ tipo: "energia", valor: batalha.energia - antes });
}

/** Aplica um golpe no inimigo. Mesmas regras do jogo original. */
function golpear(estado: EstadoDaPartida, base: number, tipo: TipoDeDano, item: ItemDoInventario | null, eventos: EventoDoTurno[]): void {
  const batalha = estado.batalha;
  if (!batalha) return;
  if (tipo === "corte" && intencao(estado, batalha.turno).separa) {
    anotar(estado, "Buggy separou o corpo e escapou do corte.");
    batalha.combo = 0;
    eventos.push({ tipo: "esquivaDoInimigo", motivo: "corpo-separado" });
    return;
  }
  let dano = base + atributos(estado).atk + (batalha.forma?.atk ?? 0);
  if (item) {
    const e = efeitos(item);
    dano += maestria(item) * 2 + item.melhoria * 2;
    if (e.sequencia) {
      dano += batalha.combo * 2;
      batalha.combo = Math.min(3, batalha.combo + 1);
    }
    if (batalha.defendeuAntes) dano += e.contra ?? 0;
    ganharMaestria(estado, item, eventos);
  } else {
    batalha.combo = 0;
  }
  const nevoa = estado.andar === 10 && batalha.turno % 3 === 0 && (tipo === "corte" || tipo === "projetil");
  if (nevoa) dano = Math.floor(dano * 0.75);
  batalha.pvInimigo = Math.max(0, batalha.pvInimigo - dano);
  anotar(estado, "Você causou " + dano + " de dano.");
  eventos.push({ tipo: "danoNoInimigo", valor: dano, tipoDeDano: tipo, pvRestante: batalha.pvInimigo, reduzidoPelaNevoa: nevoa });
}

function acoesInternas(estado: EstadoDaPartida): AcaoInterna[] {
  const batalha = estado.batalha;
  if (!batalha) return [];
  const acoes: AcaoInterna[] = [
    {
      id: "soco",
      animacaoId: "basico:soco",
      nome: "Soco",
      detalhe: DANO_DO_SOCO + " de dano base · +" + ENERGIA_DO_SOCO + " energia",
      categoria: "basico",
      custo: 0,
      desativada: false,
      itemId: null,
      defende: false,
      executar: (e, ev) => {
        golpear(e, DANO_DO_SOCO, "impacto", null, ev);
        recarregar(e, ENERGIA_DO_SOCO, ev);
      },
    },
    {
      id: "defender",
      animacaoId: "basico:defender",
      nome: "Defender",
      detalhe: "Metade do dano · +" + ENERGIA_DA_DEFESA + " energia",
      categoria: "basico",
      custo: 0,
      desativada: false,
      itemId: null,
      defende: true,
      executar: (e, ev) => recarregar(e, ENERGIA_DA_DEFESA, ev),
    },
  ];

  for (const item of todosEquipados(estado).filter((i) => podeUsar(estado, i))) {
    const dados = dadosDoItem(item);
    const e = dados.efeitos;
    const id = item.id;
    if (e.golpe) {
      const golpe = e.golpe;
      acoes.push({
        id: "golpe:" + id,
        animacaoId: golpe.id,
        nome: dados.nome,
        detalhe: golpe.dano + " de dano base",
        categoria: "golpe",
        custo: 0,
        desativada: false,
        itemId: id,
        defende: false,
        executar: (est, ev) => {
          golpear(est, golpe.dano, golpe.tipo, itemPorId(est, id) ?? null, ev);
          recarregar(est, ENERGIA_DO_GOLPE, ev);
        },
      });
    }
    if (e.habilidade && (item.slot === "poder" || maestria(item) >= 2)) {
      const h = e.habilidade;
      const semSombra = h.tipo === "sombra" && !estado.ultimoDerrotado;
      acoes.push({
        id: "habilidade:" + id,
        animacaoId: h.id,
        nome: h.nome,
        detalhe: semSombra ? "Vença uma luta para capturar uma sombra" : h.custo + " energia · " + h.dano + " de dano base",
        categoria: "habilidade",
        custo: h.custo,
        desativada: semSombra,
        itemId: id,
        defende: false,
        executar: (est, ev) => {
          if (h.tipo === "sombra") anotar(est, "Sombra invocada: " + est.ultimoDerrotado + ".");
          golpear(est, h.dano, h.tipo, itemPorId(est, id) ?? null, ev);
        },
      });
    }
    if (e.especial && maestria(item) >= 2) {
      const especial = e.especial;
      acoes.push({
        id: "especial:" + id,
        animacaoId: especial.id,
        nome: especial.nome,
        detalhe: especial.custo + " energia · evita uma ação inimiga por luta",
        categoria: "especial",
        custo: especial.custo,
        desativada: batalha.especiaisUsados.includes(id),
        itemId: id,
        defende: false,
        executar: (est, ev) => {
          const b = est.batalha;
          if (!b) return;
          b.veu = especial.id;
          b.especiaisUsados.push(id);
          ev.push({ tipo: "especialAtivado", especialId: especial.id });
          ganharMaestria(est, itemPorId(est, id), ev);
          anotar(est, especial.nome + " ativada.");
        },
      });
    }
    for (const forma of formasDoItem(item)) {
      if (maestria(item) < forma.maestriaMinima || estado.nivel < forma.nivelMinimo) continue;
      acoes.push(acaoDeForma(estado, item, forma));
    }
  }

  for (const item of estado.itens.filter((i) => i.slot === "consumivel")) {
    const dados = dadosDoItem(item);
    const cura = dados.efeitos.cura ?? 0;
    const carga = dados.efeitos.carga ?? 0;
    const id = item.id;
    acoes.push({
      id: "usar:" + id,
      animacaoId: "consumivel:" + item.chave,
      nome: dados.nome,
      detalhe: "+" + cura + " PV · +" + carga + " energia",
      categoria: "consumivel",
      custo: 0,
      desativada: false,
      itemId: id,
      defende: false,
      executar: (est, ev) => {
        const b = est.batalha;
        if (!b) return;
        const antesPv = b.pv;
        const antesEnergia = b.energia;
        b.pv = Math.min(atributos(est).pv, b.pv + cura);
        b.energia = Math.min(atributos(est).energia, b.energia + carga);
        ev.push({ tipo: "cura", pv: b.pv - antesPv, energia: b.energia - antesEnergia });
        removerItem(est, id);
      },
    });
  }
  return acoes;
}

function acaoDeForma(estado: EstadoDaPartida, item: ItemDoInventario, forma: Forma): AcaoInterna {
  const batalha = estado.batalha;
  const id = item.id;
  return {
    id: "forma:" + id + ":" + forma.id,
    animacaoId: forma.id,
    nome: forma.nome,
    detalhe: forma.custo + " energia · " + duracaoDaForma(estado) + " turnos de ação após ativar",
    categoria: "forma",
    custo: forma.custo,
    desativada: !!batalha?.forma || !!batalha?.formaUsada,
    itemId: id,
    defende: false,
    executar: (est, ev) => {
      const b = est.batalha;
      if (!b) return;
      const turnos = duracaoDaForma(est);
      b.forma = { id: forma.id, nome: forma.nome, atk: forma.atk, def: forma.def, turnos, itemId: id };
      b.formaUsada = true;
      ev.push({ tipo: "formaAtivada", formaId: forma.id, turnos });
      ganharMaestria(est, itemPorId(est, id), ev);
      anotar(est, forma.nome + " ativado.");
    },
  };
}

/** Ações do turno, na mesma ordem do jogo original. */
export function acoesDisponiveis(estado: EstadoDaPartida): AcaoDeCombate[] {
  return acoesInternas(estado).map(({ executar: _executar, defende: _defende, ...publica }) => publica);
}

export interface OpcaoDeForma {
  acaoId: string;
  forma: Forma;
  item: ItemDoInventario;
  motivo: string;
}

/** Todas as formas dos itens equipados, inclusive as bloqueadas, com o motivo do bloqueio. */
export function opcoesDeForma(estado: EstadoDaPartida): OpcaoDeForma[] {
  const batalha = estado.batalha;
  if (!batalha) return [];
  const opcoes: OpcaoDeForma[] = [];
  for (const item of todosEquipados(estado)) {
    const exige = efeitos(item).exige;
    for (const forma of formasDoItem(item)) {
      const motivo = !podeUsar(estado, item)
        ? "Equipe " + (exige ? (catalogo[exige]?.nome ?? exige) : "o poder exigido")
        : maestria(item) < forma.maestriaMinima
          ? "Requer maestria " + forma.maestriaMinima
          : estado.nivel < forma.nivelMinimo
            ? "Requer nível " + forma.nivelMinimo
            : batalha.formaUsada
              ? "Forma já usada nesta luta"
              : batalha.energia < forma.custo
                ? "Energia insuficiente"
                : "";
      opcoes.push({ acaoId: "forma:" + item.id + ":" + forma.id, forma, item, motivo });
    }
  }
  return opcoes;
}

function vencer(estado: EstadoDaPartida, aleatorio: Aleatorio, eventos: EventoDoTurno[], golpeFinal: string): void {
  const inimigo = inimigoDoAndar(estado.andar);
  const moedas = moedasDaVitoria(estado.andar);
  const xp = xpDaVitoria(estado.andar);
  estado.moedas += moedas;
  ganharXp(estado, xp, eventos);
  estado.ultimoDerrotado = inimigo.nome;
  const drop = sortearDrop(estado, inimigo, aleatorio);
  if (drop) {
    adicionarItem(estado, drop);
    anotar(estado, "Drop exclusivo: " + (catalogo[drop]?.nome ?? drop) + ".");
  }
  anotar(estado, "Vitória · +" + xp + " XP · +" + moedas + " moedas.");
  estado.sala = { itens: sortearOferta(estado, estado.andar, aleatorio), drop, moedas, xpGanho: xp };
  estado.tela = "recompensa";
  estado.batalha = null;
  eventos.push({ tipo: "vitoria", golpeFinal, moedas, xp, drop });
}

function perder(estado: EstadoDaPartida, eventos: EventoDoTurno[]): void {
  estado.tela = "derrota";
  estado.itens = [];
  estado.equipados = {};
  estado.pontos = 0;
  anotar(estado, "A jornada terminou no andar " + estado.andar + ".");
  eventos.push({ tipo: "derrota", andar: estado.andar });
}

/**
 * Aplica a ação sobre o estado (mutável). Devolve o motivo da recusa, ou null se o turno rodou.
 * Use `resolverTurno` para a versão que não altera o estado recebido.
 */
export function aplicarTurno(estado: EstadoDaPartida, acaoId: string, aleatorio: Aleatorio, eventos: EventoDoTurno[]): string | null {
  const batalha = estado.batalha;
  if (estado.tela !== "combate" || !batalha) return "Não há combate em andamento.";
  const acao = acoesInternas(estado).find((a) => a.id === acaoId);
  if (!acao) return "Ação indisponível.";
  if (acao.desativada) return "Ação bloqueada neste momento.";
  if (batalha.energia < acao.custo) return "Energia insuficiente.";

  const proxima = intencao(estado, batalha.turno);
  batalha.energia -= acao.custo;
  eventos.push({ tipo: "acaoDoJogador", acaoId: acao.id, animacaoId: acao.animacaoId, nome: acao.nome, categoria: acao.categoria });
  acao.executar(estado, eventos);
  if (batalha.forma && acao.categoria !== "forma") ganharMaestria(estado, itemPorId(estado, batalha.forma.itemId), eventos);

  if (batalha.pvInimigo <= 0) {
    vencer(estado, aleatorio, eventos, acao.animacaoId);
    return null;
  }

  if (batalha.veu) {
    anotar(estado, "Você evitou a ação inimiga.");
    eventos.push({ tipo: "acaoInimigaEvitada", especialId: batalha.veu, intencao: proxima.tipo });
    batalha.veu = null;
  } else if (proxima.dano) {
    eventos.push({ tipo: "acaoInimiga", animacaoId: animacaoDaIntencao(estado, proxima), intencao: proxima.tipo, danoBase: proxima.dano });
    let dano = Math.max(1, proxima.dano - atributos(estado).def - (batalha.forma?.def ?? 0));
    if (acao.defende) {
      const bonus = todosEquipados(estado).reduce((soma, item) => soma + (efeitos(item).guarda ?? 0), 0);
      dano = Math.max(1, Math.ceil(dano / 2) - bonus);
      for (const item of equipadosNoSlot(estado, "passiva").filter((i) => efeitos(i).previsao)) {
        ganharMaestria(estado, item, eventos);
        recarregar(estado, ENERGIA_DA_PREVISAO, eventos);
      }
    }
    let absorvido = 0;
    if (batalha.primeiroGolpe) {
      for (const item of todosEquipados(estado).filter((i) => efeitos(i).barreira && podeUsar(estado, i))) {
        const antes = dano;
        dano = Math.max(0, dano - (efeitos(item).barreira ?? 0) - maestria(item) * 2);
        absorvido += antes - dano;
        ganharMaestria(estado, item, eventos);
      }
      batalha.primeiroGolpe = false;
    }
    batalha.pv = Math.max(0, batalha.pv - dano);
    anotar(estado, "Você recebeu " + dano + " de dano" + (acao.defende ? " ao defender." : "."));
    eventos.push({ tipo: "danoNoJogador", valor: dano, bloqueado: acao.defende, absorvido, pvRestante: batalha.pv });
  } else {
    anotar(estado, "O inimigo prepara o próximo golpe.");
    eventos.push({ tipo: "acaoInimiga", animacaoId: animacaoDaIntencao(estado, proxima), intencao: proxima.tipo, danoBase: 0 });
  }

  if (batalha.forma && acao.categoria !== "forma") {
    batalha.forma.turnos -= 1;
    if (batalha.forma.turnos <= 0) {
      eventos.push({ tipo: "formaEncerrada", formaId: batalha.forma.id });
      batalha.forma = null;
    }
  }
  batalha.defendeuAntes = acao.defende;
  batalha.turno += 1;
  if (batalha.pv <= 0) perder(estado, eventos);
  return null;
}

/** Resolve um turno sem alterar o estado recebido. */
export function resolverTurno(estado: EstadoDaPartida, acaoId: string, aleatorio: Aleatorio): ResultadoDoTurno {
  const rascunho = structuredClone(estado);
  const eventos: EventoDoTurno[] = [];
  const motivo = aplicarTurno(rascunho, acaoId, aleatorio, eventos);
  if (motivo) return { aceito: false, motivo, estado, eventos: [] };
  return { aceito: true, estado: rascunho, eventos };
}
