// Cobertura do registro de animações: toda ação e toda forma do catálogo precisa
// de uma animação própria, e o registro não pode ter entradas órfãs.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { catalogo } from "../src/dados/catalogo.ts";
import { TOTAL_DE_ANDARES } from "../src/dados/andares.ts";
import { animacaoDaIntencao, intencao } from "../src/motor/combate.ts";
import { estadoInicial } from "../src/motor/jornada.ts";
import { registroDeAcoes, registroDeEvasivas, registroDeFormas, registroInimigo } from "../src/animacoes/registro.ts";

function idsDoCatalogo() {
  const acoes = ["basico:soco", "basico:defender"];
  const especiais: string[] = [];
  const formas: string[] = [];
  for (const item of Object.values(catalogo)) {
    const e = item.efeitos;
    if (e.golpe) acoes.push(e.golpe.id);
    if (e.habilidade) acoes.push(e.habilidade.id);
    if (e.especial) {
      acoes.push(e.especial.id);
      especiais.push(e.especial.id);
    }
    for (const f of e.formas ?? []) formas.push(f.id);
    if (item.slot === "consumivel") acoes.push("consumivel:" + item.chave);
  }
  return { acoes, especiais, formas };
}

describe("registro de animações", () => {
  const { acoes, especiais, formas } = idsDoCatalogo();

  test("ids de ação e de forma são únicos no catálogo", () => {
    assert.equal(new Set(acoes).size, acoes.length);
    assert.equal(new Set(formas).size, formas.length);
  });

  test("todo ataque, habilidade, especial e consumível tem animação", () => {
    const faltando = acoes.filter((id) => !Object.hasOwn(registroDeAcoes, id));
    assert.deepEqual(faltando, []);
  });

  test("toda transformação tem entrada e saída", () => {
    for (const id of formas) {
      const forma = registroDeFormas[id];
      assert.ok(forma, "sem animação: " + id);
      assert.equal(typeof forma.entrada, "function");
      assert.equal(typeof forma.saida, "function");
    }
    assert.equal(formas.length, 14);
  });

  test("todo especial tem a reação de golpe evitado", () => {
    for (const id of especiais) assert.ok(registroDeEvasivas[id], "sem evasiva: " + id);
  });

  test("cada ação tem uma sequência própria (nenhuma função compartilhada)", () => {
    const funcoes = acoes.map((id) => registroDeAcoes[id]);
    assert.equal(new Set(funcoes).size, acoes.length);
    const entradas = formas.map((id) => registroDeFormas[id]?.entrada);
    assert.equal(new Set(entradas).size, formas.length);
  });

  test("o registro não tem entradas órfãs", () => {
    const conhecidos = new Set([...acoes, ...formas]);
    const orfas = [...Object.keys(registroDeAcoes), ...Object.keys(registroDeFormas)].filter((id) => !conhecidos.has(id));
    assert.deepEqual(orfas, []);
  });

  test("toda intenção inimiga de todos os andares tem animação", () => {
    const estado = estadoInicial();
    for (let andar = 1; andar <= TOTAL_DE_ANDARES; andar++) {
      estado.andar = andar;
      for (let turno = 1; turno <= 3; turno++) {
        const id = animacaoDaIntencao(estado, intencao(estado, turno));
        assert.ok(registroInimigo[id], `andar ${andar}, turno ${turno}: ${id}`);
      }
    }
  });

  test("inventário de ações e formas após a expansão", () => {
    const contar = (prefixo: string) => acoes.filter((id) => id.startsWith(prefixo)).length;
    assert.deepEqual(
      {
        basicas: contar("basico:"),
        golpes: contar("golpe:"),
        habilidades: contar("habilidade:"),
        especiais: contar("especial:"),
        consumiveis: contar("consumivel:"),
        formas: formas.length,
      },
      { basicas: 2, golpes: 21, habilidades: 39, especiais: 4, consumiveis: 4, formas: 14 },
    );
  });
});
