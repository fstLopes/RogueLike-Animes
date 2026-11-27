// Controlador da interface: traduz cliques em comandos, chama o motor, toca as
// animações a partir do resultado e redesenha. Enquanto uma sequência toca,
// novas ações são ignoradas (um clique duplo não gasta energia duas vezes).
import { Diretor } from "../animacoes/diretor.ts";
import { tocarTurno } from "../animacoes/reprodutor.ts";
import { animacoesDeRevelacao } from "../animacoes/revelacoes.ts";
import type { Aleatorio, Atributo, Comando, EstadoDaPartida, TipoDeSala } from "../dominio/tipos.ts";
import { aleatorioDoNavegador } from "../motor/aleatorio.ts";
import { estadoInicial, executarComando } from "../motor/jornada.ts";
import { ClienteDaApi } from "../online/api.ts";
import { Sincronizador } from "../online/sincronizacao.ts";
import {
  carregarLocal,
  carregarPreferencias,
  exportarSave,
  importarSave,
  salvarLocal,
  salvarPreferencias,
  type ModoDeAnimacao,
  type Preferencias,
} from "../salvamento/save.ts";
import { abasDaMochila, interfaceInicial, type EstadoDaInterface } from "./estado-da-interface.ts";
import { telaDeCombate } from "./telas/combate.ts";
import { telaDaConta } from "./telas/conta.ts";
import { painelLateral, registroDaJornada } from "./telas/lateral.ts";
import { telaDaMochila } from "./telas/mochila.ts";
import { telaDoPerfil } from "./telas/perfil.ts";
import { telaDeSala } from "./telas/salas.ts";

const ATRIBUTOS: readonly Atributo[] = ["atk", "def", "res"];
const SALAS: readonly TipoDeSala[] = ["combate", "evento", "loja", "descanso", "chefe"];

export interface Elementos {
  palco: HTMLElement;
  lateral: HTMLElement;
  perfil: HTMLButtonElement;
  mochila: HTMLButtonElement;
  conta: HTMLButtonElement;
  recomecar: HTMLButtonElement;
}

export class Aplicacao {
  estado: EstadoDaPartida;
  ui: EstadoDaInterface = interfaceInicial();
  preferencias: Preferencias = carregarPreferencias();
  /** Verdadeiro enquanto uma sequência de animação está tocando. */
  ocupado = false;
  private diretor: Diretor | null = null;
  private focarDepois = false;
  private readonly revelados = new Set<string>();
  readonly sincronizador: Sincronizador;

  constructor(
    private readonly el: Elementos,
    private readonly aleatorio: Aleatorio = aleatorioDoNavegador,
    api = new ClienteDaApi(),
  ) {
    const carga = carregarLocal();
    this.estado = carga.estado ?? estadoInicial();
    if (carga.erro) this.ui.aviso = "O save local estava corrompido e foi ignorado: " + carga.erro;
    if (carga.origem === "antigo") this.ui.aviso = "Seu save da versão anterior foi migrado para o novo formato.";
    this.sincronizador = new Sincronizador(api, {
      estadoAtual: () => this.estado,
      adotarEstado: (estado) => {
        this.estado = estado;
        salvarLocal(estado);
        this.ui = { ...interfaceInicial(), conta: this.ui.conta };
        this.desenhar();
      },
      aoMudar: () => this.desenharLateral(),
    });
  }

  iniciar(): void {
    document.addEventListener("click", (evento) => this.aoClicar(evento));
    document.addEventListener("keydown", (evento) => this.aoTeclar(evento));
    document.addEventListener("change", (evento) => this.aoMudar(evento));
    document.addEventListener("submit", (evento) => void this.aoEnviar(evento));
    this.el.mochila.addEventListener("click", () => this.acaoDaInterface("mochila"));
    this.el.recomecar.addEventListener("click", () => this.acaoDaInterface("recomecar"));
    this.desenhar();
    void this.sincronizador.iniciar();
  }

  /** Modo de animação efetivo: a escolha do jogador ou, sem escolha, o sistema. */
  get modoDeAnimacao(): ModoDeAnimacao {
    if (this.preferencias.animacoes) return this.preferencias.animacoes;
    const reduzir = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduzir ? "reduzidas" : "completas";
  }

  // ---- Comandos do jogo ------------------------------------------------------

  async comandar(comando: Comando): Promise<void> {
    if (this.ocupado) return;
    const resultado = executarComando(this.estado, comando, this.aleatorio);
    if (!resultado.aceito) {
      if (resultado.estado !== this.estado) {
        this.estado = resultado.estado;
        this.desenhar();
      }
      return;
    }
    this.estado = resultado.estado;
    this.salvar();
    if (comando.tipo === "iniciar") {
      this.ui = interfaceInicial();
      this.revelados.clear();
    }
    if (this.estado.tela === "derrota") this.ui.mochila = false;
    if (comando.tipo === "turno" && this.modoDeAnimacao !== "desligadas") {
      this.ocupado = true;
      const diretor = new Diretor();
      this.diretor = diretor;
      this.el.palco.setAttribute("aria-busy", "true");
      this.mostrarBotaoPular(true);
      try {
        await tocarTurno(resultado.eventos, { raiz: document, modo: this.modoDeAnimacao, diretor, estadoFinal: this.estado });
      } finally {
        this.diretor = null;
        this.ocupado = false;
        this.el.palco.removeAttribute("aria-busy");
        this.mostrarBotaoPular(false);
      }
    }
    this.focarDepois = true;
    this.desenhar();
  }

  pularAnimacao(): void {
    this.diretor?.pular();
  }

  private salvar(): void {
    if (salvarLocal(this.estado)) this.sincronizador.aoSalvarLocal();
  }

  // ---- Eventos do DOM --------------------------------------------------------

  private aoClicar(evento: MouseEvent): void {
    const alvo = (evento.target as Element | null)?.closest<HTMLElement>("[data-acao]");
    if (!alvo || alvo instanceof HTMLInputElement) return;
    const acao = alvo.dataset.acao ?? "";
    const arg = alvo.dataset.arg ?? "";
    if (acao === "pular-animacao") {
      this.pularAnimacao();
      return;
    }
    const comando = this.paraComando(acao, arg);
    if (comando) void this.comandar(comando);
    else this.acaoDaInterface(acao, arg);
  }

  private paraComando(acao: string, arg: string): Comando | null {
    const id = Number(arg);
    switch (acao) {
      case "iniciar":
        return { tipo: "iniciar" };
      case "turno":
        return { tipo: "turno", acaoId: arg };
      case "rota":
        return (SALAS as readonly string[]).includes(arg) ? { tipo: "rota", destino: arg as TipoDeSala } : null;
      case "pegar":
        return { tipo: "pegar", chave: arg };
      case "comprar":
        return { tipo: "comprar", chave: arg };
      case "moedas-evento":
        return { tipo: "moedasDoEvento" };
      case "continuar":
        return { tipo: "continuar" };
      case "sair-loja":
        return { tipo: "sairDaLoja" };
      case "moedas-descanso":
        return { tipo: "moedasDoDescanso" };
      case "treinar":
        return { tipo: "treinar", itemId: id };
      case "melhorar":
        return { tipo: "melhorar", itemId: id };
      case "atributo":
        return (ATRIBUTOS as readonly string[]).includes(arg) ? { tipo: "atributo", atributo: arg as Atributo } : null;
      case "equipar":
        return this.ui.mochila ? { tipo: "equipar", itemId: id } : null;
      case "equipar-melhores":
        return this.ui.mochila ? { tipo: "equiparMelhores" } : null;
      default:
        return null;
    }
  }

  private acaoDaInterface(acao: string, arg = ""): void {
    if (this.ocupado) return;
    const ui = this.ui;
    const emJornada = !["titulo", "derrota"].includes(this.estado.tela);
    switch (acao) {
      case "mochila":
        if (!emJornada) return;
        ui.mochila = !ui.mochila;
        ui.perfil = false;
        ui.conta = false;
        ui.inspecionado = null;
        break;
      case "perfil":
        if (!emJornada) return;
        ui.perfil = !ui.perfil;
        ui.mochila = false;
        ui.conta = false;
        ui.inspecionado = null;
        break;
      case "conta":
        ui.conta = !ui.conta;
        ui.mochila = false;
        ui.perfil = false;
        ui.aviso = ui.conta ? ui.aviso : null;
        break;
      case "aba-perfil":
        if (arg === "equipados" || arg === "atributos") ui.abaDoPerfil = arg;
        this.desenhar();
        this.el.palco.querySelector<HTMLElement>(`#perfil-${arg}`)?.focus({ preventScroll: true });
        return;
      case "aba-mochila":
        if (Object.hasOwn(abasDaMochila, arg)) ui.abaDaMochila = arg;
        this.desenhar();
        this.el.palco.querySelector<HTMLElement>(`#aba-${arg}`)?.focus({ preventScroll: true });
        return;
      case "inspecionar":
        if (ui.mochila) ui.inspecionado = Number(arg);
        break;
      case "fechar-ficha":
        ui.inspecionado = null;
        break;
      case "recomecar":
        if (!confirm("Recomeçar do 1º andar e encerrar esta jornada?")) return;
        void this.comandar({ tipo: "iniciar" });
        return;
      case "exportar":
        this.exportar();
        return;
      case "modo-animacao":
        return;
      case "sincronizar":
        void this.sincronizador.reconciliar();
        return;
      case "sair-da-conta":
        void this.sincronizador.sair().then(() => this.desenhar());
        return;
      case "tentar-servidor":
        void this.sincronizador.iniciar().then(() => this.desenhar());
        return;
      case "manter-local":
        void this.sincronizador.resolverConflito("local").then(() => this.desenhar());
        return;
      case "usar-remoto":
        void this.sincronizador.resolverConflito("remoto").then(() => this.desenhar());
        return;
      default:
        return;
    }
    this.focarDepois = true;
    this.desenhar();
  }

  private aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === "Escape" && this.ocupado) {
      this.pularAnimacao();
      return;
    }
    const aba = (evento.target as Element | null)?.closest<HTMLElement>('[role="tab"]');
    if (!aba) return;
    const chaves = aba.dataset.acao === "aba-perfil" ? ["equipados", "atributos"] : Object.keys(abasDaMochila);
    const i = chaves.indexOf(aba.dataset.arg ?? "");
    const proximo = {
      ArrowRight: (i + 1) % chaves.length,
      ArrowLeft: (i + chaves.length - 1) % chaves.length,
      Home: 0,
      End: chaves.length - 1,
    }[evento.key];
    if (proximo === undefined) return;
    evento.preventDefault();
    this.acaoDaInterface(aba.dataset.acao ?? "", chaves[proximo] ?? "");
  }

  private aoMudar(evento: Event): void {
    const alvo = evento.target as HTMLInputElement | null;
    if (!alvo) return;
    if (alvo.dataset.acao === "modo-animacao") {
      const modo = alvo.value as ModoDeAnimacao;
      this.preferencias = { animacoes: modo };
      salvarPreferencias(this.preferencias);
      this.desenhar();
    }
    if (alvo.hasAttribute("data-importar") && alvo.files?.[0]) void this.importar(alvo.files[0]);
  }

  private async aoEnviar(evento: SubmitEvent): Promise<void> {
    const form = evento.target as HTMLFormElement | null;
    if (!form || form.dataset.form !== "conta") return;
    evento.preventDefault();
    const dados = new FormData(form);
    const usuario = String(dados.get("usuario") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");
    const modo = (evento.submitter as HTMLButtonElement | null)?.value === "cadastrar" ? "cadastrar" : "entrar";
    try {
      if (modo === "cadastrar") await this.sincronizador.cadastrar(usuario, senha);
      else await this.sincronizador.entrar(usuario, senha);
      this.ui.aviso = null;
    } catch (erro) {
      this.ui.aviso = erro instanceof Error ? erro.message : "Não foi possível entrar.";
    }
    this.desenhar();
  }

  // ---- Save em arquivo ---------------------------------------------------------

  private exportar(): void {
    if (this.estado.tela === "titulo") return;
    const blob = new Blob([exportarSave(this.estado)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `torre-do-eclipse-andar-${this.estado.andar}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  private async importar(arquivo: File): Promise<void> {
    const lido = importarSave(await arquivo.text());
    if (!lido.ok) {
      this.ui.aviso = "Não foi possível importar: " + lido.erro;
    } else {
      this.estado = lido.estado;
      this.salvar();
      this.ui = {
        ...interfaceInicial(),
        conta: true,
        aviso: lido.migrado ? "Save importado e convertido para o formato atual." : "Save importado.",
      };
      this.revelados.clear();
    }
    this.desenhar();
  }

  // ---- Desenho -------------------------------------------------------------------

  private mostrarBotaoPular(visivel: boolean): void {
    const arena = this.el.palco.querySelector<HTMLElement>("[data-arena]");
    arena?.querySelector(".pular-animacao")?.remove();
    if (visivel && arena) {
      arena.insertAdjacentHTML("beforeend", '<button type="button" class="pular-animacao" data-acao="pular-animacao">Pular ⏭</button>');
    }
  }

  private desenharLateral(): void {
    this.el.lateral.innerHTML = painelLateral(this.estado, this.sincronizador.status, this.sincronizador.usuario);
    const ativo = document.activeElement;
    const digitando = ativo instanceof HTMLInputElement && ativo.type !== "radio" && this.el.palco.contains(ativo);
    if (this.ui.conta && !this.ocupado && !digitando) this.el.palco.innerHTML = this.telaDaConta();
  }

  private telaDaConta(): string {
    return telaDaConta({
      estado: this.estado,
      status: this.sincronizador.status,
      usuario: this.sincronizador.usuario,
      servidorDisponivel: this.sincronizador.servidorDisponivel,
      modoDeAnimacao: this.modoDeAnimacao,
      modoSalvo: this.preferencias.animacoes,
      aviso: this.ui.aviso,
    });
  }

  desenhar(): void {
    const e = this.estado;
    const ui = this.ui;
    const comecou = e.tela !== "titulo";
    const emJornada = comecou && e.tela !== "derrota";
    this.el.perfil.hidden = !emJornada;
    this.el.perfil.innerHTML =
      `<span class="ico" aria-hidden="true">◆</span>${ui.perfil ? "Fechar perfil" : "Perfil"}` +
      (e.pontos && !ui.perfil ? `<span class="contador" aria-label="${e.pontos} pontos para distribuir">${e.pontos}</span>` : "");
    this.el.perfil.setAttribute("aria-expanded", String(ui.perfil));
    this.el.mochila.hidden = !emJornada;
    this.el.mochila.innerHTML = `<span class="ico" aria-hidden="true">⬡</span>${ui.mochila ? "Fechar mochila" : "Mochila"}`;
    this.el.mochila.setAttribute("aria-expanded", String(ui.mochila));
    this.el.conta.innerHTML = `<span class="ico" aria-hidden="true">⛁</span>${ui.conta ? "Fechar conta" : "Conta e save"}`;
    this.el.conta.setAttribute("aria-expanded", String(ui.conta));
    this.el.recomecar.hidden = !comecou;

    if (ui.conta) this.el.palco.innerHTML = this.telaDaConta();
    else if (ui.perfil) this.el.palco.innerHTML = telaDoPerfil(e, ui);
    else if (ui.mochila) this.el.palco.innerHTML = telaDaMochila(e, ui);
    else {
      const comRegistro = !["titulo", "vitoria", "derrota"].includes(e.tela);
      this.el.palco.innerHTML = (e.tela === "combate" ? telaDeCombate(e) : telaDeSala(e)) + (comRegistro ? registroDaJornada(e) : "");
    }
    this.el.palco.dataset.tela = ui.conta ? "conta" : ui.perfil ? "perfil" : ui.mochila ? "mochila" : e.tela;
    this.desenharLateral();
    this.revelar();

    if (this.focarDepois) {
      const seletor = ui.perfil
        ? '[role="tab"][aria-selected="true"]'
        : e.tela === "combate" && !ui.mochila && !ui.conta
          ? ".action-grid .action:not(:disabled)"
          : "h2";
      this.el.palco.querySelector<HTMLElement>(seletor)?.focus({ preventScroll: true });
      this.focarDepois = false;
    }
  }

  /** Revelação dourada (Lendária) ou rosa (Mítica) na primeira vez que a carta aparece. */
  private revelar(): void {
    if (this.modoDeAnimacao !== "completas") return;
    for (const item of this.el.palco.querySelectorAll<HTMLElement>(".discovery")) {
      const id = `${this.estado.andar}:${this.estado.tela}:${item.dataset.arg ?? ""}`;
      if (this.revelados.has(id)) continue;
      this.revelados.add(id);
      animacoesDeRevelacao[item.classList.contains("r4") ? "revelacao:mitica" : "revelacao:lendaria"]?.(item);
    }
  }
}
