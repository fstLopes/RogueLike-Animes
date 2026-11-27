// Entrada e saída de cada transformação. O visual ativo entre os turnos vem do
// CSS (src/estilos/formas.css), pelo atributo data-forma do herói, e continua
// visível mesmo com as animações desligadas.
import type { Cena } from "./cena.ts";
import type { AnimacaoDeForma } from "./contexto.ts";
import { juntos } from "./diretor.ts";
import { anel, brotar, clarao, luz, mover, murchar, numero, particulas, raio, rotulo, tremor, type FormaDeParticula } from "./efeitos.ts";

function aplicar(c: Cena, id: string) {
  c.heroi.dataset.forma = id;
}

function remover(c: Cena) {
  c.heroi.dataset.forma = "";
}

/** Saída padrão por "família" de transformação. */
function saidaCom(cor: string, forma: FormaDeParticula, camadas: string[], extra?: (c: Cena) => Promise<void>) {
  return async (c: Cena) => {
    const centro = c.heroiCentro;
    await juntos(
      ...camadas.map((s) => murchar(c, s, 420)),
      particulas(c, centro, { cor, forma, quantidade: 12, distancia: 60, direcao: -90, abertura: 160, duracao: 760 }),
      c.d.animar(
        c.heroi,
        [
          { filter: "brightness(1)" },
          { filter: "brightness(1.8)" },
          { filter: "brightness(1)" },
          { filter: "brightness(1.5)" },
          { filter: "brightness(1)" },
        ],
        { duration: 520 },
      ),
      extra ? extra(c) : Promise.resolve(),
    );
    remover(c);
    await juntos(mover(c, c.heroi, { dy: 4, escala: 0.97, duracao: 360, pausa: 0.3 }), rotulo(c, "Forma encerrada", "#cdbbe0", 700));
  };
}

export const animacoesDeForma: Record<string, AnimacaoDeForma> = {
  // Gear 2: agacha, bombeia o corpo duas vezes e solta vapor; a pele fica rosada.
  "forma:gear-2": {
    entrada: async (c, id) => {
      await mover(c, c.heroi, { dy: 8, escala: 0.94, duracao: 260, pausa: 0.5 });
      for (let i = 0; i < 2; i++) {
        await c.d.animar(c.heroi, [{ transform: "scale(1,1)" }, { transform: "scale(1.05,.92)" }, { transform: "scale(1,1)" }], {
          duration: 180,
        });
      }
      aplicar(c, id);
      await juntos(
        particulas(c, c.heroiCentro, {
          cor: "#ffe3ea",
          forma: "fumaca",
          quantidade: 14,
          distancia: 60,
          direcao: -90,
          abertura: 200,
          duracao: 1000,
          tamanho: 14,
        }),
        rotulo(c, "Gear 2", "#ff9fb1"),
      );
    },
    saida: saidaCom("#ffe3ea", "fumaca", [".acc-vapor"]),
  },

  // Gear 3: o polegar infla o braço até um punho gigante.
  "forma:gear-3": {
    entrada: async (c, id) => {
      await mover(c, c.heroi, { dx: -6, giro: -6, duracao: 300, pausa: 0.5 });
      aplicar(c, id);
      await juntos(brotar(c, ".acc-punho-gigante", 520, "0% 50%"), tremor(c, 4, 300), rotulo(c, "Gear 3", "#ffb08a"));
      await anel(c, c.mao, { cor: "#ffb08a", raio: 40, espessura: 4 });
    },
    saida: saidaCom("#ffe3ea", "fumaca", [".acc-punho-gigante"]),
  },

  // Gear 4: o corpo infla, ganha marcas escuras e começa a quicar.
  "forma:gear-4": {
    entrada: async (c, id) => {
      await c.d.animar(c.heroi, [{ transform: "scale(1)" }, { transform: "scale(1.22,1.12)" }, { transform: "scale(1.12)" }], {
        duration: 520,
        easing: "cubic-bezier(.2,.9,.3,1.3)",
      });
      aplicar(c, id);
      await juntos(
        anel(c, c.heroiCentro, { cor: "#3a0f16", raio: 80, espessura: 8 }),
        particulas(c, c.heroiCentro, { cor: "#ffe3ea", forma: "fumaca", quantidade: 16, distancia: 70, duracao: 1000, tamanho: 16 }),
        tremor(c, 6),
        rotulo(c, "Gear 4", "#ff6a7a"),
      );
    },
    saida: saidaCom("#ffe3ea", "fumaca", [".acc-marcas"], (c) =>
      c.d.animar(c.heroi, [{ transform: "scale(1.12)" }, { transform: "scale(.9,.95)" }, { transform: "scale(1)" }], { duration: 600 }),
    ),
  },

  // Gear 5: clarão branco, nuvens, batidas rítmicas e um corpo elástico de desenho animado.
  "forma:gear-5": {
    entrada: async (c, id) => {
      for (let i = 0; i < 3; i++) {
        void anel(c, c.heroiCentro, { cor: "#ffffff", raio: 50 + i * 20, espessura: 3, duracao: 520 });
        await c.d.esperar(170);
      }
      await clarao(c, "#ffffff", 360, 0.9);
      aplicar(c, id);
      await juntos(
        c.d.animar(
          c.heroi,
          [{ transform: "scale(1,1)" }, { transform: "scale(1.2,.8)" }, { transform: "scale(.85,1.2)" }, { transform: "scale(1,1)" }],
          { duration: 620 },
        ),
        particulas(c, c.heroiCentro, { cor: "#ffffff", forma: "fumaca", quantidade: 18, distancia: 80, duracao: 1100, tamanho: 18 }),
        rotulo(c, "Gear 5", "#ffffff"),
      );
    },
    saida: saidaCom("#ffffff", "fumaca", [".acc-cabelo-nuvem", ".acc-nuvens"]),
  },

  // Manto da Kurama: bolhas de chakra sobem, o contorno de chamas e as caudas aparecem.
  "forma:manto-da-kurama": {
    entrada: async (c, id) => {
      await particulas(c, c.heroiCentro, { cor: "#ff9a3c", forma: "bolha", quantidade: 16, distancia: 70, convergir: true, duracao: 620 });
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-chamas", 420),
        brotar(c, ".acc-caudas", 520, "0% 100%"),
        luz(c, c.heroiCentro, { cor: "#ff9a3c", raio: 80, duracao: 600 }),
        rotulo(c, "Manto da Kurama", "#ff9a3c"),
      );
    },
    saida: saidaCom("#ff9a3c", "bolha", [".acc-chamas", ".acc-caudas"]),
  },

  // Modo Chakra: explosão dourada, marcas no corpo e muitas caudas.
  "forma:modo-chakra-da-kurama": {
    entrada: async (c, id) => {
      await juntos(
        particulas(c, c.heroiCentro, { cor: "#ffd34d", forma: "ponto", quantidade: 22, distancia: 90, convergir: true, duracao: 700 }),
        luz(c, c.heroiCentro, { cor: "#ffd34d", raio: 60, duracao: 700 }),
      );
      await clarao(c, "#fff1a8", 260, 0.7);
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-caudas", 600, "0% 100%"),
        anel(c, c.heroiCentro, { cor: "#ffd34d", raio: 90, espessura: 5 }),
        tremor(c, 6),
        rotulo(c, "Modo Chakra da Kurama", "#ffd34d"),
      );
    },
    saida: saidaCom("#ffd34d", "ponto", [".acc-caudas", ".acc-marcas", ".acc-chamas"]),
  },

  // Super Saiyajin: grito, aura dourada em picos, faíscas e cabelo dourado.
  "forma:super-saiyajin": {
    entrada: async (c, id) => {
      await juntos(mover(c, c.heroi, { dy: 6, escala: 0.95, duracao: 520, pausa: 0.6 }), tremor(c, 4, 520));
      for (let i = 0; i < 3; i++)
        void raio(
          c,
          { x: c.heroiCentro.x - 30 + i * 30, y: c.heroiCentro.y + 40 },
          { x: c.heroiCentro.x - 20 + i * 20, y: c.heroiCentro.y - 50 },
          { cor: "#fff3a0", espessura: 2, duracao: 260, desvio: 12, atraso: i * 90 },
        );
      await c.d.esperar(260);
      aplicar(c, id);
      await juntos(
        clarao(c, "#ffe36b", 300, 0.6),
        particulas(
          c,
          { x: c.heroiCentro.x, y: c.heroiCentro.y + 50 },
          { cor: "#ffe36b", forma: "faisca", quantidade: 18, distancia: 90, direcao: -90, abertura: 70, duracao: 700, tamanho: 12 },
        ),
        rotulo(c, "Super Saiyajin", "#ffe36b"),
      );
    },
    saida: saidaCom("#ffe36b", "faisca", [".acc-cabelo-dourado"]),
  },

  // Black Asta: partículas negras convergem e uma asa rasga as costas.
  "forma:black-asta": {
    entrada: async (c, id) => {
      await particulas(c, c.heroiCentro, {
        cor: "#0b0710",
        forma: "fumaca",
        quantidade: 18,
        distancia: 80,
        convergir: true,
        duracao: 620,
        tamanho: 12,
      });
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-asa", 460, "100% 50%"),
        anel(c, c.heroiCentro, { cor: "#1a1020", raio: 90, espessura: 10 }),
        tremor(c, 7),
        rotulo(c, "Black Asta", "#b8a8c8"),
      );
    },
    saida: saidaCom("#0b0710", "fumaca", [".acc-asa", ".acc-chifre"]),
  },

  // Amaru: anel de tambores aparece e o corpo cresce entre relâmpagos.
  "forma:amaru": {
    entrada: async (c, id) => {
      void raio(c, { x: c.heroiCentro.x + 20, y: -10 }, c.heroiCentro, { cor: "#8fd0ff", espessura: 5, duracao: 360 });
      await clarao(c, "#d9eeff", 220, 0.6);
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-tambores", 520),
        c.d.animar(c.heroi, [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1.22)" }], { duration: 520 }),
        rotulo(c, "Amaru", "#8fd0ff"),
      );
      for (let i = 0; i < 3; i++) {
        void anel(c, c.heroiCentro, { cor: "#8fd0ff", raio: 70, espessura: 3, duracao: 360 });
        await c.d.esperar(140);
      }
    },
    saida: saidaCom("#8fd0ff", "faisca", [".acc-tambores"], (c) =>
      c.d.animar(c.heroi, [{ transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 500 }),
    ),
  },

  // Leopardo Híbrido: agacha como felino, surgem orelhas, manchas e garras.
  "forma:leopardo-hibrido": {
    entrada: async (c, id) => {
      await mover(c, c.heroi, { dy: 10, escala: 0.9, giro: 6, duracao: 340, pausa: 0.5 });
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-orelhas", 300),
        brotar(c, ".acc-garras", 360),
        particulas(c, c.heroiCentro, { cor: "#ffc86a", forma: "pena", quantidade: 10, distancia: 50, duracao: 600 }),
        rotulo(c, "Leopardo Híbrido", "#ffc86a"),
      );
    },
    saida: saidaCom("#ffc86a", "pena", [".acc-orelhas", ".acc-garras", ".acc-manchas"]),
  },

  // Forma Motosserra: puxa a corda, as lâminas saem com faíscas e vibram.
  "forma:forma-motosserra": {
    entrada: async (c, id) => {
      await mover(c, c.heroi, { dx: -4, dy: -4, giro: 10, duracao: 220, pausa: 0.2 });
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-serra", 300, "50% 100%"),
        particulas(c, { x: c.heroiCentro.x, y: c.heroiCentro.y - 60 }, { cor: "#ffcf5c", quantidade: 16, distancia: 60, duracao: 500 }),
        c.d.animar(
          c.heroi,
          [
            { transform: "translate(0,0)" },
            { transform: "translate(2px,-1px)" },
            { transform: "translate(-2px,1px)" },
            { transform: "translate(1px,1px)" },
            { transform: "translate(0,0)" },
          ],
          { duration: 320, iterations: 2 },
        ),
        rotulo(c, "Forma Motosserra", "#ff6a7a"),
      );
    },
    saida: saidaCom("#ffcf5c", "faisca", [".acc-serra"]),
  },

  // Explosão de 100%: contador sobe, a aura gira e o cabelo se ergue.
  "forma:explosao-de-100": {
    entrada: async (c, id) => {
      for (const p of ["50%", "80%", "100%"]) {
        void numero(c, { x: c.heroiCentro.x, y: c.heroiCentro.y - 60 }, p, "aviso");
        await c.d.esperar(230);
      }
      aplicar(c, id);
      await juntos(brotar(c, ".acc-espiral", 520), clarao(c, "#e7b6ff", 320, 0.5), tremor(c, 6), rotulo(c, "Explosão de 100%", "#e7b6ff"));
    },
    saida: saidaCom("#e7b6ff", "ponto", [".acc-espiral", ".acc-cabelo-erguido"]),
  },

  // Kagune Rinkaku: tentáculos vermelhos irrompem das costas.
  "forma:kagune-rinkaku": {
    entrada: async (c, id) => {
      await mover(c, c.heroi, { dy: 4, giro: -6, duracao: 260, pausa: 0.5 });
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-kagune", 520, "100% 100%"),
        particulas(c, c.heroiCentro, { cor: "#c3263a", quantidade: 10, distancia: 60, direcao: 180, abertura: 120 }),
        rotulo(c, "Kagune Rinkaku", "#ff5b6e"),
      );
    },
    saida: saidaCom("#c3263a", "estilhaco", [".acc-kagune"]),
  },

  // Modo Sábio: energia da natureza entra devagar; olhos com pigmento laranja.
  "forma:modo-sabio": {
    entrada: async (c, id) => {
      await juntos(
        particulas(c, c.heroiCentro, { cor: "#9ef0b0", forma: "folha", quantidade: 14, distancia: 90, convergir: true, duracao: 900 }),
        mover(c, c.heroi, { dy: 2, duracao: 900, pausa: 0.6 }),
      );
      aplicar(c, id);
      await juntos(
        brotar(c, ".acc-sabio", 300),
        luz(c, c.heroiCentro, { cor: "#9ef0b0", raio: 70, duracao: 600, pico: 0.5 }),
        rotulo(c, "Modo Sábio", "#ffb15c"),
      );
    },
    saida: saidaCom("#9ef0b0", "folha", [".acc-sabio"]),
  },
};
