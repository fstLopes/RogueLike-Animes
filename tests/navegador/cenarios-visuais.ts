// Estados reais de partida (jogados pelo jogador automático) para capturas de tela.
import type { EstadoDaPartida } from "../../src/dominio/tipos.ts";
import { aleatorioComSemente } from "../../src/motor/aleatorio.ts";
import { aplicarComando, estadoInicial } from "../../src/motor/jornada.ts";
import { proximoComando } from "../ajudantes/jogador.ts";

export interface CenariosVisuais {
  batalha: EstadoDaPartida;
  vitoria: EstadoDaPartida;
  derrota: EstadoDaPartida;
  loja: EstadoDaPartida;
  descanso: EstadoDaPartida;
  evento: EstadoDaPartida;
}

/** Joga com sementes diferentes até encontrar uma torre concluída com batalha avançada no caminho. */
export function gerarCenarios(): CenariosVisuais {
  const achados: Partial<CenariosVisuais> = {};
  for (let semente = 1; semente < 2000; semente++) {
    const rng = aleatorioComSemente(semente);
    const decisao = aleatorioComSemente(semente * 7 + 3);
    const estado = estadoInicial();
    const vistos: Partial<CenariosVisuais> = {};
    for (let passo = 0; passo < 900; passo++) {
      const comando = proximoComando(estado, decisao);
      if (passo > 0 && comando.tipo === "iniciar") break;
      aplicarComando(estado, comando, rng, []);
      const b = estado.batalha;
      if (!vistos.batalha && estado.tela === "combate" && estado.andar >= 7 && b && b.turno >= 3 && b.forma && estado.itens.length >= 6)
        vistos.batalha = structuredClone(estado);
      if (!vistos.loja && estado.tela === "loja" && (estado.sala.itens?.length ?? 0) === 3) vistos.loja = structuredClone(estado);
      if (!vistos.descanso && estado.tela === "descanso" && estado.itens.length >= 4) vistos.descanso = structuredClone(estado);
      if (!vistos.evento && estado.tela === "evento") vistos.evento = structuredClone(estado);
      if (!achados.derrota && estado.tela === "derrota" && estado.andar >= 4) achados.derrota = structuredClone(estado);
      if (estado.tela === "vitoria") {
        if (vistos.batalha && !achados.vitoria) {
          Object.assign(achados, vistos, { vitoria: structuredClone(estado) });
        }
        break;
      }
    }
    if (achados.vitoria && achados.derrota && achados.loja && achados.descanso && achados.evento) return achados as CenariosVisuais;
  }
  throw new Error("cenários não encontrados");
}
