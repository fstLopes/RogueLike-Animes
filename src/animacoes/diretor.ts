// Controla o tempo das animações: ritmo, pausas e o botão "Pular".
// Toda espera e toda animação passam por aqui; ao pular, tudo termina na hora,
// então nenhuma sequência fica presa e o turno sempre chega ao fim.
export class Diretor {
  pulado = false;
  /** Multiplica todas as durações (1 = normal, >1 = câmera lenta). */
  ritmo = 1;
  private readonly ativas = new Set<Animation>();
  private readonly esperas = new Set<() => void>();

  esperar(ms: number): Promise<void> {
    if (this.pulado || ms <= 0) return Promise.resolve();
    return new Promise((resolver) => {
      const fim = () => {
        clearTimeout(relogio);
        this.esperas.delete(fim);
        resolver();
      };
      const relogio = setTimeout(fim, ms * this.ritmo);
      this.esperas.add(fim);
    });
  }

  /** Anima um elemento com a Web Animations API e espera o fim. */
  animar(elemento: Element, quadros: Keyframe[], opcoes: KeyframeAnimationOptions & { duration: number }): Promise<void> {
    if (this.pulado || typeof elemento.animate !== "function") return Promise.resolve();
    const animacao = elemento.animate(quadros, {
      fill: "none",
      ...opcoes,
      duration: opcoes.duration * this.ritmo,
      delay: (opcoes.delay ?? 0) * this.ritmo,
    });
    this.ativas.add(animacao);
    return animacao.finished
      .then(
        () => undefined,
        () => undefined,
      )
      .finally(() => this.ativas.delete(animacao));
  }

  pular(): void {
    if (this.pulado) return;
    this.pulado = true;
    for (const animacao of this.ativas) {
      try {
        animacao.finish();
      } catch {
        animacao.cancel();
      }
    }
    for (const fim of [...this.esperas]) fim();
  }
}

/** Executa tarefas em paralelo e espera todas. */
export function juntos(...tarefas: Promise<unknown>[]): Promise<void> {
  return Promise.all(tarefas).then(() => undefined);
}
