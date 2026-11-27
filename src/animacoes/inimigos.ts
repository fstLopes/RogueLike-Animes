// Ações dos inimigos, ativação dos especiais e a reação quando o especial evita o golpe.
import type { Cena } from "./cena.ts";
import type { AnimacaoDeGolpe, AnimacaoInimiga } from "./contexto.ts";
import { juntos } from "./diretor.ts";
import {
  anel,
  ceu,
  circulo,
  clarao,
  fantasmaDoHeroi,
  luz,
  marcas,
  mover,
  numero,
  particulas,
  projetil,
  rastro,
  reacaoDoHeroi,
  rotulo,
  tremor,
} from "./efeitos.ts";

function investidaInimiga(c: Cena, fracao: number, duracao: number, pausa = 0.25) {
  const alvo = c.heroiCentro;
  const de = c.inimigoCentro;
  return mover(c, c.inimigo, { dx: (alvo.x - de.x) * fracao, dy: (alvo.y - de.y) * fracao, duracao, pausa });
}

export const acoesInimigas: Record<string, AnimacaoInimiga> = {
  // Ataque comum: o inimigo avança e corta.
  "inimigo:ataque": async ({ c, impacto }) => {
    const ida = investidaInimiga(c, 0.45, 380);
    await c.d.esperar(170);
    void rastro(
      c,
      { x: c.heroiCentro.x + 26, y: c.heroiCentro.y - 30 },
      { x: c.heroiCentro.x - 10, y: c.heroiCentro.y + 26 },
      { cor: "#ffb0a0", espessura: 3, duracao: 200 },
    );
    await c.d.esperar(80);
    impacto();
    await juntos(ida, reacaoDoHeroi(c, 1));
  },

  // Bando de Buggy: facas arremessadas.
  "inimigo:buggy-ataque": async ({ c, impacto }) => {
    for (let i = 0; i < 3; i++) {
      void projetil(
        c,
        c.inimigoCentro,
        { x: c.heroiCentro.x + (i - 1) * 8, y: c.heroiCentro.y + (i - 1) * 12 },
        { forma: "kunai", cor: "#ffd0c0", tamanho: 16, duracao: 340, giro: 3, altura: 20, atraso: i * 70 },
      );
    }
    await c.d.esperar(480);
    impacto();
    await reacaoDoHeroi(c, 1);
  },

  // Golpe pesado: brilho vermelho de carga e uma pancada que sacode a arena.
  "inimigo:pesado": async ({ c, impacto }) => {
    await juntos(
      luz(c, c.inimigoCentro, { cor: "#ff5b4f", raio: 54, duracao: 520 }),
      c.d.animar(c.inimigo, [{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-6deg)" }, { transform: "scale(1.15)" }], {
        duration: 520,
      }),
    );
    const ida = investidaInimiga(c, 0.62, 360, 0.2);
    await c.d.esperar(160);
    impacto();
    await juntos(ida, anel(c, c.heroiCentro, { cor: "#ff5b4f", raio: 66, espessura: 6 }), tremor(c, 10, 380), reacaoDoHeroi(c, 1.8));
  },

  // Buggy separa o corpo: pedaços voam por trajetórias diferentes.
  "inimigo:corpo-separado": async ({ c, impacto }) => {
    void c.d.animar(c.inimigo, [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 0.15, offset: 0.8 }, { opacity: 1 }], { duration: 900 });
    for (let i = 0; i < 3; i++) {
      void projetil(
        c,
        c.inimigoCentro,
        { x: c.heroiCentro.x + (i - 1) * 16, y: c.heroiCentro.y },
        { forma: "pedaco", cor: "#ffd5b0", tamanho: 22, duracao: 460, giro: 1.5 - i, altura: 70 - i * 50, atraso: i * 60 },
      );
    }
    await c.d.esperar(560);
    impacto();
    await reacaoDoHeroi(c, 1.1);
  },

  // Zabuza cria névoa: não causa dano neste turno.
  "inimigo:nevoa": async ({ c }) => {
    const nevoa = c.criar("fx-nevoa", "");
    await juntos(
      c.d.animar(
        nevoa,
        [
          { opacity: 0, transform: "translateX(-20%)" },
          { opacity: 0.85, transform: "translateX(0)", offset: 0.5 },
          { opacity: 0.5, transform: "translateX(8%)" },
        ],
        { duration: 900, fill: "both" },
      ),
      c.d.animar(c.inimigo, [{ opacity: 1 }, { opacity: 0.2 }], { duration: 700, fill: "forwards" }),
      rotulo(c, "Névoa", "#cfe9f2"),
    );
    void numero(c, c.inimigoCentro, "NÉVOA", "nevoa");
    nevoa.remove();
  },

  // Emboscada: Zabuza some e reaparece atrás do herói.
  "inimigo:emboscada": async ({ c, impacto }) => {
    await c.d.animar(c.inimigo, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
    const atras = { x: c.heroiCentro.x - 46, y: c.heroiCentro.y - 10 };
    const sombra = c.criar("fx-emboscada", `left:${atras.x}px;top:${atras.y}px`);
    sombra.textContent = c.inimigo.textContent ?? "◈";
    await c.d.animar(
      sombra,
      [
        { opacity: 0, transform: "translate(-50%,-50%) scale(.6)" },
        { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
      ],
      { duration: 220, fill: "both" },
    );
    await marcas(c, c.heroiCentro, {
      quantidade: 2,
      cor: "#d6f2ff",
      angulo: 35,
      comprimento: 90,
      espacamento: 16,
      espessura: 4,
      duracao: 220,
    });
    impacto();
    await juntos(
      reacaoDoHeroi(c, 1.6),
      tremor(c, 8),
      c.d.animar(sombra, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "both" }),
    );
    sombra.remove();
    await c.d.animar(c.inimigo, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  },
};

// ---- Especiais: ativação ---------------------------------------------------

export const ativacaoDeEspeciais: Record<string, AnimacaoDeGolpe> = {
  // O corpo se prepara para se dividir.
  "especial:esquiva-fragmentada": async ({ c, impacto }) => {
    impacto();
    await juntos(
      fantasmaDoHeroi(c, { dx: -18, dy: -10, cor: "#ffd5b0", duracao: 420 }),
      fantasmaDoHeroi(c, { dx: 16, dy: 12, cor: "#ffd5b0", duracao: 420 }),
      rotulo(c, "Esquiva Fragmentada", "#ffd5b0"),
    );
  },
  // Um olho de luz se abre sobre o herói; pós-imagens mostram o futuro.
  "especial:visao-do-futuro": async ({ c, impacto }) => {
    impacto();
    const olho = { x: c.heroiCentro.x, y: c.heroiCentro.y - 70 };
    await juntos(
      circulo(c, olho, { cor: "#ffe9a8", raio: 20, duracao: 700, achatado: 0.5 }),
      fantasmaDoHeroi(c, { dx: 30, cor: "#ffe9a8", duracao: 600 }),
      rotulo(c, "Visão do Futuro", "#ffe9a8"),
    );
  },
  // O mundo perde a cor por um instante, com um relógio girando.
  "especial:parada-temporal": async ({ c, impacto }) => {
    impacto();
    c.arena.classList.add("tempo-parado");
    await juntos(
      circulo(c, c.heroiCentro, { cor: "#c7a4ff", raio: 70, duracao: 800 }),
      clarao(c, "#ffffff", 200, 0.5),
      rotulo(c, "Parada Temporal", "#c7a4ff"),
    );
    c.arena.classList.remove("tempo-parado");
  },
  // Cristais de gelo cobrem o corpo.
  "especial:corpo-de-gelo": async ({ c, impacto }) => {
    impacto();
    c.heroi.classList.add("congelado");
    await juntos(
      particulas(c, c.heroiCentro, { cor: "#c8f3ff", forma: "floco", quantidade: 14, distancia: 60, convergir: true, duracao: 520 }),
      luz(c, c.heroiCentro, { cor: "#a8ecff", raio: 56, duracao: 600, pico: 0.6 }),
      rotulo(c, "Corpo de Gelo", "#a8ecff"),
    );
  },
};

// ---- Especiais: o golpe inimigo evitado -------------------------------------

function avisoDeEvitado(c: Cena, texto: string) {
  return numero(c, c.heroiCentro, texto, "evitado");
}

export const evasivas: Record<string, (c: Cena) => Promise<void>> = {
  // O golpe passa entre as partes separadas do corpo.
  "especial:esquiva-fragmentada": async (c) => {
    const ida = mover(c, c.inimigo, {
      dx: (c.heroiCentro.x - c.inimigoCentro.x) * 0.5,
      dy: (c.heroiCentro.y - c.inimigoCentro.y) * 0.5,
      duracao: 420,
    });
    await c.d.esperar(150);
    c.heroi.classList.add("fragmentado");
    void avisoDeEvitado(c, "ESQUIVA");
    await juntos(
      ida,
      rastro(
        c,
        { x: c.heroiCentro.x + 40, y: c.heroiCentro.y - 20 },
        { x: c.heroiCentro.x - 40, y: c.heroiCentro.y + 20 },
        { cor: "#ffb0a0", espessura: 2, duracao: 220 },
      ),
    );
    await c.d.esperar(200);
    c.heroi.classList.remove("fragmentado");
  },
  // O herói se move antes do golpe; o ataque acerta a pós-imagem.
  "especial:visao-do-futuro": async (c) => {
    void mover(c, c.heroi, { dx: -30, dy: 6, duracao: 520, pausa: 0.4 });
    const fantasma = fantasmaDoHeroi(c, { dx: 0, cor: "#ffe9a8", duracao: 600 });
    const ida = mover(c, c.inimigo, {
      dx: (c.heroiCentro.x - c.inimigoCentro.x) * 0.5,
      dy: (c.heroiCentro.y - c.inimigoCentro.y) * 0.5,
      duracao: 420,
    });
    await c.d.esperar(200);
    void avisoDeEvitado(c, "PREVISTO");
    await juntos(ida, fantasma);
  },
  // O inimigo congela no meio do ataque enquanto o tempo está parado.
  "especial:parada-temporal": async (c) => {
    c.arena.classList.add("tempo-parado");
    await mover(c, c.inimigo, {
      dx: (c.heroiCentro.x - c.inimigoCentro.x) * 0.25,
      dy: (c.heroiCentro.y - c.inimigoCentro.y) * 0.25,
      duracao: 700,
      pausa: 0.6,
    });
    void avisoDeEvitado(c, "TEMPO PARADO");
    await c.d.esperar(260);
    c.arena.classList.remove("tempo-parado");
  },
  // O golpe acerta o gelo e se estilhaça; o herói fica intacto.
  "especial:corpo-de-gelo": async (c) => {
    c.heroi.classList.add("congelado");
    const ida = mover(c, c.inimigo, {
      dx: (c.heroiCentro.x - c.inimigoCentro.x) * 0.5,
      dy: (c.heroiCentro.y - c.inimigoCentro.y) * 0.5,
      duracao: 420,
    });
    await c.d.esperar(200);
    void avisoDeEvitado(c, "IMUNE");
    await juntos(ida, particulas(c, c.heroiCentro, { cor: "#e8fbff", forma: "estilhaco", quantidade: 14, distancia: 60, duracao: 600 }));
    c.heroi.classList.remove("congelado");
  },
};

/** Golpe final: o inimigo racha e se desfaz antes da tela de vitória. */
export async function golpeFinal(c: Cena): Promise<void> {
  const centro = c.inimigoCentro;
  c.inimigo.classList.add("derrotado");
  await juntos(
    c.d.animar(
      c.inimigo,
      [
        { transform: "scale(1)", opacity: 1, filter: "brightness(1)" },
        { transform: "scale(1.15)", opacity: 1, filter: "brightness(3)", offset: 0.35 },
        { transform: "scale(.4) rotate(12deg)", opacity: 0, filter: "brightness(4)" },
      ],
      { duration: 700, fill: "forwards" },
    ),
    particulas(c, centro, { cor: "#fff1d6", forma: "estilhaco", quantidade: 22, distancia: 110, duracao: 900, gravidade: 40, atraso: 220 }),
    luz(c, centro, { cor: "#ffe7a6", raio: 110, duracao: 800, atraso: 200 }),
    ceu(c, "#000", 800, 0.4),
  );
  await rotulo(c, "Vitória", "#ffe7a6", 700);
}

/** Derrota: o herói cai. */
export async function quedaDoHeroi(c: Cena): Promise<void> {
  await juntos(
    c.d.animar(
      c.heroi,
      [
        { transform: "rotate(0)", opacity: 1 },
        { transform: "translate(-6px,18px) rotate(-70deg)", opacity: 0.4 },
      ],
      { duration: 700, fill: "forwards", easing: "ease-in" },
    ),
    clarao(c, "#3a0010", 700, 0.5),
  );
}
