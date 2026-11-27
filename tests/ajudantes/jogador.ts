// Jogador automático para testes: escolhe comandos válidos a partir do estado.
import { rotas } from "../../src/dados/andares.ts";
import type { Aleatorio, Comando, EstadoDaPartida } from "../../src/dominio/tipos.ts";
import { acoesDisponiveis } from "../../src/motor/combate.ts";
import { precoNaLoja } from "../../src/motor/consultas.ts";
import { podeMelhorar, podeTreinar } from "../../src/motor/progressao.ts";

function escolher<T>(lista: readonly T[], sorteio: Aleatorio): T {
  const item = lista[Math.floor(sorteio() * lista.length)];
  if (item === undefined) throw new Error("lista vazia");
  return item;
}

/** Joga de forma razoável: prefere formas e habilidades, mas às vezes escolhe ao acaso. */
export function proximoComando(estado: EstadoDaPartida, sorteio: Aleatorio): Comando {
  const extras: Comando[] = [];
  if (!["combate", "titulo", "derrota", "vitoria"].includes(estado.tela)) {
    if (sorteio() < 0.25) extras.push({ tipo: "equiparMelhores" });
    if (estado.itens.length && sorteio() < 0.15) extras.push({ tipo: "equipar", itemId: escolher(estado.itens, sorteio).id });
    if (estado.pontos > 0 && sorteio() < 0.5)
      extras.push({ tipo: "atributo", atributo: escolher(["atk", "def", "res"] as const, sorteio) });
  }
  const extra = extras[0];
  if (extra) return extra;

  switch (estado.tela) {
    case "titulo":
    case "derrota":
    case "vitoria":
      return { tipo: "iniciar" };
    case "combate": {
      const energia = estado.batalha?.energia ?? 0;
      const validas = acoesDisponiveis(estado).filter((a) => !a.desativada && energia >= a.custo);
      if (sorteio() < 0.35) return { tipo: "turno", acaoId: escolher(validas, sorteio).id };
      const preferidas = validas.filter((a) => a.categoria === "forma" || a.categoria === "habilidade" || a.categoria === "especial");
      const golpes = validas.filter((a) => a.categoria === "golpe");
      const lista = preferidas.length ? preferidas : golpes.length ? golpes : validas;
      return { tipo: "turno", acaoId: escolher(lista, sorteio).id };
    }
    case "recompensa": {
      const itens = estado.sala.itens ?? [];
      return itens.length ? { tipo: "pegar", chave: escolher(itens, sorteio) } : { tipo: "continuar" };
    }
    case "rota":
      return { tipo: "rota", destino: escolher(rotas[estado.andar] ?? ["combate"], sorteio) };
    case "evento": {
      const itens = estado.sala.itens ?? [];
      return itens.length && sorteio() < 0.8 ? { tipo: "pegar", chave: escolher(itens, sorteio) } : { tipo: "moedasDoEvento" };
    }
    case "loja": {
      const acessiveis = (estado.sala.itens ?? []).filter((chave) => estado.moedas >= precoNaLoja(chave));
      return acessiveis.length && sorteio() < 0.75 ? { tipo: "comprar", chave: escolher(acessiveis, sorteio) } : { tipo: "sairDaLoja" };
    }
    case "descanso": {
      const treinaveis = estado.itens.filter(podeTreinar);
      const melhoraveis = estado.itens.filter(podeMelhorar);
      const r = sorteio();
      if (treinaveis.length && r < 0.45) return { tipo: "treinar", itemId: escolher(treinaveis, sorteio).id };
      if (melhoraveis.length && r < 0.85) return { tipo: "melhorar", itemId: escolher(melhoraveis, sorteio).id };
      return { tipo: "moedasDoDescanso" };
    }
  }
}
