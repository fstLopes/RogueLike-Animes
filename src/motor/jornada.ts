// Fluxo da jornada: salas, rotas, eventos, loja, descanso e o despachante de comandos.
import { TOTAL_DE_ANDARES, rotas } from "../dados/andares.ts";
import { catalogo } from "../dados/catalogo.ts";
import { inimigoDoAndar } from "../dados/inimigos.ts";
import type { Aleatorio, Comando, EstadoDaPartida, EventoDoTurno, ResultadoDoTurno, TipoDeSala } from "../dominio/tipos.ts";
import { aplicarTurno } from "./combate.ts";
import { atributos, dadosDoItem, itemPorId, precoNaLoja } from "./consultas.ts";
import { alternarEquipamento, equiparMelhores } from "./equipamentos.ts";
import { adicionarItem } from "./inventario.ts";
import { distribuirPonto, podeMelhorar, podeTreinar } from "./progressao.ts";
import { MAESTRIA_DO_TREINO, MOEDAS_DO_DESCANSO, MOEDAS_DO_EVENTO, sortearOferta } from "./recompensas.ts";
import { anotar } from "./registro.ts";

export function estadoInicial(): EstadoDaPartida {
  return {
    tela: "titulo",
    andar: 1,
    nivel: 1,
    xp: 0,
    moedas: 0,
    proximoId: 1,
    itens: [],
    historico: [],
    equipados: {},
    pontos: 0,
    bonus: { atk: 0, def: 0, res: 0 },
    registro: [],
    ultimoDerrotado: null,
    obtidos: [],
    sala: {},
    batalha: null,
  };
}

/** Entra numa sala do andar atual. Combates restauram vida e energia (modo Normal). */
export function entrarNaSala(estado: EstadoDaPartida, tipo: TipoDeSala, aleatorio: Aleatorio): void {
  estado.historico.push({ andar: estado.andar, tipo });
  estado.tela = tipo === "chefe" ? "combate" : tipo;
  estado.sala = {};
  if (estado.tela === "combate") {
    const s = atributos(estado);
    estado.batalha = {
      pv: s.pv,
      energia: s.energia,
      pvInimigo: inimigoDoAndar(estado.andar).pv,
      turno: 1,
      pratica: {},
      primeiroGolpe: true,
      defendeuAntes: false,
      combo: 0,
      forma: null,
      formaUsada: false,
      especiaisUsados: [],
      veu: null,
    };
    anotar(estado, "Andar " + estado.andar + " · " + inimigoDoAndar(estado.andar).nome);
  }
  if (tipo === "loja") estado.sala.itens = sortearOferta(estado, estado.andar, aleatorio);
  if (tipo === "evento") {
    const itens = sortearOferta(estado, estado.andar, aleatorio);
    // No 2º andar o evento sempre oferece a fruta do Leopardo, se ela ainda não saiu.
    if (estado.andar === 2 && !estado.obtidos.includes("leopard") && !itens.includes("leopard")) itens[0] = "leopard";
    const treino = estado.andar === 12 ? "resp_agua" : estado.andar === 17 ? "db_kame" : null;
    if (treino && !estado.obtidos.includes(treino) && !itens.includes(treino)) itens[0] = treino;
    estado.sala.itens = itens;
  }
}

export function novaPartida(aleatorio: Aleatorio): EstadoDaPartida {
  const estado = estadoInicial();
  estado.tela = "combate";
  entrarNaSala(estado, "combate", aleatorio);
  return estado;
}

function concluirSala(estado: EstadoDaPartida): void {
  estado.tela = estado.andar === TOTAL_DE_ANDARES ? "vitoria" : "rota";
}

function pegar(estado: EstadoDaPartida, chave: string): boolean {
  if (!estado.sala.itens?.includes(chave) || !adicionarItem(estado, chave)) return false;
  anotar(estado, (catalogo[chave]?.nome ?? chave) + " foi para a mochila.");
  concluirSala(estado);
  return true;
}

/** Aplica um comando sobre o estado (mutável). Devolve o motivo da recusa, ou null. */
export function aplicarComando(estado: EstadoDaPartida, comando: Comando, aleatorio: Aleatorio, eventos: EventoDoTurno[]): string | null {
  switch (comando.tipo) {
    case "iniciar": {
      Object.assign(estado, novaPartida(aleatorio));
      return null;
    }
    case "turno":
      return aplicarTurno(estado, comando.acaoId, aleatorio, eventos);
    case "rota": {
      const vitoriaAntiga = estado.tela === "vitoria" && estado.andar === 10;
      if ((!vitoriaAntiga && estado.tela !== "rota") || !rotas[estado.andar]?.includes(comando.destino)) return "Rota indisponível.";
      estado.andar += 1;
      entrarNaSala(estado, comando.destino, aleatorio);
      return null;
    }
    case "pegar":
      if (estado.tela !== "recompensa" && estado.tela !== "evento") return "Não há itens para pegar.";
      return pegar(estado, comando.chave) ? null : "Item indisponível.";
    case "moedasDoEvento":
      if (estado.tela !== "evento") return "Não há evento.";
      estado.moedas += MOEDAS_DO_EVENTO;
      anotar(estado, "Você recebeu " + MOEDAS_DO_EVENTO + " moedas.");
      concluirSala(estado);
      return null;
    case "comprar": {
      const chave = comando.chave;
      if (estado.tela !== "loja" || !estado.sala.itens?.includes(chave)) return "Item fora do estoque.";
      if (estado.moedas < precoNaLoja(chave)) return "Moedas insuficientes.";
      if (!adicionarItem(estado, chave)) return "Item já obtido.";
      estado.moedas -= precoNaLoja(chave);
      estado.sala.itens = estado.sala.itens.filter((outra) => outra !== chave);
      anotar(estado, "Você comprou " + (catalogo[chave]?.nome ?? chave) + ".");
      return null;
    }
    case "continuar":
      if (estado.tela !== "recompensa" || (estado.sala.itens?.length ?? 0) > 0) return "Escolha uma recompensa.";
      concluirSala(estado);
      return null;
    case "sairDaLoja":
      if (estado.tela !== "loja") return "Não há loja.";
      concluirSala(estado);
      return null;
    case "moedasDoDescanso":
      if (estado.tela !== "descanso") return "Não há descanso.";
      estado.moedas += MOEDAS_DO_DESCANSO;
      anotar(estado, "Você recebeu " + MOEDAS_DO_DESCANSO + " moedas no descanso.");
      concluirSala(estado);
      return null;
    case "treinar":
    case "melhorar": {
      if (estado.tela !== "descanso") return "Não há descanso.";
      const item = itemPorId(estado, comando.itemId);
      if (!item) return "Item não encontrado.";
      if (comando.tipo === "treinar") {
        if (!podeTreinar(item)) return "Este item não treina maestria.";
        item.xp = Math.min(15, item.xp + MAESTRIA_DO_TREINO);
        anotar(estado, dadosDoItem(item).nome + " ganhou maestria.");
      } else {
        if (!podeMelhorar(item)) return "Este item não pode ser melhorado.";
        item.melhoria += 1;
        anotar(estado, dadosDoItem(item).nome + " foi melhorado.");
      }
      concluirSala(estado);
      return null;
    }
    case "atributo":
      return distribuirPonto(estado, comando.atributo) ? null : "Sem pontos para distribuir agora.";
    case "equipar":
      return alternarEquipamento(estado, comando.itemId) ? null : "Não foi possível equipar.";
    case "equiparMelhores":
      return equiparMelhores(estado) ? null : "Equipe os itens fora do combate.";
  }
}

/** Versão pura de `aplicarComando`: não altera o estado recebido. */
export function executarComando(estado: EstadoDaPartida, comando: Comando, aleatorio: Aleatorio): ResultadoDoTurno {
  const rascunho = structuredClone(estado);
  const eventos: EventoDoTurno[] = [];
  const motivo = aplicarComando(rascunho, comando, aleatorio, eventos);
  if (motivo) {
    // A recusa de equipar uma 4ª passiva anota uma dica no registro; mantém a dica.
    if (comando.tipo === "equipar" && rascunho.registro[0] !== estado.registro[0])
      return { aceito: false, motivo, estado: rascunho, eventos: [] };
    return { aceito: false, motivo, estado, eventos: [] };
  }
  return { aceito: true, estado: rascunho, eventos };
}
