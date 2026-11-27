// Referências e posições dos elementos da arena de combate.
import type { Diretor } from "./diretor.ts";

export interface Ponto {
  x: number;
  y: number;
}

export class Cena {
  constructor(
    readonly arena: HTMLElement,
    readonly camada: HTMLElement,
    readonly heroi: HTMLElement,
    readonly inimigo: HTMLElement,
    readonly d: Diretor,
    /** Raiz onde ficam os medidores de vida e energia (palco + painel lateral). */
    readonly raiz: ParentNode,
  ) {}

  static encontrar(raiz: ParentNode, d: Diretor): Cena | null {
    const arena = raiz.querySelector<HTMLElement>("[data-arena]");
    const camada = arena?.querySelector<HTMLElement>("[data-fx]");
    const heroi = arena?.querySelector<HTMLElement>("[data-heroi]");
    const inimigo = arena?.querySelector<HTMLElement>("[data-inimigo]");
    if (!arena || !camada || !heroi || !inimigo) return null;
    return new Cena(arena, camada, heroi, inimigo, d, raiz);
  }

  get largura(): number {
    return this.arena.clientWidth || 600;
  }

  get altura(): number {
    return this.arena.clientHeight || 280;
  }

  private relativo(el: Element, fx: number, fy: number): Ponto {
    const base = this.arena.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width * fx, y: r.top - base.top + r.height * fy };
  }

  /** Centro do tronco do herói. */
  get heroiCentro(): Ponto {
    return this.relativo(this.heroi, 0.45, 0.55);
  }

  /** Punho da frente do herói (origem de golpes e disparos). */
  get mao(): Ponto {
    return this.relativo(this.heroi, 0.74, 0.44);
  }

  get inimigoCentro(): Ponto {
    return this.relativo(this.inimigo, 0.5, 0.5);
  }

  /** Vetor do herói até o inimigo. */
  get direcao(): Ponto {
    const a = this.mao;
    const b = this.inimigoCentro;
    return { x: b.x - a.x, y: b.y - a.y };
  }

  /** Ponto entre o herói e o inimigo (t = 0 no herói, 1 no inimigo). */
  entre(t: number, de: Ponto = this.mao, ate: Ponto = this.inimigoCentro): Ponto {
    return { x: de.x + (ate.x - de.x) * t, y: de.y + (ate.y - de.y) * t };
  }

  criar(classe: string, estilo: string, html = ""): HTMLElement {
    const el = document.createElement("div");
    el.className = classe;
    el.style.cssText = estilo;
    if (html) el.innerHTML = html;
    this.camada.append(el);
    return el;
  }

  criarSvg(conteudo: string, classe = "fx-svg"): SVGSVGElement {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", classe);
    svg.setAttribute("viewBox", `0 0 ${this.largura} ${this.altura}`);
    svg.setAttribute("width", String(this.largura));
    svg.setAttribute("height", String(this.altura));
    svg.innerHTML = conteudo;
    this.camada.append(svg);
    return svg;
  }

  limpar(): void {
    this.camada.replaceChildren();
    this.heroi.style.removeProperty("transform");
    this.inimigo.style.removeProperty("opacity");
    this.arena.classList.remove("tempo-parado", "ceu-escuro");
  }
}
