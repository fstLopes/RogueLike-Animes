import "./estilos/tema.css";
import "./estilos/layout.css";
import "./estilos/combate.css";
import "./estilos/salas.css";
import "./estilos/mochila.css";
import "./estilos/itens.css";
import "./estilos/animacoes.css";
import "./estilos/formas.css";
import "./estilos/conta.css";
import { Aplicacao } from "./interface/app.ts";

function exigir<T extends HTMLElement>(seletor: string): T {
  const el = document.querySelector<T>(seletor);
  if (!el) throw new Error("Elemento ausente: " + seletor);
  return el;
}

const app = new Aplicacao({
  palco: exigir("#stage"),
  lateral: exigir("#side"),
  perfil: exigir<HTMLButtonElement>("#profile"),
  mochila: exigir<HTMLButtonElement>("#bag"),
  conta: exigir<HTMLButtonElement>("#account"),
  recomecar: exigir<HTMLButtonElement>("#reset"),
});
app.iniciar();

// Acesso para depuração no console do navegador.
(globalThis as { torre?: Aplicacao }).torre = app;
