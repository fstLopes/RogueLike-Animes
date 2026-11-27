// Peças reutilizáveis: luz, partículas, rastros, arcos de lâmina, projéteis,
// ondas, raios, tremor e números de dano. Cada golpe combina essas peças com
// tempos, trajetórias e cores próprios (ver golpes.ts).
import type { Cena, Ponto } from "./cena.ts";
import { juntos } from "./diretor.ts";

const px = (n: number) => `${Math.round(n * 10) / 10}px`;
const sorteio = () => Math.random();

export function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angulo(a: Ponto, b: Ponto): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Modo reduzido: só opacidade, sem deslocamento. */
function semMovimento(c: Cena): boolean {
  return c.arena.classList.contains("reduzido");
}

async function efemero(c: Cena, el: Element, quadros: Keyframe[], opcoes: KeyframeAnimationOptions & { duration: number }) {
  await c.d.animar(el, quadros, { fill: "both", ...opcoes });
  el.remove();
}

export interface OpcoesDeLuz {
  cor: string;
  raio?: number;
  duracao?: number;
  atraso?: number;
  pico?: number;
}

/** Brilho radial que cresce e some. */
export function luz(c: Cena, p: Ponto, o: OpcoesDeLuz): Promise<void> {
  const r = o.raio ?? 60;
  const el = c.criar("fx-luz", `left:${px(p.x)};top:${px(p.y)};width:${px(r * 2)};height:${px(r * 2)};--c:${o.cor}`);
  return efemero(
    c,
    el,
    [
      { opacity: 0, transform: "translate(-50%,-50%) scale(.2)" },
      { opacity: o.pico ?? 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.35 },
      { opacity: 0, transform: "translate(-50%,-50%) scale(1.25)" },
    ],
    { duration: o.duracao ?? 420, delay: o.atraso ?? 0, easing: "ease-out" },
  );
}

/** Clarão na arena inteira. */
export function clarao(c: Cena, cor: string, duracao = 260, opacidade = 0.7, atraso = 0): Promise<void> {
  const el = c.criar("fx-clarao", `background:${cor}`);
  return efemero(c, el, [{ opacity: 0 }, { opacity: opacidade, offset: 0.2 }, { opacity: 0 }], { duration: duracao, delay: atraso });
}

export type FormaDeParticula = "faisca" | "ponto" | "brasa" | "floco" | "fumaca" | "estilhaco" | "folha" | "bolha" | "pena";

export interface OpcoesDeParticulas {
  cor: string;
  quantidade?: number;
  distancia?: number;
  duracao?: number;
  tamanho?: number;
  forma?: FormaDeParticula;
  /** Direção central em graus (0 = direita, 90 = baixo). */
  direcao?: number;
  abertura?: number;
  gravidade?: number;
  atraso?: number;
  /** Partículas vêm de fora para o ponto (carregar energia). */
  convergir?: boolean;
}

export function particulas(c: Cena, p: Ponto, o: OpcoesDeParticulas): Promise<void> {
  const n = o.quantidade ?? 10;
  const abertura = o.abertura ?? 360;
  const direcao = o.direcao ?? 0;
  const tarefas: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((direcao - abertura / 2 + (abertura * (i + sorteio())) / n) * Math.PI) / 180;
    const d = (o.distancia ?? 60) * (0.55 + 0.45 * sorteio());
    const dx = Math.cos(a) * d;
    const dy = Math.sin(a) * d + (o.gravidade ?? 0);
    const t = (o.tamanho ?? 6) * (0.7 + 0.6 * sorteio());
    const giro = o.forma === "estilhaco" || o.forma === "folha" ? (sorteio() - 0.5) * 540 : 0;
    const el = c.criar(
      `fx-p ${o.forma ?? "faisca"}`,
      `left:${px(p.x)};top:${px(p.y)};width:${px(t)};height:${px(o.forma === "faisca" ? t / 3 : t)};--c:${o.cor}`,
    );
    const orientacao = (a * 180) / Math.PI;
    const longe = `translate(${px(dx)},${px(dy)}) rotate(${orientacao + giro}deg)`;
    const perto = `translate(0,0) rotate(${orientacao}deg)`;
    tarefas.push(
      efemero(
        c,
        el,
        o.convergir
          ? [
              { opacity: 0, transform: longe },
              { opacity: 1, offset: 0.4 },
              { opacity: 0.2, transform: perto },
            ]
          : [
              { opacity: 1, transform: perto },
              { opacity: 0.9, offset: 0.5 },
              { opacity: 0, transform: longe + (o.forma === "fumaca" ? " scale(2.4)" : " scale(.6)") },
            ],
        {
          duration: (o.duracao ?? 520) * (0.8 + 0.4 * sorteio()),
          delay: (o.atraso ?? 0) + (o.convergir ? i * 18 : 0),
          easing: "cubic-bezier(.2,.7,.3,1)",
        },
      ),
    );
  }
  return juntos(...tarefas);
}

export interface OpcoesDeRastro {
  cor: string;
  espessura?: number;
  duracao?: number;
  atraso?: number;
  /** Quanto tempo o traço fica inteiro antes de sumir (fração da duração). */
  permanencia?: number;
}

/** Traço reto que nasce em `de` e corre até `para`, depois se apaga pela cauda. */
export function rastro(c: Cena, de: Ponto, para: Ponto, o: OpcoesDeRastro): Promise<void> {
  const comprimento = distancia(de, para);
  const esp = o.espessura ?? 3;
  const el = c.criar(
    "fx-rastro",
    `left:${px(de.x)};top:${px(de.y - esp / 2)};width:${px(comprimento)};height:${px(esp)};--c:${o.cor};transform:rotate(${angulo(de, para)}deg)`,
  );
  const p = Math.min(0.85, Math.max(0.3, o.permanencia ?? 0.45));
  return efemero(
    c,
    el,
    [
      { clipPath: "inset(0 100% 0 0)", opacity: 1 },
      { clipPath: "inset(0 0 0 0)", opacity: 1, offset: 0.3 },
      { clipPath: "inset(0 0 0 0)", opacity: 1, offset: p },
      { clipPath: "inset(0 0 0 100%)", opacity: 0.2 },
    ],
    { duration: o.duracao ?? 320, delay: o.atraso ?? 0, easing: "ease-out" },
  );
}

export interface OpcoesDeArco {
  raio: number;
  /** Ângulos em graus (0 = direita, 90 = baixo). */
  de: number;
  ate: number;
  cor: string;
  espessura?: number;
  duracao?: number;
  atraso?: number;
  brilho?: number;
}

/** Arco de lâmina desenhado em SVG: o traço avança e depois some. */
export function arco(c: Cena, centro: Ponto, o: OpcoesDeArco): Promise<void> {
  const ponto = (graus: number) => {
    const r = (graus * Math.PI) / 180;
    return { x: centro.x + Math.cos(r) * o.raio, y: centro.y + Math.sin(r) * o.raio };
  };
  const a = ponto(o.de);
  const b = ponto(o.ate);
  const grande = Math.abs(o.ate - o.de) > 180 ? 1 : 0;
  const varredura = o.ate > o.de ? 1 : 0;
  const esp = o.espessura ?? 6;
  const svg = c.criarSvg(
    `<path d="M${a.x} ${a.y} A${o.raio} ${o.raio} 0 ${grande} ${varredura} ${b.x} ${b.y}" pathLength="100"
      fill="none" stroke="${o.cor}" stroke-width="${esp}" stroke-linecap="round"
      style="filter:drop-shadow(0 0 ${o.brilho ?? 8}px ${o.cor});stroke-dasharray:100;stroke-dashoffset:100"/>`,
  );
  const caminho = svg.querySelector("path");
  const duracao = o.duracao ?? 260;
  if (!caminho) return Promise.resolve();
  return c.d
    .animar(
      caminho,
      [
        { strokeDashoffset: 100, opacity: 1 },
        { strokeDashoffset: 0, opacity: 1, offset: 0.55 },
        { strokeDashoffset: -100, opacity: 0 },
      ],
      { duration: duracao, delay: o.atraso ?? 0, easing: "cubic-bezier(.3,.8,.4,1)", fill: "both" },
    )
    .then(() => svg.remove());
}

export interface OpcoesDeProjetil {
  /** Classe visual do projétil (bala, kunai, agulha, bola, lanca, carta, mao...). */
  forma: string;
  cor: string;
  tamanho?: number;
  duracao?: number;
  /** Voltas completas durante o voo. */
  giro?: number;
  /** Altura da parábola (positiva = sobe). */
  altura?: number;
  easing?: string;
  /** Gira o projétil conforme a trajetória. */
  orientar?: boolean;
  atraso?: number;
  /** Fantasmas que seguem o projétil (rastros finos). */
  fantasmas?: number;
}

/** Objeto que voa em parábola de `de` até `para`. Resolve na chegada. */
export async function projetil(c: Cena, de: Ponto, para: Ponto, o: OpcoesDeProjetil): Promise<void> {
  const t = o.tamanho ?? 16;
  const passos = 14;
  const quadros: Keyframe[] = [];
  const altura = o.altura ?? 0;
  for (let i = 0; i <= passos; i++) {
    const f = i / passos;
    const x = de.x + (para.x - de.x) * f;
    const y = de.y + (para.y - de.y) * f - altura * 4 * f * (1 - f);
    const proximo = Math.min(1, f + 0.01);
    const yx = de.y + (para.y - de.y) * proximo - altura * 4 * proximo * (1 - proximo);
    const xx = de.x + (para.x - de.x) * proximo;
    const rot = (o.orientar ? (Math.atan2(yx - y, xx - x) * 180) / Math.PI : 0) + (o.giro ?? 0) * 360 * f;
    quadros.push({ transform: `translate(${px(x)},${px(y)}) translate(-50%,-50%) rotate(${rot}deg)`, opacity: f > 0.96 ? 0.6 : 1 });
  }
  const opcoes = { duration: o.duracao ?? 360, delay: o.atraso ?? 0, easing: o.easing ?? "linear" };
  const tarefas: Promise<void>[] = [];
  const total = (o.fantasmas ?? 0) + 1;
  for (let k = total - 1; k >= 0; k--) {
    const el = c.criar(`fx-projetil ${o.forma}${k > 0 ? " fantasma" : ""}`, `width:${px(t)};height:${px(t)};--c:${o.cor};left:0;top:0`);
    tarefas.push(efemero(c, el, quadros, { ...opcoes, delay: opcoes.delay + k * 45, fill: "both" }));
  }
  await tarefas[tarefas.length - 1];
  void juntos(...tarefas);
}

export interface OpcoesDeOnda {
  cor: string;
  largura?: number;
  altura?: number;
  duracao?: number;
  atraso?: number;
}

/** Meia-lua de energia que atravessa a arena e cresce no caminho (ex.: Getsuga Tenshō). */
export function onda(c: Cena, de: Ponto, para: Ponto, o: OpcoesDeOnda): Promise<void> {
  const w = o.largura ?? 46;
  const h = o.altura ?? 120;
  const rot = angulo(de, para);
  const el = c.criar("fx-onda", `width:${px(w)};height:${px(h)};--c:${o.cor};left:0;top:0`);
  const em = (p: Ponto, s: number, opacidade: number): Keyframe => ({
    transform: `translate(${px(p.x)},${px(p.y)}) translate(-50%,-50%) rotate(${rot}deg) scale(${s})`,
    opacity: opacidade,
  });
  return efemero(c, el, [em(de, 0.4, 0), em(c.entre(0.25, de, para), 0.8, 1), em(para, 1.25, 1), em(c.entre(1.1, de, para), 1.5, 0)], {
    duration: o.duracao ?? 520,
    delay: o.atraso ?? 0,
    easing: "cubic-bezier(.45,0,.4,1)",
  });
}

export interface OpcoesDeRaio {
  cor: string;
  espessura?: number;
  segmentos?: number;
  duracao?: number;
  atraso?: number;
  desvio?: number;
}

/** Raio em zigue-zague que pisca. */
export function raio(c: Cena, de: Ponto, para: Ponto, o: OpcoesDeRaio): Promise<void> {
  const n = o.segmentos ?? 8;
  const desvio = o.desvio ?? 18;
  const pontos: string[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const meio = i === 0 || i === n ? 0 : (sorteio() - 0.5) * 2 * desvio;
    pontos.push(`${de.x + (para.x - de.x) * f + meio},${de.y + (para.y - de.y) * f + meio * 0.4}`);
  }
  const svg = c.criarSvg(
    `<polyline points="${pontos.join(" ")}" fill="none" stroke="${o.cor}" stroke-width="${o.espessura ?? 4}" stroke-linejoin="bevel" style="filter:drop-shadow(0 0 10px ${o.cor})"/>` +
      `<polyline points="${pontos.join(" ")}" fill="none" stroke="#fff" stroke-width="${(o.espessura ?? 4) / 2.5}"/>`,
  );
  return c.d
    .animar(
      svg,
      [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.25, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }],
      {
        duration: o.duracao ?? 360,
        delay: o.atraso ?? 0,
        fill: "both",
      },
    )
    .then(() => svg.remove());
}

/** Tremor da arena. */
export function tremor(c: Cena, intensidade = 6, duracao = 280): Promise<void> {
  const i = intensidade;
  return c.d.animar(
    c.arena,
    [
      { transform: "translate(0,0)" },
      { transform: `translate(${-i}px,${i / 2}px)` },
      { transform: `translate(${i}px,${-i / 2}px)` },
      { transform: `translate(${-i / 2}px,${-i / 3}px)` },
      { transform: `translate(${i / 3}px,${i / 4}px)` },
      { transform: "translate(0,0)" },
    ],
    { duration: duracao },
  );
}

export interface OpcoesDeMovimento {
  dx?: number;
  dy?: number;
  escala?: number;
  giro?: number;
  duracao?: number;
  easing?: string;
  /** Volta para o lugar no fim (padrão: sim). */
  volta?: boolean;
  /** Fração da duração parada no ponto final. */
  pausa?: number;
}

/** Desloca herói ou inimigo e (por padrão) volta. */
export function mover(c: Cena, el: HTMLElement, o: OpcoesDeMovimento): Promise<void> {
  const alvo = `translate(${px(o.dx ?? 0)},${px(o.dy ?? 0)}) scale(${o.escala ?? 1}) rotate(${o.giro ?? 0}deg)`;
  const inicio = "translate(0,0) scale(1) rotate(0deg)";
  const pausa = o.pausa ?? 0.25;
  const quadros: Keyframe[] =
    o.volta === false
      ? [{ transform: inicio }, { transform: alvo }]
      : [
          { transform: inicio },
          { transform: alvo, offset: 0.4 },
          { transform: alvo, offset: Math.min(0.95, 0.4 + pausa) },
          { transform: inicio },
        ];
  return c.d.animar(el, quadros, {
    duration: o.duracao ?? 320,
    easing: o.easing ?? "cubic-bezier(.3,.7,.3,1)",
    fill: o.volta === false ? "forwards" : "none",
  });
}

/** Reação do inimigo ao ser atingido: recua, pisca e treme. */
export function reacaoDoInimigo(c: Cena, forca = 1, cor = "#ffffff"): Promise<void> {
  const r = 10 * forca;
  return c.d.animar(
    c.inimigo,
    [
      { transform: "translate(0,0)", filter: "none" },
      {
        transform: `translate(${px(r)},${px(-r / 3)}) rotate(${4 * forca}deg)`,
        filter: `brightness(2.4) drop-shadow(0 0 10px ${cor})`,
        offset: 0.15,
      },
      { transform: `translate(${px(-r / 3)},0) rotate(${-2 * forca}deg)`, filter: "brightness(1.3)", offset: 0.5 },
      { transform: "translate(0,0)", filter: "none" },
    ],
    { duration: 300 + 120 * forca },
  );
}

/** Reação do herói ao dano. */
export function reacaoDoHeroi(c: Cena, forca = 1): Promise<void> {
  const r = 9 * forca;
  return c.d.animar(
    c.heroi,
    [
      { transform: "translate(0,0)", filter: "none" },
      {
        transform: `translate(${px(-r)},${px(r / 4)}) rotate(-5deg)`,
        filter: "brightness(1.6) sepia(1) hue-rotate(-40deg) saturate(4)",
        offset: 0.2,
      },
      { transform: "translate(0,0)", filter: "none" },
    ],
    { duration: 360 },
  );
}

export type TipoDeNumero = "dano" | "forte" | "cura" | "energia" | "bloqueio" | "absorvido" | "esquiva" | "evitado" | "nevoa" | "aviso";

/** Número ou palavra que salta no ponto do impacto. Não precisa ser esperado. */
export function numero(c: Cena, p: Ponto, texto: string, tipo: TipoDeNumero = "dano", atraso = 0): Promise<void> {
  const el = c.criar(`fx-numero ${tipo}`, `left:${px(p.x)};top:${px(p.y)}`);
  el.textContent = texto;
  if (semMovimento(c)) {
    return efemero(
      c,
      el,
      [
        { opacity: 0, transform: "translate(-50%,-100%)" },
        { opacity: 1, transform: "translate(-50%,-100%)", offset: 0.15 },
        { opacity: 1, transform: "translate(-50%,-100%)", offset: 0.75 },
        { opacity: 0, transform: "translate(-50%,-100%)" },
      ],
      { duration: 900, delay: atraso },
    );
  }
  return efemero(
    c,
    el,
    [
      { opacity: 0, transform: "translate(-50%,-30%) scale(.5)" },
      { opacity: 1, transform: "translate(-50%,-90%) scale(1.25)", offset: 0.16 },
      { opacity: 1, transform: "translate(-50%,-110%) scale(1)", offset: 0.7 },
      { opacity: 0, transform: "translate(-50%,-150%) scale(.95)" },
    ],
    { duration: tipo === "forte" ? 1300 : 1000, delay: atraso, easing: "ease-out" },
  );
}

/** Nome do golpe no rodapé da arena. */
export function rotulo(c: Cena, texto: string, cor = "#ffe9ab", duracao = 950): Promise<void> {
  const el = c.criar("fx-rotulo", `--c:${cor}`);
  el.textContent = texto;
  if (semMovimento(c))
    return efemero(c, el, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
      duration: duracao,
    });
  return efemero(
    c,
    el,
    [
      { opacity: 0, transform: "translateX(-24px)" },
      { opacity: 1, transform: "translateX(0)", offset: 0.2 },
      { opacity: 1, offset: 0.78 },
      { opacity: 0, transform: "translateY(-8px)" },
    ],
    { duration: duracao },
  );
}

/** Escurece o céu da arena (a lua some) por um tempo. */
export function ceu(c: Cena, cor: string, duracao: number, intensidade = 0.75): Promise<void> {
  const el = c.criar("fx-ceu", `--c:${cor}`);
  return efemero(c, el, [{ opacity: 0 }, { opacity: intensidade, offset: 0.25 }, { opacity: intensidade, offset: 0.8 }, { opacity: 0 }], {
    duration: duracao,
  });
}

export interface OpcoesDeAnel {
  cor: string;
  raio?: number;
  espessura?: number;
  duracao?: number;
  atraso?: number;
  achatado?: number;
}

/** Onda de choque circular. */
export function anel(c: Cena, p: Ponto, o: OpcoesDeAnel): Promise<void> {
  const r = o.raio ?? 70;
  const el = c.criar(
    "fx-anel",
    `left:${px(p.x)};top:${px(p.y)};width:${px(r * 2)};height:${px(r * 2 * (o.achatado ?? 1))};--c:${o.cor};border-width:${px(o.espessura ?? 4)}`,
  );
  return efemero(
    c,
    el,
    [
      { opacity: 1, transform: "translate(-50%,-50%) scale(.1)" },
      { opacity: 0, transform: "translate(-50%,-50%) scale(1)" },
    ],
    { duration: o.duracao ?? 480, delay: o.atraso ?? 0, easing: "cubic-bezier(.1,.7,.3,1)" },
  );
}

/** Marcas paralelas (garras, cortes múltiplos). */
export function marcas(
  c: Cena,
  p: Ponto,
  o: {
    quantidade: number;
    cor: string;
    angulo: number;
    comprimento: number;
    espacamento?: number;
    duracao?: number;
    atraso?: number;
    espessura?: number;
  },
): Promise<void> {
  const tarefas: Promise<void>[] = [];
  const a = (o.angulo * Math.PI) / 180;
  const normal = { x: -Math.sin(a), y: Math.cos(a) };
  for (let i = 0; i < o.quantidade; i++) {
    const deslocamento = (i - (o.quantidade - 1) / 2) * (o.espacamento ?? 12);
    const centro = { x: p.x + normal.x * deslocamento, y: p.y + normal.y * deslocamento };
    const meio = o.comprimento / 2;
    tarefas.push(
      rastro(
        c,
        { x: centro.x - Math.cos(a) * meio, y: centro.y - Math.sin(a) * meio },
        { x: centro.x + Math.cos(a) * meio, y: centro.y + Math.sin(a) * meio },
        { cor: o.cor, espessura: o.espessura ?? 3, duracao: o.duracao ?? 260, atraso: (o.atraso ?? 0) + i * 40, permanencia: 0.6 },
      ),
    );
  }
  return juntos(...tarefas);
}

/** Feixe contínuo (laser) que cresce, se mantém e afina. */
export function feixe(
  c: Cena,
  de: Ponto,
  para: Ponto,
  o: { cor: string; espessura?: number; duracao?: number; atraso?: number },
): Promise<void> {
  const esp = o.espessura ?? 18;
  const el = c.criar(
    "fx-feixe",
    `left:${px(de.x)};top:${px(de.y - esp / 2)};width:${px(distancia(de, para) + 30)};height:${px(esp)};--c:${o.cor};transform:rotate(${angulo(de, para)}deg)`,
  );
  return efemero(
    c,
    el,
    [
      { clipPath: "inset(0 100% 0 0)", transform: `rotate(${angulo(de, para)}deg) scaleY(.4)` },
      { clipPath: "inset(0 0 0 0)", transform: `rotate(${angulo(de, para)}deg) scaleY(1)`, offset: 0.25 },
      { clipPath: "inset(0 0 0 0)", transform: `rotate(${angulo(de, para)}deg) scaleY(1.15)`, offset: 0.75 },
      { clipPath: "inset(0 0 0 0)", transform: `rotate(${angulo(de, para)}deg) scaleY(0)` },
    ],
    { duration: o.duracao ?? 700, delay: o.atraso ?? 0, easing: "ease-out" },
  );
}

/** Braço que estica até o alvo e volta (golpes elásticos). Resolve no fim do recolhimento. */
export function esticar(
  c: Cena,
  de: Ponto,
  para: Ponto,
  o: { cor: string; espessura?: number; duracao?: number; aoChegar?: () => void },
): Promise<void> {
  const esp = o.espessura ?? 9;
  const el = c.criar(
    "fx-braco",
    `left:${px(de.x)};top:${px(de.y - esp / 2)};width:${px(distancia(de, para))};height:${px(esp)};--c:${o.cor};transform:rotate(${angulo(de, para)}deg)`,
    '<i class="punho"></i>',
  );
  const r = angulo(de, para);
  const duracao = o.duracao ?? 620;
  if (o.aoChegar) void c.d.esperar(duracao * 0.42).then(o.aoChegar);
  return efemero(
    c,
    el,
    [
      { transform: `rotate(${r}deg) scaleX(.02)`, easing: "cubic-bezier(.2,.9,.3,1.3)" },
      { transform: `rotate(${r}deg) scaleX(1.06)`, offset: 0.42 },
      { transform: `rotate(${r}deg) scaleX(.94)`, offset: 0.55, easing: "cubic-bezier(.7,0,.9,.5)" },
      { transform: `rotate(${r}deg) scaleX(.02)` },
    ],
    { duration: duracao },
  );
}

/** Círculo mágico girando (alquimia, Zoltraak, invocações). */
export function circulo(
  c: Cena,
  p: Ponto,
  o: { cor: string; raio?: number; duracao?: number; atraso?: number; achatado?: number },
): Promise<void> {
  const r = o.raio ?? 46;
  const el = c.criar(
    "fx-circulo",
    `left:${px(p.x)};top:${px(p.y)};width:${px(r * 2)};height:${px(r * 2)};--c:${o.cor};--achatado:${o.achatado ?? 1}`,
    "<i></i><b></b>",
  );
  return efemero(
    c,
    el,
    [
      { opacity: 0, transform: `translate(-50%,-50%) scaleY(${o.achatado ?? 1}) rotate(0deg) scale(.3)` },
      { opacity: 1, transform: `translate(-50%,-50%) scaleY(${o.achatado ?? 1}) rotate(120deg) scale(1)`, offset: 0.3 },
      { opacity: 1, transform: `translate(-50%,-50%) scaleY(${o.achatado ?? 1}) rotate(260deg) scale(1)`, offset: 0.8 },
      { opacity: 0, transform: `translate(-50%,-50%) scaleY(${o.achatado ?? 1}) rotate(320deg) scale(1.15)` },
    ],
    { duration: o.duracao ?? 900, delay: o.atraso ?? 0 },
  );
}

/** Cópias translúcidas do herói (clones, pós-imagens). */
export function fantasmaDoHeroi(c: Cena, o: { dx: number; dy?: number; cor: string; duracao?: number; atraso?: number }): Promise<void> {
  const clone = c.heroi.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-heroi");
  clone.classList.add("fx-fantasma");
  clone.style.setProperty("--c", o.cor);
  c.arena.append(clone);
  return c.d
    .animar(
      clone,
      [
        { opacity: 0, transform: "translate(0,0)" },
        { opacity: 0.75, transform: `translate(${px(o.dx * 0.6)},${px((o.dy ?? 0) * 0.6)})`, offset: 0.35 },
        { opacity: 0, transform: `translate(${px(o.dx)},${px(o.dy ?? 0)})` },
      ],
      { duration: o.duracao ?? 420, delay: o.atraso ?? 0, fill: "both" },
    )
    .then(() => clone.remove());
}

/** Faz uma camada do herói aparecer (escala a partir de um ponto). */
export function brotar(c: Cena, seletor: string, duracao = 380, origem = "50% 50%"): Promise<void> {
  const el = c.heroi.querySelector<SVGElement>(seletor);
  if (!el) return Promise.resolve();
  el.style.transformOrigin = origem;
  el.style.transformBox = "fill-box";
  return c.d.animar(
    el,
    [
      { transform: "scale(0)", opacity: 0 },
      { transform: "scale(1.2)", opacity: 1, offset: 0.7 },
      { transform: "scale(1)", opacity: 1 },
    ],
    {
      duration: duracao,
      easing: "cubic-bezier(.2,.9,.3,1.4)",
    },
  );
}

/** Faz uma camada do herói sumir. */
export function murchar(c: Cena, seletor: string, duracao = 380, origem = "50% 50%"): Promise<void> {
  const el = c.heroi.querySelector<SVGElement>(seletor);
  if (!el) return Promise.resolve();
  el.style.transformOrigin = origem;
  el.style.transformBox = "fill-box";
  return c.d.animar(
    el,
    [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(0)", opacity: 0 },
    ],
    { duration: duracao, easing: "ease-in", fill: "forwards" },
  );
}
