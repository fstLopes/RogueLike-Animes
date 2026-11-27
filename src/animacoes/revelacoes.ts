// Revelação de itens raros na primeira vez que aparecem (oferta, loja ou drop).
// Dourada para Lendária, magenta para Mítica. Ids no registro: revelacao:lendaria e revelacao:mitica.
export type AnimacaoDeRevelacao = (carta: HTMLElement) => void;

function revelacao(cor: string, brilho: string): AnimacaoDeRevelacao {
  return (carta) => {
    if (typeof carta.animate !== "function") return;
    carta.animate(
      [
        { transform: "translateY(14px) scale(.92)", opacity: 0.3, filter: "brightness(1)" },
        { transform: "translateY(0) scale(1.04)", opacity: 1, boxShadow: `0 0 30px ${cor}`, filter: `brightness(${brilho})`, offset: 0.55 },
        { transform: "none", opacity: 1, filter: "brightness(1)" },
      ],
      { duration: 820, easing: "cubic-bezier(.2,.8,.3,1)" },
    );
  };
}

export const animacoesDeRevelacao: Readonly<Record<string, AnimacaoDeRevelacao>> = {
  "revelacao:lendaria": revelacao("#ffc779", "1.35"),
  "revelacao:mitica": revelacao("#ff5fc8", "1.5"),
};
