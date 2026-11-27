// Estado só da interface (painéis abertos, abas). Não vai para o save.
export type AbaDoPerfil = "equipados" | "atributos";

export interface EstadoDaInterface {
  mochila: boolean;
  perfil: boolean;
  conta: boolean;
  abaDoPerfil: AbaDoPerfil;
  abaDaMochila: string;
  inspecionado: number | null;
  aviso: string | null;
}

export function interfaceInicial(): EstadoDaInterface {
  return { mochila: false, perfil: false, conta: false, abaDoPerfil: "equipados", abaDaMochila: "todos", inspecionado: null, aviso: null };
}

export const abasDaMochila: Record<string, [string, string]> = {
  todos: ["Todos", "◇"],
  arma: ["Armas", "⚔"],
  poder: ["Poderes", "✧"],
  passiva: ["Passivas", "✦"],
  cabeca: ["Cabeça", "♜"],
  tronco: ["Tronco", "⛨"],
  calca: ["Calça", "Ⅱ"],
  pes: ["Pés", "»"],
  consumivel: ["Consumíveis", "✚"],
};
