import { inimigoDoAndar } from "../../dados/inimigos.ts";
import type { EstadoDaPartida } from "../../dominio/tipos.ts";
import { descreverStatus, type StatusDaSincronizacao } from "../../online/sincronizacao.ts";
import type { ModoDeAnimacao } from "../../salvamento/save.ts";
import { botao, esc } from "../html.ts";

function resumo(estado: EstadoDaPartida): string {
  if (estado.tela === "titulo") return "Sem jornada em andamento";
  const b = estado.batalha;
  const lugar =
    estado.tela === "combate" && b
      ? ` · contra ${inimigoDoAndar(estado.andar).nome}, turno ${b.turno}, ${b.pv} PV, inimigo com ${b.pvInimigo} PV`
      : "";
  return `Andar ${estado.andar} · nível ${estado.nivel} · ${estado.moedas} moedas · ${estado.itens.length} itens${lugar}`;
}

export interface DadosDaConta {
  estado: EstadoDaPartida;
  status: StatusDaSincronizacao;
  usuario: string | null;
  servidorDisponivel: boolean;
  modoDeAnimacao: ModoDeAnimacao;
  modoSalvo: ModoDeAnimacao | null;
  aviso: string | null;
}

export function telaDaConta(d: DadosDaConta): string {
  const { rotulo, classe } = descreverStatus(d.status, d.usuario);
  let conta: string;
  if (d.usuario) {
    conta =
      `<p>Conectado como <strong>${esc(d.usuario)}</strong>.</p>` +
      `<p class="status-save ${classe}">${esc(rotulo)}</p>` +
      `<div class="row-start">${botao("sincronizar", null, "Sincronizar agora")}${botao("sair-da-conta", null, "Sair da conta")}</div>`;
  } else if (!d.servidorDisponivel) {
    conta =
      `<p class="help">O servidor da conta não respondeu. O jogo continua salvando neste aparelho. ` +
      `Para jogar online, rode a API (veja o README) e recarregue a página.</p>` +
      `<div class="row-start">${botao("tentar-servidor", null, "Tentar de novo")}</div>`;
  } else {
    conta =
      `<form class="form-conta" data-form="conta" autocomplete="on">` +
      `<label>Usuário<input name="usuario" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.\\-]{3,32}"></label>` +
      `<label>Senha<input name="senha" type="password" autocomplete="current-password" required minlength="8" maxlength="200"></label>` +
      `<div class="row-start"><button class="button primary" type="submit" name="modo" value="entrar">Entrar</button>` +
      `<button class="button" type="submit" name="modo" value="cadastrar">Criar conta</button></div>` +
      `<p class="help">Usuário com 3 a 32 letras, números, ponto, hífen ou sublinhado. Senha com pelo menos 8 caracteres.</p></form>`;
  }
  let conflito = "";
  if (d.status.tipo === "conflito") {
    const remoto = d.status.remoto;
    conflito =
      `<section class="conflito-save"><h3>Escolha qual progresso manter</h3>` +
      `<div class="cards"><article class="card"><small>Neste aparelho</small><strong>${esc(resumo(d.estado))}</strong>${botao("manter-local", null, "Manter este", "button primary")}</article>` +
      `<article class="card"><small>Na conta (revisão ${remoto.revisao})</small><strong>${esc(resumo(remoto.estado))}</strong>` +
      `<small>${esc(remoto.atualizadoEm)}</small>${botao("usar-remoto", null, "Usar o da conta")}</article></div>` +
      `<p class="help">O progresso que você não escolher será substituído.</p></section>`;
  }
  const opcoes: [ModoDeAnimacao, string][] = [
    ["completas", "Completas"],
    ["reduzidas", "Reduzidas (sem movimento)"],
    ["desligadas", "Desligadas"],
  ];
  const animacoes =
    `<fieldset class="opcoes-animacao"><legend>Animações de combate</legend>` +
    opcoes
      .map(
        ([valor, texto]) =>
          `<label><input type="radio" name="animacoes" value="${valor}" data-acao="modo-animacao" data-arg="${valor}"${d.modoDeAnimacao === valor ? " checked" : ""}> ${texto}</label>`,
      )
      .join("") +
    (d.modoSalvo === null ? `<p class="help">Seguindo a preferência de movimento do sistema.</p>` : "") +
    `<p class="help">Durante uma animação, toque em <strong>Pular</strong> ou aperte Esc.</p></fieldset>`;
  return (
    `<div class="bag-head"><div class="eyebrow">Conta e save</div><div class="row"><h2 tabindex="-1">Seu progresso</h2>${botao("conta", null, "Voltar à jornada", "button secundario")}</div>` +
    `<p>${esc(resumo(d.estado))}</p></div>` +
    `<div class="bag-body painel-conta">` +
    (d.aviso ? `<p class="aviso" role="alert">${esc(d.aviso)}</p>` : "") +
    conflito +
    `<section><h3>Conta online</h3>${conta}</section>` +
    `<section><h3>Arquivo de save</h3><p class="help">Exporte para guardar uma cópia ou levar para outro navegador. ` +
    `A importação aceita saves desta versão e o save do jogo original.</p>` +
    `<div class="row-start">${botao("exportar", null, "Exportar save (.json)", "button", d.estado.tela === "titulo")}` +
    `<label class="button arquivo">Importar save<input type="file" accept="application/json,.json" data-importar hidden></label></div></section>` +
    `<section>${animacoes}</section>` +
    `</div>`
  );
}
