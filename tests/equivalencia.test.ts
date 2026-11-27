// Joga partidas aleatórias no jogo original e no motor novo, com a mesma semente,
// e compara o estado depois de cada comando. Garante que a migração preservou as regras.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { EventoDoTurno } from "../src/dominio/tipos.ts";
import { aleatorioComSemente } from "../src/motor/aleatorio.ts";
import { aplicarComando, estadoInicial } from "../src/motor/jornada.ts";
import { proximoComando } from "./ajudantes/jogador.ts";
import { carregarOriginal, projetarNovo, projetarOriginal } from "./ajudantes/original.ts";

const PARTIDAS = 700;
const PASSOS = 600;

test("o motor novo reproduz o jogo original passo a passo", () => {
  const cobertura = { andarMaximo: 0, vitorias: 0, formas: new Set<string>(), habilidades: new Set<string>(), comandos: 0 };
  for (let partida = 0; partida < PARTIDAS; partida++) {
    const semente = 1000 + partida;
    const original = carregarOriginal(aleatorioComSemente(semente));
    const aleatorioNovo = aleatorioComSemente(semente);
    const decisao = aleatorioComSemente(9_000 + partida);
    const estado = estadoInicial();
    for (let passo = 0; passo < PASSOS; passo++) {
      const comando = proximoComando(estado, decisao);
      if (passo > 0 && comando.tipo === "iniciar") break;
      const eventos: EventoDoTurno[] = [];
      original.executar(comando, estado);
      aplicarComando(estado, comando, aleatorioNovo, eventos);
      cobertura.comandos++;
      for (const e of eventos) {
        if (e.tipo === "formaAtivada") cobertura.formas.add(e.formaId);
        if (e.tipo === "acaoDoJogador" && e.categoria === "habilidade") cobertura.habilidades.add(e.animacaoId);
      }
      cobertura.andarMaximo = Math.max(cobertura.andarMaximo, estado.andar);
      const esperado = projetarOriginal(original.estado());
      const atual = projetarNovo(estado);
      const fimDaV1 = estado.andar === 10 && esperado.tela === "vitoria";
      if (fimDaV1) assert.equal(atual.tela, "rota");
      assert.deepEqual(
        fimDaV1 ? { ...atual, tela: "vitoria" } : atual,
        esperado,
        `partida ${partida}, passo ${passo}, comando ${JSON.stringify(comando)}`,
      );
      if (fimDaV1) {
        cobertura.vitorias++;
        break;
      }
    }
  }
  console.log(
    `equivalência: ${cobertura.comandos} comandos, andar máximo ${cobertura.andarMaximo}, ${cobertura.vitorias} torres concluídas, ` +
      `${cobertura.formas.size} formas e ${cobertura.habilidades.size} habilidades exercitadas`,
  );
  assert.ok(cobertura.andarMaximo >= 5, "as partidas de teste precisam passar do primeiro chefe");
});
