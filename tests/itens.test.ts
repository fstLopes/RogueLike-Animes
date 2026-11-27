import assert from "node:assert/strict";
import { TOTAL_DE_ANDARES } from "../src/dados/andares.ts";
import { describe, test } from "node:test";
import { exclusivos, catalogo } from "../src/dados/catalogo.ts";
import { inimigoDoAndar } from "../src/dados/inimigos.ts";
import type { EventoDoTurno } from "../src/dominio/tipos.ts";
import { aleatorioComSemente, aleatorioFixo } from "../src/motor/aleatorio.ts";
import { alternarEquipamento, equiparMelhores } from "../src/motor/equipamentos.ts";
import { adicionarItem } from "../src/motor/inventario.ts";
import { aplicarComando, entrarNaSala, estadoInicial, executarComando } from "../src/motor/jornada.ts";
import { chancesPorRaridade, sortearDrop, sortearOferta } from "../src/motor/recompensas.ts";
import { cenario, idDoItem } from "./ajudantes/cenario.ts";

describe("itens repetidos", () => {
  test("a mesma chave não entra duas vezes na mochila", () => {
    const estado = estadoInicial();
    assert.ok(adicionarItem(estado, "wado"));
    assert.equal(adicionarItem(estado, "wado"), null);
    assert.equal(estado.itens.length, 1);
  });

  test("ofertas nunca repetem itens obtidos nem incluem exclusivos", () => {
    const estado = estadoInicial();
    const sorteio = aleatorioComSemente(42);
    for (let rodada = 0; rodada < 200; rodada++) {
      const oferta = sortearOferta(estado, 1 + (rodada % 10), sorteio);
      assert.equal(new Set(oferta).size, oferta.length, "itens distintos na mesma oferta");
      for (const chave of oferta) {
        assert.equal(exclusivos.has(chave), false);
        assert.equal(estado.obtidos.includes(chave), false);
      }
      const primeiro = oferta[0];
      if (primeiro) adicionarItem(estado, primeiro);
    }
  });

  test("quando todos os itens já saíram, a oferta vem vazia", () => {
    const estado = estadoInicial();
    for (const chave of Object.keys(catalogo)) adicionarItem(estado, chave);
    assert.deepEqual(sortearOferta(estado, 5, aleatorioFixo([0.5])), []);
  });

  test("drop exclusivo não cai se já foi obtido (nem consome sorteio)", () => {
    const estado = estadoInicial();
    let chamadas = 0;
    const contador = () => {
      chamadas++;
      return 0;
    };
    assert.equal(sortearDrop(estado, inimigoDoAndar(1), contador), "marine");
    adicionarItem(estado, "marine");
    assert.equal(sortearDrop(estado, inimigoDoAndar(1), contador), null);
    assert.equal(chamadas, 1);
  });

  test("comprar o mesmo item duas vezes é recusado", () => {
    const estado = cenario({ foraDeCombate: true });
    estado.tela = "loja";
    estado.moedas = 100;
    estado.sala.itens = ["boots"];
    const eventos: EventoDoTurno[] = [];
    assert.equal(aplicarComando(estado, { tipo: "comprar", chave: "boots" }, aleatorioFixo([0]), eventos), null);
    assert.equal(estado.moedas, 100 - 13);
    assert.notEqual(aplicarComando(estado, { tipo: "comprar", chave: "boots" }, aleatorioFixo([0]), eventos), null);
    assert.equal(estado.moedas, 87);
  });
});

describe("recompensas com aleatoriedade controlada", () => {
  test("pesos por raridade somam 100 em todos os andares", () => {
    for (let andar = 1; andar <= TOTAL_DE_ANDARES; andar++) {
      const soma = chancesPorRaridade(andar).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(soma - 100) < 1e-9, `andar ${andar}: ${soma}`);
    }
  });

  test("sorteio baixo dá item comum; sorteio alto, mítico", () => {
    const estado = estadoInicial();
    const [comum] = sortearOferta(estado, 1, aleatorioFixo([0, 0]));
    assert.equal(catalogo[comum!]?.raridade, 0);
    const [mitico] = sortearOferta(estado, 1, aleatorioFixo([0.9999, 0]));
    assert.equal(catalogo[mitico!]?.raridade, 4);
  });

  test("a mesma semente gera as mesmas recompensas", () => {
    const a = sortearOferta(estadoInicial(), 4, aleatorioComSemente(7));
    const b = sortearOferta(estadoInicial(), 4, aleatorioComSemente(7));
    assert.deepEqual(a, b);
  });

  test("evento do 2º andar sempre oferece a fruta do Leopardo", () => {
    const estado = cenario({ andar: 2, foraDeCombate: true });
    entrarNaSala(estado, "evento", aleatorioComSemente(3));
    assert.equal(estado.sala.itens?.[0], "leopard");
  });

  test("vitória com sorteio abaixo da chance entrega o drop", () => {
    const estado = cenario();
    estado.batalha!.pvInimigo = 1;
    const r = executarComando(estado, { tipo: "turno", acaoId: "soco" }, aleatorioFixo([0.1, 0.5]));
    assert.equal(r.estado.obtidos.includes("marine"), true);
    assert.equal(r.estado.sala.drop, "marine");
  });
});

describe("equipamento", () => {
  test("passivas têm 3 espaços", () => {
    const estado = cenario({
      foraDeCombate: true,
      itens: [
        { chave: "haki", equipar: true },
        { chave: "ten", equipar: true },
        { chave: "armament", equipar: true },
        { chave: "sage", equipar: false },
      ],
    });
    assert.equal(alternarEquipamento(estado, idDoItem(estado, "sage")), false);
    assert.equal(estado.registro[0], "Retire uma passiva para liberar um dos 3 espaços.");
  });

  test("não dá para trocar equipamento durante o combate", () => {
    const estado = cenario({ itens: [{ chave: "wado", equipar: false }] });
    assert.equal(alternarEquipamento(estado, idDoItem(estado, "wado")), false);
    assert.equal(equiparMelhores(estado), false);
  });

  test("equipar melhores escolhe a arma de maior dano", () => {
    const estado = cenario({ foraDeCombate: true, itens: [{ chave: "marine" }, { chave: "zabuza", equipar: false }] });
    equiparMelhores(estado);
    assert.deepEqual(estado.equipados.arma, [idDoItem(estado, "zabuza")]);
  });
});
