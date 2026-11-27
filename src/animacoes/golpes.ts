// Animação de cada ação do jogador, indexada pelo id do golpe, habilidade ou consumível.
// Os construtores (corte, tiro) dão a estrutura; cada entrada configura tempo,
// trajetória, cor, peso e impacto do golpe individualmente.
import type { Cena, Ponto } from "./cena.ts";
import type { AnimacaoDeGolpe, ContextoDeGolpe } from "./contexto.ts";
import { juntos } from "./diretor.ts";
import {
  anel,
  arco,
  ceu,
  circulo,
  clarao,
  esticar,
  fantasmaDoHeroi,
  feixe,
  luz,
  marcas,
  mover,
  onda,
  particulas,
  projetil,
  raio,
  rastro,
  tremor,
  type FormaDeParticula,
  type OpcoesDeArco,
  type OpcoesDeParticulas,
  type OpcoesDeProjetil,
} from "./efeitos.ts";

const AÇO = "#d9efff";
const OURO = "#ffd27a";
const FOGO = "#ff8a3d";
const GELO = "#a8ecff";
const RAIO = "#ffe86b";
const SOMBRA = "#b07cff";
const SANGUE = "#ff4d5e";
const VERDE = "#9ef0b0";

/** Avanço do herói em direção ao inimigo (fração da distância). */
function investida(c: Cena, fracao: number, duracao: number, pausa = 0.3) {
  const d = c.direcao;
  return mover(c, c.heroi, { dx: d.x * fracao, dy: d.y * fracao, duracao, pausa });
}

function recuo(c: Cena, px: number, duracao = 220) {
  return mover(c, c.heroi, { dx: -px, dy: px / 4, giro: -4, duracao, pausa: 0.1 });
}

function preparo(c: Cena, duracao: number, cor?: string, giro = -6) {
  const tarefas = [mover(c, c.heroi, { dx: -7, dy: 2, giro, duracao, pausa: 0.55 })];
  if (cor) tarefas.push(luz(c, c.mao, { cor, raio: 22, duracao }));
  return juntos(...tarefas);
}

// ---- Cortes ----------------------------------------------------------------

interface ConfigDeCorte {
  cor: string;
  preparo: number;
  luzDePreparo?: string;
  avanco: number;
  duracaoDoAvanco?: number;
  arcos: (Omit<OpcoesDeArco, "cor"> & { cor?: string })[];
  forca: number;
  tremor?: number;
  particulas?: OpcoesDeParticulas;
  /** Atravessa o inimigo e o corte aparece depois (iaijutsu). */
  atravessar?: boolean;
}

function corte(k: ConfigDeCorte): AnimacaoDeGolpe {
  return async ({ c, impacto, final }) => {
    if (k.preparo) await preparo(c, k.preparo, k.luzDePreparo);
    const alvo = c.inimigoCentro;
    const avanco = k.atravessar
      ? mover(c, c.heroi, { dx: c.direcao.x * 1.15, dy: c.direcao.y * 1.15, duracao: k.duracaoDoAvanco ?? 380, pausa: 0.45 })
      : investida(c, k.avanco, k.duracaoDoAvanco ?? 300);
    if (k.atravessar) {
      void rastro(c, c.mao, c.entre(1.2), { cor: k.cor, espessura: 2, duracao: 260 });
      await c.d.esperar(260);
    } else {
      await c.d.esperar(100);
    }
    const arcos = k.arcos.map((a) => arco(c, alvo, { ...a, cor: a.cor ?? k.cor }));
    const momento = Math.max(...k.arcos.map((a) => (a.atraso ?? 0) + (a.duracao ?? 260) * 0.45));
    await c.d.esperar(momento);
    impacto(k.forca * (final ? 1.4 : 1));
    const extras: Promise<void>[] = [];
    if (k.tremor) extras.push(tremor(c, k.tremor * (final ? 1.5 : 1), 260 + k.tremor * 20));
    if (k.particulas) extras.push(particulas(c, alvo, k.particulas));
    await juntos(avanco, ...arcos, ...extras);
  };
}

// ---- Disparos e arremessos -------------------------------------------------

interface ConfigDeTiro {
  preparo: number;
  luzDePreparo?: string;
  projetil: OpcoesDeProjetil;
  /** Clarão no cano no momento do disparo. */
  clarao?: string;
  recuo?: number;
  fumaca?: boolean;
  impactoCor: string;
  faiscas?: FormaDeParticula;
  forca: number;
  /** Rastros finos seguindo o projétil (o dano continua sendo um só). */
  fantasmas?: number;
}

function tiro(k: ConfigDeTiro): AnimacaoDeGolpe {
  return async ({ c, impacto, final }) => {
    if (k.preparo) await preparo(c, k.preparo, k.luzDePreparo, -3);
    const de = c.mao;
    const alvo = c.inimigoCentro;
    const disparo: Promise<void>[] = [];
    if (k.clarao) disparo.push(luz(c, de, { cor: k.clarao, raio: 26, duracao: 180 }));
    if (k.recuo) disparo.push(recuo(c, k.recuo));
    if (k.fumaca)
      disparo.push(
        particulas(c, de, {
          cor: "#c9c2cf",
          forma: "fumaca",
          quantidade: 6,
          distancia: 26,
          duracao: 900,
          direcao: -40,
          abertura: 80,
          tamanho: 12,
        }),
      );
    await projetil(c, de, alvo, { ...k.projetil, fantasmas: k.fantasmas ?? k.projetil.fantasmas ?? 0 });
    impacto(k.forca * (final ? 1.4 : 1));
    await juntos(
      ...disparo,
      luz(c, alvo, { cor: k.impactoCor, raio: 34, duracao: 300 }),
      particulas(c, alvo, { cor: k.impactoCor, forma: k.faiscas ?? "faisca", quantidade: 9, distancia: 46, direcao: 0, abertura: 200 }),
    );
  };
}

// ---- Ações básicas ---------------------------------------------------------

const soco: AnimacaoDeGolpe = async ({ c, impacto }) => {
  const ida = investida(c, 0.28, 260, 0.15);
  await c.d.esperar(120);
  void rastro(c, c.mao, c.entre(0.85), { cor: "#fff0cc", espessura: 2, duracao: 160 });
  await c.d.esperar(40);
  impacto(0.7);
  await juntos(ida, anel(c, c.inimigoCentro, { cor: "#fff0cc", raio: 22, espessura: 3, duracao: 260 }));
};

const defender: AnimacaoDeGolpe = async ({ c, impacto }) => {
  const centro = c.heroiCentro;
  impacto();
  await juntos(
    mover(c, c.heroi, { dx: -4, dy: 3, escala: 0.97, duracao: 420, pausa: 0.5 }),
    arco(c, { x: centro.x + 10, y: centro.y }, { raio: 42, de: -70, ate: 70, cor: "#8bdfff", espessura: 5, duracao: 520 }),
    luz(c, centro, { cor: "#8bdfff", raio: 48, duracao: 520, pico: 0.5 }),
  );
};

// ---- Armas -----------------------------------------------------------------

export const golpesDeArma: Record<string, AnimacaoDeGolpe> = {
  // Sabre comum: um arco médio descendente.
  "golpe:marine": corte({
    cor: AÇO,
    preparo: 120,
    avanco: 0.45,
    arcos: [{ raio: 46, de: -130, ate: 20, espessura: 5, duracao: 280 }],
    forca: 1,
  }),

  // Adaga: dois talhos curtos e rápidos, bem de perto.
  "golpe:dagger": corte({
    cor: AÇO,
    preparo: 0,
    avanco: 0.55,
    duracaoDoAvanco: 260,
    arcos: [
      { raio: 26, de: -150, ate: -20, espessura: 3, duracao: 150 },
      { raio: 24, de: 160, ate: 30, espessura: 3, duracao: 150, atraso: 110 },
    ],
    forca: 0.7,
  }),

  // Wado Ichimonji: postura parada, passada limpa através do alvo e um traço fino
  // e preciso que só aparece depois, seguido do impacto.
  "golpe:wado": async ({ c, impacto, final }) => {
    await mover(c, c.heroi, { dx: -4, dy: 3, giro: -2, duracao: 240, pausa: 0.7 });
    const d = c.direcao;
    const passada = mover(c, c.heroi, { dx: d.x * 1.15, dy: d.y * 1.15, duracao: 520, pausa: 0.45, easing: "cubic-bezier(.85,0,.15,1)" });
    void rastro(c, c.mao, c.entre(1.2), { cor: "#ffffff", espessura: 1.5, duracao: 220 });
    await c.d.esperar(330);
    const alvo = c.inimigoCentro;
    await rastro(
      c,
      { x: alvo.x - 52, y: alvo.y + 30 },
      { x: alvo.x + 52, y: alvo.y - 30 },
      { cor: "#f2fbff", espessura: 2.5, duracao: 240, permanencia: 0.8 },
    );
    impacto(final ? 1.4 : 1);
    await juntos(
      passada,
      particulas(c, alvo, { cor: "#ffffff", forma: "faisca", quantidade: 6, distancia: 44, direcao: -30, abertura: 40, tamanho: 12 }),
    );
  },

  // Nichirin: arco amplo e ondulado, com gotas.
  "golpe:nichirin": corte({
    cor: "#7ccfff",
    preparo: 140,
    avanco: 0.5,
    arcos: [
      { raio: 50, de: -170, ate: 0, espessura: 7, duracao: 360, brilho: 12 },
      { raio: 34, de: -150, ate: 10, espessura: 3, duracao: 360, atraso: 60, cor: "#e3f6ff" },
    ],
    forca: 1,
    particulas: { cor: "#9adbff", forma: "bolha", quantidade: 10, distancia: 54, gravidade: 30, duracao: 700 },
  }),

  // Kubikiribōchō: preparação longa, arco enorme e pesado.
  "golpe:zabuza": corte({
    cor: "#cfd8e3",
    preparo: 420,
    luzDePreparo: "#cfd8e3",
    avanco: 0.52,
    duracaoDoAvanco: 420,
    arcos: [{ raio: 82, de: -110, ate: 110, espessura: 13, duracao: 420, brilho: 10 }],
    forca: 1.8,
    tremor: 9,
    particulas: { cor: "#8b8f99", forma: "estilhaco", quantidade: 10, distancia: 70, gravidade: 40, duracao: 700 },
  }),

  // Dragon Slayer: o golpe mais pesado — ergue, pausa, arco largo e impacto que sacode tudo.
  "golpe:dragon": corte({
    cor: "#e8d7c7",
    preparo: 560,
    luzDePreparo: "#ff9b6b",
    avanco: 0.5,
    duracaoDoAvanco: 520,
    arcos: [
      { raio: 96, de: -100, ate: 120, espessura: 18, duracao: 480, brilho: 14 },
      { raio: 80, de: -95, ate: 110, espessura: 4, duracao: 480, atraso: 40, cor: "#fff" },
    ],
    forca: 2.2,
    tremor: 13,
    particulas: { cor: "#a88f7a", forma: "estilhaco", quantidade: 16, distancia: 90, gravidade: 60, duracao: 800, tamanho: 9 },
  }),

  // Zangetsu: corte diagonal largo, preto com borda vermelha.
  "golpe:zange": corte({
    cor: "#1b0f1a",
    preparo: 180,
    avanco: 0.48,
    arcos: [
      { raio: 62, de: -140, ate: 40, espessura: 12, duracao: 340, brilho: 3 },
      { raio: 62, de: -140, ate: 40, espessura: 3, duracao: 340, cor: SANGUE, brilho: 10 },
    ],
    forca: 1.3,
    tremor: 5,
  }),

  // Excalibur da Saber: arco dourado com luz no fio.
  "golpe:saber": corte({
    cor: OURO,
    preparo: 220,
    luzDePreparo: OURO,
    avanco: 0.48,
    arcos: [{ raio: 66, de: -150, ate: 30, espessura: 9, duracao: 360, brilho: 18 }],
    forca: 1.5,
    tremor: 4,
    particulas: { cor: "#fff2c2", forma: "ponto", quantidade: 12, distancia: 60, duracao: 800, tamanho: 4 },
  }),

  // Sode no Shirayuki: corte branco que deixa flocos de gelo.
  "golpe:rukia": corte({
    cor: "#f4fbff",
    preparo: 150,
    avanco: 0.46,
    arcos: [{ raio: 52, de: -60, ate: -200, espessura: 6, duracao: 320, brilho: 14 }],
    forca: 1.1,
    particulas: { cor: GELO, forma: "floco", quantidade: 12, distancia: 60, duracao: 900, gravidade: 20 },
  }),

  // Elucidator: corte em X, lâmina negra.
  "golpe:elucidator": corte({
    cor: "#3a2a55",
    preparo: 100,
    avanco: 0.5,
    arcos: [
      { raio: 48, de: -135, ate: 45, espessura: 7, duracao: 230, cor: "#8a6cff", brilho: 10 },
      { raio: 48, de: -45, ate: 135, espessura: 7, duracao: 230, atraso: 150, cor: "#8a6cff", brilho: 10 },
    ],
    forca: 1.1,
  }),

  // Lostvayne: clones atacam juntos, três arcos defasados.
  "golpe:lostvayne": async (ctx) => {
    const { c } = ctx;
    void fantasmaDoHeroi(c, { dx: c.direcao.x * 0.4, dy: c.direcao.y * 0.4 - 40, cor: "#9ef3ff", duracao: 520 });
    void fantasmaDoHeroi(c, { dx: c.direcao.x * 0.4, dy: c.direcao.y * 0.4 + 30, cor: "#9ef3ff", duracao: 520, atraso: 60 });
    await corte({
      cor: "#bff6ff",
      preparo: 120,
      avanco: 0.45,
      arcos: [
        { raio: 40, de: -150, ate: 0, espessura: 5, duracao: 240 },
        { raio: 56, de: -120, ate: 40, espessura: 4, duracao: 240, atraso: 90 },
        { raio: 30, de: 180, ate: 30, espessura: 4, duracao: 240, atraso: 180 },
      ],
      forca: 1.3,
    })(ctx);
  },

  // Gáe Bolg: estocada reta e perfurante.
  "golpe:gaebolg": async ({ c, impacto, final }) => {
    await preparo(c, 200, SANGUE);
    const ida = investida(c, 0.55, 320, 0.2);
    await c.d.esperar(120);
    await rastro(c, c.mao, c.entre(1.25), { cor: SANGUE, espessura: 6, duracao: 200, permanencia: 0.7 });
    impacto(final ? 1.8 : 1.3);
    await juntos(
      ida,
      anel(c, c.inimigoCentro, { cor: SANGUE, raio: 30, espessura: 3, achatado: 0.4 }),
      particulas(c, c.inimigoCentro, { cor: SANGUE, quantidade: 8, distancia: 50, direcao: -15, abertura: 50 }),
    );
  },

  // Umbreaker: guarda-chuva em swing de baixo para cima, impacto com quique.
  "golpe:umbrella": async ({ c, impacto, final }) => {
    await preparo(c, 160);
    const ida = investida(c, 0.5, 340);
    await c.d.esperar(130);
    void arco(c, c.inimigoCentro, { raio: 44, de: 140, ate: -40, cor: "#ffb36b", espessura: 10, duracao: 260 });
    await c.d.esperar(130);
    impacto(final ? 1.6 : 1.2);
    await juntos(ida, mover(c, c.inimigo, { dy: -16, duracao: 360, pausa: 0 }), anel(c, c.inimigoCentro, { cor: "#ffb36b", raio: 40 }));
  },

  // Nuvem Brincalhona: três batidas encadeadas das seções do bastão.
  "golpe:playful": async ({ c, impacto, final }) => {
    const ida = investida(c, 0.45, 560, 0.5);
    for (let i = 0; i < 3; i++) {
      await c.d.esperar(i === 0 ? 140 : 110);
      const p = { x: c.inimigoCentro.x + (i - 1) * 14, y: c.inimigoCentro.y + (i % 2 ? -12 : 10) };
      void rastro(c, c.entre(0.5), p, { cor: "#d7c2ff", espessura: 5, duracao: 160 });
      void anel(c, p, { cor: "#d7c2ff", raio: 18, espessura: 3, duracao: 240 });
    }
    impacto(final ? 1.5 : 1);
    await ida;
  },

  // Escudo de Leônidas: avanço com o escudo e onda de choque frontal.
  "golpe:shield": async ({ c, impacto, final }) => {
    await preparo(c, 180);
    const ida = investida(c, 0.6, 300, 0.2);
    await c.d.esperar(150);
    impacto(final ? 1.7 : 1.3);
    await juntos(ida, anel(c, c.inimigoCentro, { cor: "#ffd59a", raio: 56, espessura: 7, achatado: 1.2 }), tremor(c, 6));
  },

  // Cajado de Frieren: pequena esfera mágica em linha reta.
  "golpe:frieren": tiro({
    preparo: 200,
    luzDePreparo: "#c6f0ff",
    projetil: { forma: "esfera", cor: "#c6f0ff", tamanho: 14, duracao: 380, easing: "ease-in" },
    impactoCor: "#c6f0ff",
    faiscas: "ponto",
    forca: 0.9,
  }),

  // Disco de Duelo: carta holográfica girando até o alvo.
  "golpe:disk": tiro({
    preparo: 140,
    projetil: { forma: "carta", cor: "#7af7ff", tamanho: 22, duracao: 420, giro: 2.5, altura: 30 },
    impactoCor: "#7af7ff",
    faiscas: "estilhaco",
    forca: 1,
  }),

  // Luvas de Roy Mustang: estalo nos dedos e explosão direto no alvo (sem viagem).
  "golpe:gloves": async ({ c, impacto, final }) => {
    await luz(c, c.mao, { cor: "#fff6c8", raio: 12, duracao: 120 });
    void rastro(c, c.mao, c.inimigoCentro, { cor: "#ffe2a8", espessura: 1, duracao: 180 });
    await c.d.esperar(150);
    impacto(final ? 1.5 : 1.1);
    await juntos(
      luz(c, c.inimigoCentro, { cor: FOGO, raio: 50, duracao: 420 }),
      particulas(c, c.inimigoCentro, { cor: FOGO, forma: "brasa", quantidade: 14, distancia: 56, gravidade: -30, duracao: 700 }),
    );
  },

  // Pistola de pederneira: mira, clarão, recuo, fumaça e bala rápida.
  "golpe:pistol": tiro({
    preparo: 260,
    projetil: { forma: "bala", cor: "#ffd28a", tamanho: 7, duracao: 150, orientar: true },
    clarao: "#ffcf6b",
    recuo: 14,
    fumaca: true,
    impactoCor: "#ffc381",
    forca: 1.1,
  }),

  // Kunai: arremesso em parábola, girando no voo.
  "golpe:kunai": tiro({
    preparo: 120,
    projetil: { forma: "kunai", cor: AÇO, tamanho: 22, duracao: 400, giro: 3, altura: 34 },
    impactoCor: AÇO,
    forca: 0.9,
  }),

  // Senbon: uma agulha fina e rápida com uma sequência de rastros (um acerto, como na regra).
  "golpe:senbon": tiro({
    preparo: 90,
    projetil: { forma: "agulha", cor: "#e9f4ff", tamanho: 20, duracao: 260, orientar: true },
    fantasmas: 3,
    impactoCor: "#e9f4ff",
    faiscas: "ponto",
    forca: 0.8,
  }),
};

// ---- Habilidades -----------------------------------------------------------

async function chamaConcentrada(c: Cena, p: Ponto, duracao: number) {
  await juntos(
    particulas(c, p, { cor: FOGO, forma: "brasa", quantidade: 18, distancia: 64, duracao, convergir: true, tamanho: 11 }),
    luz(c, p, { cor: FOGO, raio: 36, duracao }),
  );
}

export const habilidades: Record<string, AnimacaoDeGolpe> = {
  // Mão Separada: a mão se solta, gira em arco e volta.
  "habilidade:mao-separada": async ({ c, impacto, final }) => {
    await preparo(c, 160);
    await projetil(c, c.mao, c.inimigoCentro, { forma: "mao", cor: "#ffd5b0", tamanho: 20, duracao: 420, giro: 2, altura: 60 });
    impacto(final ? 1.4 : 1);
    await juntos(
      particulas(c, c.inimigoCentro, { cor: "#ffd5b0", forma: "estilhaco", quantidade: 6, distancia: 30 }),
      projetil(c, c.inimigoCentro, c.mao, { forma: "mao", cor: "#ffd5b0", tamanho: 20, duracao: 360, giro: -1.5, altura: -40 }),
    );
  },

  // Shishi Sonson: passa pelo inimigo num piscar; o corte surge depois, com atraso.
  "habilidade:shishi-sonson": async ({ c, impacto, final }) => {
    await preparo(c, 300, "#f2fbff");
    const passagem = mover(c, c.heroi, {
      dx: c.direcao.x * 1.3,
      dy: c.direcao.y * 1.3,
      duracao: 600,
      pausa: 0.5,
      easing: "cubic-bezier(.9,0,.1,1)",
    });
    void rastro(c, c.mao, c.entre(1.35), { cor: "#ffffff", espessura: 2, duracao: 200 });
    await c.d.esperar(420);
    await juntos(
      rastro(c, c.entre(0.75), c.entre(1.2), { cor: "#ffffff", espessura: 3, duracao: 260, permanencia: 0.8 }),
      clarao(c, "#ffffff", 160, 0.4),
    );
    impacto(final ? 1.8 : 1.4);
    await juntos(passagem, particulas(c, c.inimigoCentro, { cor: "#ffffff", quantidade: 10, distancia: 60, direcao: 0, abertura: 60 }));
  },

  // Ignição: estalo maior e uma linha de explosões até o alvo.
  "habilidade:ignicao": async ({ c, impacto, final }) => {
    await luz(c, c.mao, { cor: "#fff6c8", raio: 14, duracao: 160 });
    for (let i = 1; i <= 4; i++) {
      void luz(c, c.entre(i / 4), { cor: FOGO, raio: 18 + i * 8, duracao: 360 });
      await c.d.esperar(70);
    }
    impacto(final ? 1.7 : 1.3);
    await juntos(
      luz(c, c.inimigoCentro, { cor: "#ffcf6b", raio: 70, duracao: 520 }),
      particulas(c, c.inimigoCentro, { cor: FOGO, forma: "brasa", quantidade: 18, distancia: 80, gravidade: -40, duracao: 800 }),
      tremor(c, 6),
    );
  },

  // Getsuga Tenshō: a energia da lâmina sai como uma onda que atravessa a arena.
  "habilidade:getsuga-tensho": async ({ c, impacto, final }) => {
    await juntos(
      preparo(c, 360, SANGUE),
      particulas(c, c.mao, { cor: "#1b0f1a", forma: "fumaca", quantidade: 8, distancia: 40, convergir: true, duracao: 360 }),
    );
    void arco(c, c.mao, { raio: 30, de: -120, ate: 60, cor: SANGUE, espessura: 8, duracao: 260 });
    const ondaEnergia = onda(c, c.mao, c.entre(1.15), { cor: SANGUE, largura: 42, altura: 130, duracao: 560 });
    await c.d.esperar(430);
    impacto(final ? 1.9 : 1.5);
    await juntos(ondaEnergia, tremor(c, 8), luz(c, c.inimigoCentro, { cor: "#2a0d14", raio: 60, duracao: 420 }));
  },

  // Excalibur: carga longa de luz e um feixe dourado enorme.
  "habilidade:excalibur": async ({ c, impacto, final }) => {
    await juntos(
      preparo(c, 620, OURO, -10),
      particulas(c, c.mao, { cor: OURO, forma: "ponto", quantidade: 18, distancia: 80, convergir: true, duracao: 620 }),
      ceu(c, "#1a1430", 1500, 0.5),
    );
    const f = feixe(c, c.mao, c.entre(1.1), { cor: OURO, espessura: 34, duracao: 820 });
    await c.d.esperar(200);
    impacto(final ? 2.2 : 1.8);
    await juntos(f, clarao(c, "#fff3c4", 340, 0.6), tremor(c, 12, 520));
  },

  // Ora Ora!: rajada de socos rápidos (vários impactos visuais, um só dano).
  "habilidade:ora-ora": async ({ c, impacto, final }) => {
    const ida = investida(c, 0.4, 900, 0.7);
    const alvo = c.inimigoCentro;
    for (let i = 0; i < 12; i++) {
      const p = { x: alvo.x + (Math.random() - 0.5) * 40, y: alvo.y + (Math.random() - 0.5) * 36 };
      void luz(c, p, { cor: "#c7a4ff", raio: 14, duracao: 160 });
      void rastro(c, c.entre(0.6), p, { cor: "#e7d6ff", espessura: 4, duracao: 120 });
      await c.d.esperar(55);
    }
    impacto(final ? 2 : 1.6);
    await juntos(ida, anel(c, alvo, { cor: "#c7a4ff", raio: 50, espessura: 5 }), tremor(c, 7));
  },

  // Rajada de Ki: esfera carregada nas mãos e disparada como feixe curto.
  "habilidade:rajada-de-ki": async ({ c, impacto, final }) => {
    await juntos(
      preparo(c, 420, "#8fd9ff"),
      particulas(c, c.mao, { cor: "#8fd9ff", forma: "ponto", quantidade: 10, distancia: 40, convergir: true, duracao: 420 }),
    );
    await projetil(c, c.mao, c.inimigoCentro, { forma: "esfera grande", cor: "#8fd9ff", tamanho: 30, duracao: 340, easing: "ease-in" });
    impacto(final ? 1.7 : 1.3);
    await juntos(
      luz(c, c.inimigoCentro, { cor: "#c8efff", raio: 64, duracao: 460 }),
      anel(c, c.inimigoCentro, { cor: "#8fd9ff", raio: 60 }),
    );
  },

  // Erga-se: a sombra do último inimigo derrotado sobe do chão e ataca.
  "habilidade:erga-se": async ({ c, impacto, final }) => {
    const chao = { x: c.inimigoCentro.x - 30, y: c.altura - 26 };
    await juntos(
      circulo(c, chao, { cor: SOMBRA, raio: 40, duracao: 700, achatado: 0.3 }),
      particulas(c, chao, { cor: "#2b1440", forma: "fumaca", quantidade: 10, distancia: 50, direcao: -90, abertura: 60, duracao: 700 }),
    );
    const sombra = c.criar("fx-sombra", `left:${chao.x}px;top:${chao.y}px`);
    await c.d.animar(
      sombra,
      [
        { transform: "translate(-50%,-100%) scaleY(0)", opacity: 0 },
        { transform: "translate(-50%,-100%) scaleY(1)", opacity: 0.9 },
      ],
      { duration: 360, fill: "both" },
    );
    await c.d.animar(
      sombra,
      [{ transform: "translate(-50%,-100%) translateX(0)" }, { transform: "translate(-50%,-100%) translateX(24px) rotate(10deg)" }],
      { duration: 160, fill: "both" },
    );
    impacto(final ? 1.8 : 1.4);
    await juntos(
      marcas(c, c.inimigoCentro, { quantidade: 3, cor: SOMBRA, angulo: 60, comprimento: 70 }),
      c.d.animar(sombra, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 420, fill: "both" }),
    );
    sombra.remove();
  },

  // Gomu Gomu no Pistol: o braço estica até o alvo, acerta e volta.
  "habilidade:gomu-gomu-no-pistol": async ({ c, impacto, final }) => {
    await mover(c, c.heroi, { dx: -12, giro: -8, duracao: 240, pausa: 0.4 });
    const alvo = c.inimigoCentro;
    await esticar(c, c.mao, alvo, {
      cor: "#ffb08a",
      espessura: 9,
      duracao: 700,
      aoChegar: () => {
        impacto(final ? 1.6 : 1.2);
        void anel(c, alvo, { cor: "#ff9fb1", raio: 36, espessura: 4 });
      },
    });
  },

  // Rajada da Kurama: bola de chakra laranja que cresce e explode.
  "habilidade:rajada-da-kurama": async ({ c, impacto, final }) => {
    await juntos(
      preparo(c, 340, "#ff9a3c"),
      particulas(c, c.mao, { cor: "#ff9a3c", forma: "bolha", quantidade: 12, distancia: 44, convergir: true, duracao: 340 }),
    );
    await projetil(c, c.mao, c.inimigoCentro, { forma: "esfera grande", cor: "#ff9a3c", tamanho: 34, duracao: 420, altura: 16 });
    impacto(final ? 1.7 : 1.3);
    await juntos(
      luz(c, c.inimigoCentro, { cor: "#ffb15c", raio: 70, duracao: 480 }),
      particulas(c, c.inimigoCentro, { cor: "#ff9a3c", forma: "bolha", quantidade: 12, distancia: 70 }),
    );
  },

  // Corte de Antimagia: lâmina negra que rasga e apaga a luz ao redor.
  "habilidade:corte-de-antimagia": async ({ c, impacto, final }) => {
    await juntos(preparo(c, 260), ceu(c, "#000000", 900, 0.35));
    const ida = investida(c, 0.5, 360);
    await c.d.esperar(130);
    void arco(c, c.inimigoCentro, { raio: 64, de: -150, ate: 30, cor: "#0b0710", espessura: 16, duracao: 330, brilho: 2 });
    void arco(c, c.inimigoCentro, { raio: 64, de: -150, ate: 30, cor: "#c7c0d6", espessura: 2, duracao: 330 });
    await c.d.esperar(160);
    impacto(final ? 1.8 : 1.4);
    await juntos(ida, particulas(c, c.inimigoCentro, { cor: "#0b0710", forma: "fumaca", quantidade: 10, distancia: 60, duracao: 700 }));
  },

  // Hiken: chamas se concentram no punho e saem como um punho de fogo que explode no alvo.
  "habilidade:hiken": async ({ c, impacto, final }) => {
    await juntos(preparo(c, 420, undefined, -8), chamaConcentrada(c, c.mao, 420));
    await projetil(c, c.mao, c.inimigoCentro, { forma: "punho-fogo", cor: FOGO, tamanho: 44, duracao: 380, orientar: true, fantasmas: 2 });
    impacto(final ? 1.9 : 1.5);
    await juntos(
      luz(c, c.inimigoCentro, { cor: "#ffd27a", raio: 90, duracao: 600 }),
      anel(c, c.inimigoCentro, { cor: FOGO, raio: 80, espessura: 6 }),
      particulas(c, c.inimigoCentro, { cor: FOGO, forma: "brasa", quantidade: 22, distancia: 90, gravidade: -40, duracao: 900 }),
      tremor(c, 9),
    );
  },

  // Ice Saber: espada de gelo varre de baixo para cima e congela o ponto atingido.
  "habilidade:ice-saber": async ({ c, impacto, final }) => {
    await juntos(
      preparo(c, 240, GELO),
      particulas(c, c.mao, { cor: GELO, forma: "floco", quantidade: 8, distancia: 30, convergir: true, duracao: 240 }),
    );
    const ida = investida(c, 0.5, 340);
    await c.d.esperar(120);
    void arco(c, c.inimigoCentro, { raio: 56, de: 150, ate: -60, cor: GELO, espessura: 10, duracao: 300, brilho: 16 });
    await c.d.esperar(140);
    impacto(final ? 1.7 : 1.3);
    await juntos(
      ida,
      particulas(c, c.inimigoCentro, { cor: "#e8fbff", forma: "estilhaco", quantidade: 12, distancia: 56, duracao: 700 }),
      luz(c, c.inimigoCentro, { cor: GELO, raio: 48 }),
    );
  },

  // El Thor: o céu escurece e se ilumina antes de o raio cair sobre o alvo.
  "habilidade:el-thor": async ({ c, impacto, final }) => {
    void ceu(c, "#0a0d24", 1600, 0.8);
    await mover(c, c.heroi, { dy: -6, giro: -3, duracao: 300, pausa: 0.6 });
    const topo = { x: c.inimigoCentro.x - 10, y: -20 };
    for (let i = 0; i < 3; i++) {
      void clarao(c, "#d9e6ff", 120, 0.25);
      await c.d.esperar(150);
    }
    await luz(c, { x: topo.x, y: 20 }, { cor: RAIO, raio: 50, duracao: 260 });
    await juntos(
      raio(c, topo, c.inimigoCentro, { cor: RAIO, espessura: 8, segmentos: 10, duracao: 420, desvio: 26 }),
      clarao(c, "#fff7c7", 220, 0.7),
    );
    impacto(final ? 2 : 1.6);
    await juntos(
      raio(c, topo, c.inimigoCentro, { cor: "#bfe7ff", espessura: 3, duracao: 300, desvio: 30 }),
      anel(c, c.inimigoCentro, { cor: RAIO, raio: 70, achatado: 0.4 }),
      particulas(c, c.inimigoCentro, { cor: RAIO, quantidade: 14, distancia: 60 }),
      tremor(c, 10, 420),
    );
  },

  // Investida do Leopardo: deslocamento em alta velocidade e rastros de garras.
  "habilidade:investida-do-leopardo": async ({ c, impacto, final }) => {
    await mover(c, c.heroi, { dx: -10, dy: 6, escala: 0.94, duracao: 160, pausa: 0.6 });
    void fantasmaDoHeroi(c, { dx: c.direcao.x * 0.5, dy: c.direcao.y * 0.5, cor: "#ffc86a", duracao: 260 });
    const ida = investida(c, 0.72, 300, 0.25);
    await c.d.esperar(130);
    impacto(final ? 1.6 : 1.2);
    await juntos(
      ida,
      marcas(c, c.inimigoCentro, { quantidade: 3, cor: "#ffc86a", angulo: 55, comprimento: 64, espacamento: 14, espessura: 4 }),
    );
  },

  // Tsugi no Mai: círculo de gelo no chão do alvo e uma coluna que sobe.
  "habilidade:tsugi-no-mai": async ({ c, impacto, final }) => {
    await preparo(c, 260, GELO);
    const chao = { x: c.inimigoCentro.x, y: c.inimigoCentro.y + 40 };
    await circulo(c, chao, { cor: GELO, raio: 46, duracao: 500, achatado: 0.3 });
    const coluna = c.criar("fx-coluna", `left:${chao.x}px;top:${chao.y}px;--c:${GELO}`);
    await c.d.animar(
      coluna,
      [
        { transform: "translate(-50%,-100%) scaleY(0)", opacity: 0.4 },
        { transform: "translate(-50%,-100%) scaleY(1)", opacity: 1 },
      ],
      { duration: 240, fill: "both", easing: "cubic-bezier(.2,.9,.3,1)" },
    );
    impacto(final ? 1.8 : 1.4);
    await juntos(
      c.d.animar(coluna, [{ opacity: 1 }, { opacity: 0 }], { duration: 520, delay: 200, fill: "both" }),
      particulas(c, c.inimigoCentro, { cor: "#ffffff", forma: "floco", quantidade: 16, distancia: 70, duracao: 900 }),
    );
    coluna.remove();
  },

  // Arremesso Carmesim: lança vermelha em curva alta que mergulha no alvo.
  "habilidade:arremesso-carmesim": async ({ c, impacto, final }) => {
    await preparo(c, 320, SANGUE, -12);
    await projetil(c, c.mao, c.inimigoCentro, {
      forma: "lanca",
      cor: SANGUE,
      tamanho: 46,
      duracao: 520,
      altura: 110,
      orientar: true,
      fantasmas: 3,
      easing: "cubic-bezier(.3,0,.8,1)",
    });
    impacto(final ? 1.9 : 1.5);
    await juntos(anel(c, c.inimigoCentro, { cor: SANGUE, raio: 60, espessura: 5 }), clarao(c, SANGUE, 200, 0.3), tremor(c, 8));
  },

  // Transmutação Amplificada: círculo alquímico e espinhos de pedra subindo sob o alvo.
  "habilidade:transmutacao-amplificada": async ({ c, impacto, final }) => {
    const chao = { x: c.inimigoCentro.x, y: c.inimigoCentro.y + 44 };
    await juntos(
      circulo(c, c.heroiCentro, { cor: "#ff6a6a", raio: 36, duracao: 520, achatado: 0.35 }),
      circulo(c, chao, { cor: "#ff6a6a", raio: 50, duracao: 620, achatado: 0.35 }),
    );
    void raio(c, c.heroiCentro, chao, { cor: "#ff8f8f", espessura: 2, duracao: 260, desvio: 8 });
    for (let i = 0; i < 4; i++) {
      const p = { x: chao.x + (i - 1.5) * 18, y: chao.y };
      const espinho = c.criar("fx-espinho", `left:${p.x}px;top:${p.y}px`);
      void c.d
        .animar(
          espinho,
          [
            { transform: "translate(-50%,-100%) scaleY(0)" },
            { transform: "translate(-50%,-100%) scaleY(1)", offset: 0.3 },
            { transform: "translate(-50%,-100%) scaleY(1)", opacity: 1, offset: 0.8 },
            { transform: "translate(-50%,-100%) scaleY(0)", opacity: 0 },
          ],
          { duration: 760, delay: i * 50, fill: "both" },
        )
        .then(() => espinho.remove());
    }
    await c.d.esperar(260);
    impacto(final ? 1.9 : 1.5);
    await juntos(
      tremor(c, 8),
      particulas(c, chao, {
        cor: "#9b8a7a",
        forma: "estilhaco",
        quantidade: 10,
        distancia: 50,
        direcao: -90,
        abertura: 120,
        gravidade: 40,
      }),
    );
    await c.d.esperar(300);
  },

  // Zoltraak: círculo mágico à frente da mão e um feixe fino e direto.
  "habilidade:zoltraak": async ({ c, impacto, final }) => {
    await juntos(preparo(c, 200), circulo(c, c.entre(0.08), { cor: "#e9f6ff", raio: 26, duracao: 700 }));
    const f = feixe(c, c.entre(0.08), c.entre(1.05), { cor: "#e9f6ff", espessura: 10, duracao: 520 });
    await c.d.esperar(140);
    impacto(final ? 1.7 : 1.3);
    await juntos(f, luz(c, c.inimigoCentro, { cor: "#e9f6ff", raio: 40 }));
  },

  // Corte de Corrente: motosserra em contato — faíscas contínuas e vários traços curtos.
  "habilidade:corte-de-corrente": async ({ c, impacto, final }) => {
    const ida = investida(c, 0.55, 760, 0.7);
    await c.d.esperar(200);
    for (let i = 0; i < 6; i++) {
      void particulas(c, c.inimigoCentro, { cor: "#ffcf5c", quantidade: 5, distancia: 40, direcao: 200, abertura: 70, duracao: 260 });
      void rastro(
        c,
        { x: c.inimigoCentro.x - 30, y: c.inimigoCentro.y - 20 + i * 7 },
        { x: c.inimigoCentro.x + 30, y: c.inimigoCentro.y + 10 + i * 7 },
        { cor: SANGUE, espessura: 2, duracao: 140 },
      );
      await c.d.esperar(60);
    }
    impacto(final ? 1.6 : 1.2);
    await juntos(ida, tremor(c, 5, 200));
  },

  // Telecinese: distorção roxa ergue o inimigo e o arremessa para baixo.
  "habilidade:telecinese": async ({ c, impacto, final }) => {
    await juntos(
      mover(c, c.heroi, { dy: -4, duracao: 300, pausa: 0.6 }),
      anel(c, c.inimigoCentro, { cor: "#d38bff", raio: 44, espessura: 3, duracao: 500 }),
    );
    await c.d.animar(
      c.inimigo,
      [{ transform: "translate(0,0)" }, { transform: "translate(0,-22px) rotate(-8deg)", filter: "drop-shadow(0 0 12px #d38bff)" }],
      { duration: 320, fill: "forwards" },
    );
    await c.d.animar(
      c.inimigo,
      [{ transform: "translate(0,-22px) rotate(-8deg)" }, { transform: "translate(0,10px) rotate(4deg)" }, { transform: "translate(0,0)" }],
      { duration: 240 },
    );
    impacto(final ? 1.6 : 1.2);
    await juntos(anel(c, { x: c.inimigoCentro.x, y: c.inimigoCentro.y + 30 }, { cor: "#d38bff", raio: 54, achatado: 0.35 }), tremor(c, 6));
  },

  // Investida Rinkaku: tentáculos vermelhos chicoteiam em sequência.
  "habilidade:investida-rinkaku": async ({ c, impacto, final }) => {
    await preparo(c, 180, SANGUE);
    const base = c.heroiCentro;
    for (let i = 0; i < 4; i++) {
      const alvo = { x: c.inimigoCentro.x + (i - 1.5) * 12, y: c.inimigoCentro.y + (i % 2 ? 14 : -14) };
      void esticar(c, { x: base.x - 6, y: base.y + 12 }, alvo, { cor: "#c3263a", espessura: 7, duracao: 420 });
      await c.d.esperar(70);
    }
    await c.d.esperar(80);
    impacto(final ? 1.6 : 1.2);
    await c.d.esperar(260);
  },
};

// ---- Consumíveis -----------------------------------------------------------

function consumivel(cor: string, forma: FormaDeParticula, intensidade: number): AnimacaoDeGolpe {
  return async ({ c, impacto }) => {
    const centro = c.heroiCentro;
    await projetil(c, { x: centro.x + 10, y: centro.y - 60 }, centro, { forma: "capsula", cor, tamanho: 12, duracao: 260, altura: 20 });
    impacto();
    await juntos(
      luz(c, centro, { cor, raio: 40 + intensidade * 20, duracao: 520, pico: 0.7 }),
      particulas(c, centro, {
        cor,
        forma,
        quantidade: 8 + intensidade * 6,
        distancia: 40 + intensidade * 16,
        direcao: -90,
        abertura: 140,
        duracao: 800,
      }),
      intensidade > 1 ? anel(c, centro, { cor, raio: 70 }) : Promise.resolve(),
    );
  };
}

export const consumiveis: Record<string, AnimacaoDeGolpe> = {
  "consumivel:pill": consumivel("#9ef0b0", "ponto", 1),
  "consumivel:ration": consumivel("#ffd59a", "folha", 0.6),
  "consumivel:senzu": consumivel(VERDE, "folha", 2),
};

export const basicos: Record<string, AnimacaoDeGolpe> = {
  "basico:soco": soco,
  "basico:defender": defender,
};

/** Usado só se faltar uma animação (o teste de cobertura impede isso no catálogo). */
export const golpeGenerico: AnimacaoDeGolpe = async ({ c, impacto }: ContextoDeGolpe) => {
  await luz(c, c.inimigoCentro, { cor: "#ffffff", raio: 30, duracao: 260 });
  impacto();
};
