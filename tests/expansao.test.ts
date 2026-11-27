import assert from "node:assert/strict";
import { test } from "node:test";
import { TOTAL_DE_ANDARES, rotas } from "../src/dados/andares.ts";
import { catalogo, exclusivos } from "../src/dados/catalogo.ts";
import { itensDaExpansao, respiracoes } from "../src/dados/expansao.ts";
import { inimigos } from "../src/dados/inimigos.ts";
import { aleatorioComSemente } from "../src/motor/aleatorio.ts";
import { acoesDisponiveis, intencao } from "../src/motor/combate.ts";
import { aplicarComando, entrarNaSala, estadoInicial } from "../src/motor/jornada.ts";
import { cenario } from "./ajudantes/cenario.ts";
import { proximoComando } from "./ajudantes/jogador.ts";

test("novos andares, itens e drops têm definições válidas", () => {
  assert.equal(TOTAL_DE_ANDARES, 20);
  assert.equal(rotas.length, TOTAL_DE_ANDARES);
  assert.equal(inimigos.length, TOTAL_DE_ANDARES);
  assert.equal(itensDaExpansao.length, 30);
  assert.equal(Object.keys(catalogo).length, 86);
  assert.equal(respiracoes.length, 10);
  for (const inimigo of inimigos) {
    assert.ok(catalogo[inimigo.drop]);
    assert.ok(exclusivos.has(inimigo.drop));
  }
});

test("eventos oferecem os dois treinos enquanto o item não foi obtido", () => {
  for (const [andar, chave] of [[12, "resp_agua"], [17, "db_kame"]] as const) {
    const estado = estadoInicial();
    estado.andar = andar;
    entrarNaSala(estado, "evento", () => 0);
    assert.ok(estado.sala.itens?.includes(chave));
    assert.equal(aplicarComando(estado, {tipo:"pegar", chave}, () => 0, []), null);
    entrarNaSala(estado, "evento", () => 0);
    assert.ok(!estado.sala.itens?.includes(chave));
  }
});

test("a Respiração equipada usa energia e aciona sua animação", () => {
  const estado = cenario({andar: 11, itens:[{chave:"resp_agua"}]});
  const acao = acoesDisponiveis(estado).find(a => a.animacaoId === "habilidade:resp_agua");
  assert.ok(acao);
  const energia = estado.batalha!.energia;
  const eventos: Parameters<typeof aplicarComando>[3] = [];
  assert.equal(aplicarComando(estado, {tipo:"turno", acaoId:acao.id}, () => 0, eventos), null);
  assert.equal(estado.batalha?.energia, energia - 6);
  assert.ok(eventos.some(e => e.tipo === "danoNoInimigo" && e.valor === 34));
});

test("cada novo chefe prepara o golpe pesado e um save antigo pode seguir", () => {
  for (const andar of [15,20]) {
    const estado = cenario({andar});
    assert.equal(intencao(estado, 2).dano, 0);
    assert.ok(intencao(estado, 3).dano > intencao(estado, 1).dano);
  }
  const estado = estadoInicial();
  estado.tela = "vitoria";
  estado.andar = 10;
  assert.equal(aplicarComando(estado, {tipo:"rota", destino:"combate"}, () => 0, []), null);
  assert.equal(estado.andar, 11);
  assert.equal(estado.tela, "combate");
});

test("uma jornada pela expansão pode ser concluída pelos comandos normais", () => {
  for (let i = 0; i < 50; i++) {
    const estado = estadoInicial(), rng = aleatorioComSemente(8200 + i), decisao = aleatorioComSemente(9900 + i);
    for (let passo = 0; passo < 900; passo++) {
      aplicarComando(estado, proximoComando(estado, decisao), rng, []);
      if (estado.tela === "derrota") break;
      if (estado.tela === "vitoria") {
        assert.equal(estado.andar, TOTAL_DE_ANDARES);
        assert.equal(estado.ultimoDerrotado, "Vegeta");
        return;
      }
    }
  }
  assert.fail("Nenhuma das partidas simuladas conquistou a torre");
});
