import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { EventoDoTurno } from "../src/dominio/tipos.ts";
import { aleatorioFixo } from "../src/motor/aleatorio.ts";
import { acoesDisponiveis, intencao, resolverTurno } from "../src/motor/combate.ts";
import { cenario, idDoItem } from "./ajudantes/cenario.ts";

const rng = aleatorioFixo([0.99]);

function eventosDo<T extends EventoDoTurno["tipo"]>(eventos: EventoDoTurno[], tipo: T) {
  return eventos.filter((e): e is Extract<EventoDoTurno, { tipo: T }> => e.tipo === tipo);
}

describe("dano", () => {
  test("soco causa 10 + ataque do personagem e recupera 4 de energia", () => {
    const estado = cenario({ nivel: 3 });
    estado.batalha!.energia = 10;
    const r = resolverTurno(estado, "soco", rng);
    assert.equal(r.aceito, true);
    const dano = eventosDo(r.eventos, "danoNoInimigo")[0];
    assert.equal(dano?.valor, 10 + 2); // nível 3 = +2 de ataque
    assert.equal(r.estado.batalha!.energia, 14);
    assert.equal(estado.batalha!.energia, 10, "o estado original não muda");
  });

  test("golpe de arma soma maestria e melhoria (2 por nível) e recupera 2 de energia", () => {
    const estado = cenario({ itens: [{ chave: "wado", xp: 7, melhoria: 1 }] });
    estado.batalha!.energia = 5;
    const r = resolverTurno(estado, "golpe:" + idDoItem(estado, "wado"), rng);
    assert.equal(eventosDo(r.eventos, "danoNoInimigo")[0]?.valor, 19 + 2 * 2 + 1 * 2);
    assert.equal(r.estado.batalha!.energia, 7);
  });

  test("armas de sequência acumulam +2 por acerto até +6", () => {
    let estado = cenario({ andar: 10, itens: [{ chave: "nichirin" }] });
    const id = "golpe:" + idDoItem(estado, "nichirin");
    const danos: number[] = [];
    for (let i = 0; i < 5; i++) {
      estado.batalha!.turno = 1; // evita a redução da névoa e o turno sem dano
      estado.batalha!.pv = 999;
      const r = resolverTurno(estado, id, rng);
      danos.push(eventosDo(r.eventos, "danoNoInimigo")[0]!.valor);
      estado = r.estado;
    }
    const base = 17 + 0; // maestria sobe durante a sequência
    assert.deepEqual(
      danos.map((d, i) => d - base - (i >= 3 ? 2 : 0)),
      [0, 2, 4, 6, 6],
    );
  });

  test("contra-ataque soma o bônus depois de defender", () => {
    let estado = cenario({ itens: [{ chave: "dragon" }] });
    const id = "golpe:" + idDoItem(estado, "dragon");
    estado = resolverTurno(estado, "defender", rng).estado;
    const r = resolverTurno(estado, id, rng);
    assert.equal(eventosDo(r.eventos, "danoNoInimigo")[0]?.valor, 23 + 8);
  });

  test("Buggy separado faz cortes falharem, mas não impactos", () => {
    const estado = cenario({ andar: 5, itens: [{ chave: "marine" }] });
    estado.batalha!.turno = 2;
    const corte = resolverTurno(estado, "golpe:" + idDoItem(estado, "marine"), rng);
    assert.equal(eventosDo(corte.eventos, "esquivaDoInimigo").length, 1);
    assert.equal(corte.estado.batalha!.pvInimigo, 96);
    const soco = resolverTurno(estado, "soco", rng);
    assert.equal(soco.estado.batalha!.pvInimigo, 86);
  });

  test("no 10º andar, cortes e tiros perdem 25% nos turnos de emboscada", () => {
    const estado = cenario({ andar: 10, itens: [{ chave: "zabuza" }] });
    estado.batalha!.turno = 3;
    const r = resolverTurno(estado, "golpe:" + idDoItem(estado, "zabuza"), rng);
    const dano = eventosDo(r.eventos, "danoNoInimigo")[0]!;
    assert.equal(dano.valor, Math.floor(30 * 0.75));
    assert.equal(dano.reduzidoPelaNevoa, true);
  });
});

describe("energia e fim de turno", () => {
  test("habilidade sem energia suficiente é recusada e nada muda", () => {
    const estado = cenario({ itens: [{ chave: "mera" }] });
    estado.batalha!.energia = 7;
    const r = resolverTurno(estado, "habilidade:" + idDoItem(estado, "mera"), rng);
    assert.equal(r.aceito, false);
    assert.equal(r.estado, estado);
    assert.equal(r.eventos.length, 0);
  });

  test("habilidade gasta a energia e não recupera", () => {
    const estado = cenario({ itens: [{ chave: "mera" }] });
    const r = resolverTurno(estado, "habilidade:" + idDoItem(estado, "mera"), rng);
    assert.equal(r.estado.batalha!.energia, 20 - 8);
    assert.equal(eventosDo(r.eventos, "danoNoInimigo")[0]?.valor, 35);
  });

  test("energia nunca passa do máximo", () => {
    const estado = cenario();
    const r = resolverTurno(estado, "soco", rng);
    assert.equal(r.estado.batalha!.energia, 20);
  });

  test("o inimigo ataca depois da ação e o turno avança", () => {
    const estado = cenario();
    const r = resolverTurno(estado, "soco", rng);
    const tipos = r.eventos.map((e) => e.tipo);
    assert.deepEqual(tipos, ["acaoDoJogador", "danoNoInimigo", "acaoInimiga", "danoNoJogador"]);
    assert.equal(r.estado.batalha!.turno, 2);
    assert.equal(r.estado.batalha!.pv, 100 - 8);
  });

  test("defender divide o dano por 2 e soma a guarda do equipamento", () => {
    const estado = cenario({ itens: [{ chave: "vest" }] });
    estado.batalha!.turno = 3; // golpe pesado: 24
    estado.batalha!.primeiroGolpe = false;
    const r = resolverTurno(estado, "defender", rng);
    const dano = eventosDo(r.eventos, "danoNoJogador")[0]!;
    assert.equal(dano.valor, Math.max(1, Math.ceil((24 - 3) / 2) - 2));
    assert.equal(dano.bloqueado, true);
  });

  test("barreira absorve o primeiro golpe da luta e só ele", () => {
    let estado = cenario({ itens: [{ chave: "armament" }] });
    let r = resolverTurno(estado, "soco", rng);
    assert.equal(eventosDo(r.eventos, "danoNoJogador")[0]?.valor, 0);
    assert.equal(eventosDo(r.eventos, "danoNoJogador")[0]?.absorvido, 8);
    estado = r.estado;
    r = resolverTurno(estado, "soco", rng);
    assert.equal(eventosDo(r.eventos, "danoNoJogador")[0]?.valor, 8);
  });

  test("especial evita a próxima ação inimiga uma vez por luta", () => {
    const estado = cenario({ itens: [{ chave: "hie", xp: 7 }] });
    const id = "especial:" + idDoItem(estado, "hie");
    const r = resolverTurno(estado, id, rng);
    assert.equal(eventosDo(r.eventos, "acaoInimigaEvitada")[0]?.especialId, "especial:corpo-de-gelo");
    assert.equal(r.estado.batalha!.pv, 100);
    assert.equal(acoesDisponiveis(r.estado).find((a) => a.id === id)?.desativada, true);
    assert.equal(resolverTurno(r.estado, id, rng).aceito, false);
  });

  test("vitória dá moedas, XP, troca de tela e o golpe final", () => {
    const estado = cenario();
    estado.batalha!.pvInimigo = 5;
    const r = resolverTurno(estado, "soco", aleatorioFixo([0.99, 0.1, 0.1]));
    const vitoria = eventosDo(r.eventos, "vitoria")[0]!;
    assert.equal(vitoria.golpeFinal, "basico:soco");
    assert.equal(r.estado.tela, "recompensa");
    assert.equal(r.estado.moedas, 10);
    assert.equal(r.estado.xp, 2);
    assert.equal(
      r.eventos.some((e) => e.tipo === "acaoInimiga"),
      false,
      "o inimigo derrotado não ataca",
    );
  });

  test("derrota esvazia a mochila e encerra a jornada", () => {
    const estado = cenario({ itens: [{ chave: "marine" }] });
    estado.batalha!.pv = 1;
    const r = resolverTurno(estado, "soco", rng);
    assert.equal(r.estado.tela, "derrota");
    assert.deepEqual(r.estado.itens, []);
    assert.equal(eventosDo(r.eventos, "derrota").length, 1);
  });

  test("Zabuza na névoa não causa dano no turno 2", () => {
    const estado = cenario({ andar: 10 });
    estado.batalha!.turno = 2;
    assert.equal(intencao(estado, 2).tipo, "nevoa");
    const r = resolverTurno(estado, "soco", rng);
    assert.equal(eventosDo(r.eventos, "danoNoJogador").length, 0);
    assert.equal(r.estado.batalha!.pv, estado.batalha!.pv);
  });
});

describe("consumíveis", () => {
  test("cura, recupera energia e some da mochila", () => {
    const estado = cenario({ itens: [{ chave: "senzu" }] });
    estado.batalha!.pv = 20;
    estado.batalha!.energia = 0;
    const r = resolverTurno(estado, "usar:" + idDoItem(estado, "senzu"), rng);
    assert.deepEqual(eventosDo(r.eventos, "cura")[0], { tipo: "cura", pv: 65, energia: 15 });
    assert.equal(r.estado.itens.length, 0);
    assert.equal(r.estado.obtidos.includes("senzu"), true, "não pode ser obtido de novo");
  });
});
