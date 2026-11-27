// Os 90 IDs do inventário proposto (docs/inventario-ids-animaveis.json) precisam
// apontar para animações que existem no registro do projeto.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolverIdDoInventario, tabelaDoInventario } from "../src/animacoes/inventario-ids.ts";
import { registroDeAcoes, registroDeFormas, registroInimigo } from "../src/animacoes/registro.ts";
import { animacoesDeRevelacao } from "../src/animacoes/revelacoes.ts";

interface Inventario {
  total: number;
  count: Record<string, number>;
  animations: { id: string; category: string; name: string }[];
}

const inventario = JSON.parse(readFileSync(new URL("../docs/inventario-ids-animaveis.json", import.meta.url), "utf8")) as Inventario;

test("o arquivo do inventário tem 130 IDs únicos", () => {
  assert.equal(inventario.animations.length, inventario.total);
  assert.equal(new Set(inventario.animations.map((a) => a.id)).size, 130);
});

test("todo ID do inventário aponta para uma animação existente", () => {
  const faltando: string[] = [];
  for (const { id } of inventario.animations) {
    const destino = resolverIdDoInventario(id);
    const existe =
      destino &&
      (destino.tipo === "acao"
        ? Object.hasOwn(registroDeAcoes, destino.id)
        : destino.tipo === "forma"
          ? Object.hasOwn(registroDeFormas, destino.id)
          : destino.tipo === "inimigo"
            ? Object.hasOwn(registroInimigo, destino.id)
            : Object.hasOwn(animacoesDeRevelacao, destino.id));
    if (!existe) faltando.push(id);
  }
  assert.deepEqual(faltando, []);
});

test("a tabela cobre exatamente os IDs do inventário (nenhum sobrando)", () => {
  const doArquivo = new Set(inventario.animations.map((a) => a.id));
  assert.deepEqual(
    [...tabelaDoInventario.keys()].filter((id) => !doArquivo.has(id)),
    [],
  );
});

test("exemplos de correspondência", () => {
  assert.deepEqual(resolverIdDoInventario("weapon.wado.basic"), { tipo: "acao", id: "golpe:wado" });
  assert.deepEqual(resolverIdDoInventario("weapon.wado.shishi_sonson"), { tipo: "acao", id: "habilidade:shishi-sonson" });
  assert.deepEqual(resolverIdDoInventario("form.gum.gear_5"), { tipo: "forma", id: "forma:gear-5" });
  assert.deepEqual(resolverIdDoInventario("enemy.zabuza.heavy"), { tipo: "inimigo", id: "inimigo:emboscada" });
  assert.deepEqual(resolverIdDoInventario("loot.mythic.reveal"), { tipo: "revelacao", id: "revelacao:mitica" });
});
