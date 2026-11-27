import { respiracoes, tecnicasDeKi } from "../dados/expansao.ts";
import type { AnimacaoDeGolpe, AnimacaoInimiga } from "./contexto.ts";
import { anel, arco, feixe, luz, marcas, mover, onda, particulas, projetil, raio } from "./efeitos.ts";
import { juntos } from "./diretor.ts";

export const acoesDaExpansao: Record<string, AnimacaoDeGolpe> = {};
for (const [chave, , , , , cor, desenho, preparo] of [...respiracoes, ...tecnicasDeKi]) {
  acoesDaExpansao["habilidade:" + chave] = async ({ c, impacto, final }) => {
    const alvo = c.inimigoCentro;
    const de = c.mao;
    await luz(c, de, { cor, raio: 23 + preparo / 14, duracao: preparo });
    if (desenho === "raio") {
      await juntos(
        raio(c, de, alvo, { cor, espessura: 7, duracao: 150 }),
        mover(c, c.heroi, { dx: c.direcao.x * 0.57, dy: c.direcao.y * 0.57, duracao: 240 }),
      );
    } else if (desenho === "arco") {
      await arco(c, alvo, { raio: chave === "resp_sol" ? 95 : 64, de: -135, ate: 185, cor, espessura: 10, duracao: 235 });
    } else if (desenho === "garras") {
      await marcas(c, alvo, { quantidade: chave === "resp_fera" ? 2 : 4, cor, angulo: chave === "resp_lua" ? -34 : 39, comprimento: 105, duracao: 135 });
    } else if (desenho === "onda") {
      await onda(c, de, alvo, { cor, largura: 55, duracao: 270 });
    } else if (desenho === "esfera" || desenho === "disco") {
      await projetil(c, de, alvo, { cor, forma: "bola", tamanho: desenho === "disco" ? 23 : chave === "db_genki" ? 73 : 50, giro: desenho === "disco" ? 4 : 0, fantasmas: 3, duracao: 290 });
    } else {
      const disparo = feixe(c, de, alvo, { cor, espessura: chave === "db_final_flash" ? 48 : 16 + preparo / 18, duracao: 330 });
      if (desenho === "espiral") void raio(c, de, alvo, { cor: "#fff3b5", segmentos: 18, desvio: 20, duracao: 300 });
      await c.d.esperar(110);
      impacto(final ? 1.5 : 1);
      await disparo;
      return;
    }
    impacto(final ? 1.5 : 1);
    await juntos(anel(c, alvo, { cor, raio: 52, espessura: 4, duracao: 290 }),
      particulas(c, alvo, { cor, forma: "faisca", quantidade: 12, distancia: 70, direcao: 0, abertura: 330 }));
  };
}

acoesDaExpansao["consumivel:db_capsula"] = async ({ c, impacto }) => {
  impacto();
  await anel(c, c.heroiCentro, { cor: "#8efdc7", raio: 65, espessura: 5, duracao: 420 });
};

export const inimigosDaExpansao: Record<string, AnimacaoInimiga> = {
  "inimigo:15:preparacao": async ({ c, impacto }) => {
    impacto();
    await arco(c, c.inimigoCentro, { cor: "#d5a8ff", raio: 57, de: 0, ate: 265, espessura: 5, duracao: 380 });
  },
  "inimigo:15:pesado": async ({ c, impacto }) => {
    await onda(c, c.inimigoCentro, c.heroiCentro, { cor: "#dfb1ff", largura: 85, duracao: 285 });
    impacto();
    await marcas(c, c.heroiCentro, { cor: "#ecccff", quantidade: 4, angulo: -30, comprimento: 95 });
  },
  "inimigo:20:preparacao": async ({ c, impacto }) => {
    impacto();
    await luz(c, c.inimigoCentro, { cor: "#ca8bff", raio: 65, duracao: 440 });
  },
  "inimigo:20:pesado": async ({ c, impacto }) => {
    const disparo = feixe(c, c.inimigoCentro, c.heroiCentro, { cor: "#cf9bff", espessura: 50, duracao: 520 });
    await c.d.esperar(140);
    impacto();
    await disparo;
  },
};
