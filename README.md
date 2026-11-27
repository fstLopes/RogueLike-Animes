# Torre do Eclipse

Roguelike de navegador com combate por turnos: 20 andares, quatro chefes, rotas,
eventos, lojas, descanso, maestria de itens, transformações e 86 itens.

## Expansão v2.1

- **11–15 · Castelo Infinito:** capítulo de Demon Slayer com Kokushibo como chefe.
- **16–20 · Arena do Ki:** capítulo de Dragon Ball com Vegeta como chefe.
- São 30 itens novos, incluindo dez Respirações. Equipe cada Respiração no slot
  **Poder** para usar seu golpe. Técnicas como Kamehameha, Kienzan e Genki Dama
  também ocupam esse slot.
- O evento do 12º andar oferece a Respiração da Água e o do 17º, Kamehameha, se
  ainda não foram obtidos. Kokushibo deixa a Respiração da Lua.
- Um save já concluído no 10º andar pode entrar na expansão pelo botão
  **Continuar no andar 11**.
- Consulte [as fichas da expansão](docs/animacoes.md#expansao-21).

A versão 2 reescreve o jogo original (um único arquivo HTML) em **Vite + TypeScript**
com as mesmas regras, adiciona uma **animação própria para cada ataque e
transformação** e uma **API PHP + MySQL** opcional para contas e saves online.

- O jogo funciona sem servidor: o progresso é salvo no navegador.
- Com a API rodando, dá para criar uma conta e sincronizar o save entre aparelhos.
- As regras foram verificadas contra o jogo original (veja [Testes](#testes)).

## Requisitos

| Para | Precisa de |
|---|---|
| Jogar e desenvolver | Node.js 22 ou mais novo e npm |
| Modo online | PHP 8.2+ com `pdo_mysql` e MySQL 8 (ou MariaDB 10.6+) |
| Modo online sem MySQL (desenvolvimento) | PHP 8.2+ com `pdo_sqlite` |
| Testes no navegador | `npx playwright install chromium` |

## Rodar localmente (sem servidor)

```bash
npm install
npm run dev
```

Abra http://localhost:5173. O jogo salva em `localStorage`; o painel **Save** mostra
"Salvo neste aparelho · modo offline" quando a API não está rodando.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento do Vite (porta 5173), com proxy de `/api` para a porta 8080 |
| `npm run typecheck` | Verifica os tipos (TypeScript em modo `strict`) |
| `npm test` | Testes de regras, saves, recompensas, formas e cobertura das animações |
| `npm run verificar` | Tipos + testes |
| `npm run build` | Verifica tipos e gera `dist/` |
| `npm run preview` | Serve `dist/` em http://localhost:4173 |
| `npm run api:migrar` | Cria ou atualiza as tabelas do banco |
| `npm run api` | API PHP em http://localhost:8080 |
| `npm run api:test` | Teste de integração da API (usa SQLite temporário) |
| `npm run servir:completo` | Serve `dist/` e a API juntos em http://localhost:8080 (como em produção) |
| `npm run test:navegador` | Testa todas as animações no Chromium (precisa do `preview` rodando) |
| `npm run test:online` | Testa conta, sincronização e conflito entre dois aparelhos (precisa do `servir:completo`) |
| `npm run test:fluxo` | Joga pela interface em 360 px e 1440 px: jornada, luta, recompensa, ficha do item, save e Recomeçar |
| `npm run capturar-telas -- <pasta> 1440,768,360` | Captura as telas principais e aponta rolagem horizontal ou botões cortados |

## Modo online

### 1. Banco MySQL

```sql
CREATE DATABASE torre_do_eclipse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'torre_app'@'localhost' IDENTIFIED BY 'uma-senha-forte';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON torre_do_eclipse.* TO 'torre_app'@'localhost';
```

### 2. Configuração

```bash
cp server/.env.example server/.env
# edite DB_USUARIO, DB_SENHA e, se preciso, DB_HOST e DB_PORTA
npm run api:migrar
```

Sem MySQL instalado, use SQLite para desenvolver: no `server/.env`, troque para
`DB_DRIVER=sqlite` e `DB_ARQUIVO=server/dados/torre.sqlite`.

Se o PHP não conseguir gravar sessões na pasta padrão, defina `SESSAO_PASTA` no `.env`.

### 3. Rodar

Em dois terminais:

```bash
npm run api   # API em :8080
npm run dev   # jogo em :5173; /api vai para :8080 pelo proxy do Vite
```

No jogo, abra **Conta e save**, crie uma conta e jogue. O painel **Save** mostra:

- **Salvo neste aparelho**: sem conta (ou servidor fora do ar). O jogo continua normal.
- **Salvo localmente · aguardando envio** / **Sincronizando…**: há mudanças a enviar.
- **Sincronizado com a conta**: o servidor tem o mesmo progresso.
- **Conflito entre aparelhos**: outro aparelho salvou um progresso mais novo. O jogo
  mostra os dois e você escolhe qual manter.

Para apontar o proxy para outra porta, defina `API_PROXY_TARGET` (ex.: `API_PROXY_TARGET=http://localhost:9000 npm run dev`).
Se a API ficar em outro caminho do mesmo domínio (por exemplo `/jogo/api`), defina `VITE_API_URL` antes do build. A API não aceita outro domínio: a sessão depende de cookie na mesma origem.

### Produção

1. `npm run build` gera `dist/`.
2. Sirva `dist/` e `server/public/` no **mesmo domínio**, encaminhando `/api/*` para
   `server/public/index.php`. Exemplo com nginx:

   ```nginx
   root /var/www/torre/dist;
   location / { try_files $uri /index.html; }
   location /api/ {
     include fastcgi_params;
     fastcgi_param SCRIPT_FILENAME /var/www/torre/server/public/index.php;
     fastcgi_pass unix:/run/php/php8.3-fpm.sock;
   }
   ```

3. No `server/.env`: `APP_AMBIENTE=producao` e `SESSAO_SEGURA=true` (exige HTTPS).

### API

| Rota | Descrição |
|---|---|
| `GET /api/session` | Diz se há conta conectada e devolve o token CSRF |
| `POST /api/register` | `{ usuario, senha }` · cria a conta e entra |
| `POST /api/login` | `{ usuario, senha }` |
| `POST /api/logout` | Encerra a sessão |
| `GET /api/save` | `{ save: null }` ou `{ save: { revisao, dados, atualizado_em } }` |
| `PUT /api/save` | `{ revisao_base, dados }` · grava só se `revisao_base` for a revisão atual; senão responde 409 com o save atual |

Segurança: PDO com consultas parametrizadas, `password_hash()` / `password_verify()`,
sessão em cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` em produção), id de sessão
trocado no login, token CSRF no cabeçalho `X-CSRF-Token` em toda escrita, checagem
de `Origin`, validação de entrada no servidor, limite de tentativas de login e
limite de tamanho do save. O id da conta vem sempre da sessão, nunca do pedido,
então cada conta só acessa o próprio save.

### Por que não há ranking

O servidor guarda o save, mas não joga a partida: o resultado é calculado no
navegador e pode ser editado. Um ranking competitivo exigiria rodar o motor de
combate no servidor (receber as ações, não o estado) para validar cada partida.
O motor já é isolado do DOM (`src/motor/`), o que facilita esse passo no futuro.

## Saves

- O save fica em `localStorage["torre-do-eclipse:save"]` no formato versionado
  `{ formato: "torre-do-eclipse", versao: 2, salvoEm, estado }`.
- **Conta e save → Exportar save** baixa um `.json`; **Importar save** aceita esse
  arquivo e também o save do jogo original.
- Todo save carregado, importado ou vindo do servidor é migrado e validado
  (`src/salvamento/`); um arquivo inválido é recusado sem quebrar o jogo.

### Trazer o save da versão antiga

O jogo original gravava em `localStorage["torre-do-eclipse-1"]`. Se a versão nova
for aberta **no mesmo endereço** em que você jogava a antiga, o save é encontrado,
migrado e mantido (o antigo não é apagado).

Normalmente a versão antiga era aberta direto do disco (`file://…/Torre_do_Eclipse.html`)
e a nova roda em outro endereço (`http://localhost:5173`). Cada endereço tem o
próprio `localStorage`, então é preciso exportar:

1. Abra o `Torre_do_Eclipse.html` antigo **no mesmo navegador** em que você jogava.
2. Abra o console (F12 → Console), cole e aperte Enter:

   ```js
   (() => {
     const dados = localStorage.getItem("torre-do-eclipse-1");
     if (!dados) return console.log("Nenhum save encontrado neste endereço.");
     const link = document.createElement("a");
     link.href = URL.createObjectURL(new Blob([dados], { type: "application/json" }));
     link.download = "torre-do-eclipse-save-antigo.json";
     link.click();
   })();
   ```

3. No jogo novo, abra **Conta e save → Importar save** e escolha o arquivo baixado.

## Estrutura

```
torre-do-eclipse/
├── index.html                  marcação da página
├── package.json · vite.config.ts
├── tsconfig.json               tipos do jogo e dos testes (tsconfig.navegador.json: testes de navegador)
├── src/
│   ├── main.ts                 ponto de entrada
│   ├── dominio/tipos.ts        Item, Inimigo, AcaoDeCombate, ResultadoDoTurno, EstadoDaPartida…
│   ├── dados/                  catálogo (86 itens), inimigos, andares e textos, recorte dos ícones
│   ├── motor/                  regras sem DOM
│   │   ├── combate.ts          turnos, dano, energia, formas, vitória e derrota → eventos
│   │   ├── jornada.ts          salas, rotas, loja, evento, descanso e despachante de comandos
│   │   ├── inventario.ts · equipamentos.ts · progressao.ts · recompensas.ts · consultas.ts
│   │   └── aleatorio.ts        sorteio do navegador e gerador com semente (testes)
│   ├── salvamento/             save.ts (único acesso ao localStorage), migrações e validação
│   ├── online/                 cliente da API e sincronização com revisões
│   ├── interface/              controlador, telas, silhueta do herói e utilitários de HTML
│   ├── animacoes/              registro por id, reprodutor, golpes, formas, inimigos e efeitos
│   ├── estilos/                tema (cores e fontes), layout, combate, salas, mochila, itens, animações, formas e conta
│   └── assets/
│       ├── atlas/              as 4 folhas de sprites extraídas do HTML original
│       └── itens/              ícone individual de cada item (arte-fonte das folhas)
├── server/
│   ├── public/index.php        entrada da API
│   ├── src/                    Api, Sessao, Contas, Saves, Validacao, Banco, Http, Configuracao
│   ├── migrations/mysql/       migrações do MySQL (e sqlite/ para desenvolvimento e testes)
│   ├── bin/migrar.php          aplica migrações pendentes
│   ├── tests/executar.php      teste de integração da API
│   └── .env.example
├── tests/                      testes do motor, saves, formas, itens e animações
│   ├── navegador/              testes no Chromium (animações e modo online)
│   └── referencia/             código do jogo original, usado no teste de equivalência
└── docs/
    ├── animacoes.md            inventário de todas as animações e sprites sugeridos
    ├── testes.md               o que foi testado
    └── capturas/               capturas tiradas nos testes
```

## Interface

Tema "Eclipse": base preto-azulada, violeta para energia e magia, dourado para
ações principais e conquistas. Todas as cores ficam em variáveis no início de
`src/estilos/tema.css`:

| Variável | Uso | Cor |
|---|---|---|
| `--fundo` | Fundo geral | `#0B0E18` |
| `--painel`, `--painel-2` | Painéis e superfícies elevadas | `#141929`, `#1C2236` |
| `--borda` | Bordas e divisórias | `#303850` |
| `--texto`, `--texto-2` | Texto principal e secundário | `#F4F1FF`, `#B7BDD4` |
| `--ouro` | Ações principais e XP | `#FFC779` |
| `--magia` | Energia e magia | `#A995FF` |
| `--vida` | Vida e dano recebido | `#FF727E` |
| `--cura` | Cura e sucesso | `#68DDB3` |
| `--r-comum` … `--r-mitica` | Raridades (Lendária dourada, Mítica magenta) | |

Títulos usam **Barlow Condensed** e o restante usa **Inter**, carregadas do Google
Fonts no `index.html`. Sem internet, o jogo usa fontes condensadas do sistema.

Comparações de antes e depois e capturas em 360 px e 768 px estão em `docs/redesign/`.

## Arquitetura

```
clique → Aplicacao.comandar(comando)
           │
           ├─ motor/executarComando(estado, comando, aleatorio)   (puro, sem DOM)
           │     └─ { aceito, estado novo, eventos do turno }
           ├─ save.ts salva o estado novo  →  sincronização (se houver conta)
           ├─ animacoes/tocarTurno(eventos)  (entrada bloqueada até terminar ou pular)
           └─ redesenha a tela com o estado novo
```

Para expandir:

- **Item novo**: entrada em `src/dados/catalogo.ts` + animação em `src/animacoes/`
  (veja `docs/animacoes.md`). Os testes avisam se faltar animação.
- **Inimigo ou andar novo**: `src/dados/inimigos.ts` e `src/dados/andares.ts`.
- **Mudança no formato do save**: aumente `VERSAO_ATUAL` e adicione a migração em
  `src/salvamento/migracoes.ts`.

## Testes

Veja o resumo em [`docs/testes.md`](docs/testes.md).

```bash
npm run verificar           # tipos + 59 testes
npm run api:test            # 34 verificações da API
npm run build && npm run preview          # e, em outro terminal:
npm run test:navegador      # 66 animações + 10 cenários no Chromium
```
