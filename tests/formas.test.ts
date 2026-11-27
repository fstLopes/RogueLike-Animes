import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { aleatorioFixo } from "../src/motor/aleatorio.ts";
import { acoesDisponiveis, opcoesDeForma, resolverTurno } from "../src/motor/combate.ts";
import { duracaoDaForma } from "../src/motor/consultas.ts";
import { cenario, idDoItem } from "./ajudantes/cenario.ts";

const rng = aleatorioFixo([0.99]);

function idsDeForma(estado: Parameters<typeof acoesDisponiveis>[0]) {
  return acoesDisponiveis(estado)
    .filter((a) => a.categoria === "forma")
    .map((a) => a.animacaoId);
}

describe("requisitos de transformação", () => {
  test("Gears 2 a 5 seguem maestria e nível da jornada", () => {
    const casos: [number, number, string[]][] = [
      [0, 6, []],
      [3, 1, []],
      [3, 2, ["forma:gear-2"]],
      [7, 3, ["forma:gear-2", "forma:gear-3"]],
      [15, 4, ["forma:gear-2", "forma:gear-3", "forma:gear-4"]],
      [15, 6, ["forma:gear-2", "forma:gear-3", "forma:gear-4", "forma:gear-5"]],
    ];
    for (const [xp, nivel, esperado] of casos) {
      const estado = cenario({ nivel, itens: [{ chave: "gum", xp }] });
      assert.deepEqual(idsDeForma(estado), esperado, `xp ${xp}, nível ${nivel}`);
    }
  });

  test("Super Saiyajin exige Ki Saiyajin equipado", () => {
    const sem = cenario({ itens: [{ chave: "super" }] });
    assert.deepEqual(idsDeForma(sem), []);
    assert.equal(opcoesDeForma(sem)[0]?.motivo, "Equipe Ki Saiyajin");
    const com = cenario({ itens: [{ chave: "ki" }, { chave: "super" }] });
    assert.deepEqual(idsDeForma(com), ["forma:super-saiyajin"]);
  });

  test("formas da Kurama: manto na maestria II e nível 2, modo chakra na III e nível 5", () => {
    assert.deepEqual(idsDeForma(cenario({ nivel: 2, itens: [{ chave: "kurama", xp: 7 }] })), ["forma:manto-da-kurama"]);
    assert.deepEqual(idsDeForma(cenario({ nivel: 5, itens: [{ chave: "kurama", xp: 15 }] })), [
      "forma:manto-da-kurama",
      "forma:modo-chakra-da-kurama",
    ]);
  });

  test("motivo de bloqueio para energia insuficiente", () => {
    const estado = cenario({ nivel: 6, itens: [{ chave: "gum", xp: 15 }] });
    estado.batalha!.energia = 10;
    const motivos = Object.fromEntries(opcoesDeForma(estado).map((o) => [o.forma.id, o.motivo]));
    assert.equal(motivos["forma:gear-2"], "");
    assert.equal(motivos["forma:gear-5"], "Energia insuficiente");
  });
});

describe("ciclo da transformação", () => {
  test("ativar não conta como turno da forma; ela termina depois de N ações e emite o fim", () => {
    let estado = cenario({ nivel: 2, itens: [{ chave: "gum", xp: 3 }] });
    const turnos = duracaoDaForma(estado);
    assert.equal(turnos, 3);
    let r = resolverTurno(estado, "forma:" + idDoItem(estado, "gum") + ":forma:gear-2", rng);
    assert.deepEqual(
      r.eventos.find((e) => e.tipo === "formaAtivada"),
      { tipo: "formaAtivada", formaId: "forma:gear-2", turnos: 3 },
    );
    assert.equal(r.estado.batalha!.forma?.turnos, 3);
    estado = r.estado;
    estado.batalha!.pvInimigo = 999;
    const golpes: number[] = [];
    for (let i = 0; i < 3; i++) {
      r = resolverTurno(estado, "soco", rng);
      golpes.push((r.eventos.find((e) => e.tipo === "danoNoInimigo") as { valor: number }).valor);
      estado = r.estado;
      estado.batalha!.pv = 999;
    }
    assert.deepEqual(golpes, [10 + 1 + 7, 10 + 1 + 7, 10 + 1 + 7]);
    assert.equal(r.eventos.at(-1)?.tipo, "formaEncerrada");
    assert.equal(estado.batalha!.forma, null);
  });

  test("só uma transformação por luta", () => {
    const estado = cenario({ nivel: 3, itens: [{ chave: "gum", xp: 7 }] });
    const id = idDoItem(estado, "gum");
    const r = resolverTurno(estado, `forma:${id}:forma:gear-2`, rng);
    assert.equal(resolverTurno(r.estado, `forma:${id}:forma:gear-3`, rng).aceito, false);
  });

  test("Resistência aumenta a duração: +1 turno a cada 20, até 6", () => {
    assert.equal(duracaoDaForma(cenario({ bonus: { res: 19 } })), 3);
    assert.equal(duracaoDaForma(cenario({ bonus: { res: 40 } })), 5);
    assert.equal(duracaoDaForma(cenario({ bonus: { res: 200 } })), 6);
  });

  test("a defesa da forma reduz o dano recebido", () => {
    const estado = cenario({ nivel: 5, itens: [{ chave: "kurama", xp: 15 }] });
    estado.batalha!.primeiroGolpe = false;
    const r = resolverTurno(estado, "forma:" + idDoItem(estado, "kurama") + ":forma:modo-chakra-da-kurama", rng);
    const depois = resolverTurno(r.estado, "soco", rng);
    const dano = depois.eventos.find((e) => e.tipo === "danoNoJogador") as { valor: number };
    // 2º turno = ataque comum do 1º andar (8) − defesa da forma (5)
    assert.equal(dano.valor, 8 - 5);
  });
});
