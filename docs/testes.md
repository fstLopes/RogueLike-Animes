# O que foi testado

Na expansão 2.1, `node --test tests/*.test.ts` executou 64 testes com êxito.
Além da equivalência com as regras dos andares antigos, a suíte cobre a
continuação do 10º andar, os treinos da Água e do Kamehameha, os 30 itens novos,
o registro de efeitos e uma jornada até derrotar Vegeta. A verificação visual
no navegador e o modo online requerem as dependências descritas no README.

Resultados da última execução, com o código desta entrega (59 testes unitários).

## Regras do jogo (`npm test`)

- **Equivalência com o jogo original**: o código do HTML original roda numa sandbox
  (`tests/referencia/jogo-original.js`). As duas versões recebem os mesmos comandos
  com a mesma semente aleatória, e o estado é comparado depois de cada comando:
  andar, nível, XP, moedas, itens, maestria, melhorias, equipamento, vida, energia,
  turno, combo, forma ativa, ofertas da sala e **o registro de combate linha a linha**.
  700 partidas, 29.255 comandos, todas as 22 habilidades e 10 das 14 formas
  exercitadas, 201 torres concluídas, nenhuma divergência.
- **Dano**: soco, arma com maestria e melhoria, sequência (+2 até +6), contra-ataque
  depois de defender, corte falhando contra o Buggy separado, redução de 25% na névoa do 10º andar.
- **Energia e fim de turno**: habilidade sem energia é recusada sem mudar nada,
  custo e recarga, teto de energia, ordem dos eventos (ação → inimigo → dano),
  defesa pela metade com guarda, barreira só no primeiro golpe, especial evitando
  a ação inimiga uma vez por luta, vitória (moedas, XP, golpe final) e derrota.
- **Transformações**: requisitos de maestria e nível dos Gears 2 a 5 e da Kurama,
  Super Saiyajin exigindo Ki Saiyajin, motivo de bloqueio, duração pela Resistência,
  uma forma por luta, término com evento de saída e defesa da forma.
- **Itens repetidos**: a mesma chave não entra duas vezes, ofertas nunca repetem
  nem trazem exclusivos, drop já obtido não é sorteado, compra repetida é recusada.
- **Recompensas com aleatoriedade controlada**: pesos somam 100 em todos os andares,
  sorteio forçado para Comum e Mítica, mesma semente gera a mesma oferta, Leopardo
  no evento do 2º andar, drop entregue com sorteio abaixo da chance.
- **Saves**: 240 saves reais do jogo original (gerados jogando a versão antiga)
  migram para o mesmo estado do motor novo; forma ativa migrada; save antigo
  encontrado no endereço antigo e preservado; exportar → importar devolve o mesmo
  estado; versão futura, JSON inválido, item inexistente e números negativos são recusados.
- **Animações**: toda ação e toda forma do catálogo apontam para uma animação,
  cada uma com sua própria sequência, sem entradas órfãs; toda intenção inimiga
  dos 10 andares tem animação.

## API (`npm run api:test`, 34 verificações)

Servidor PHP embutido com SQLite temporário e requisições HTTP reais: token CSRF
ausente ou errado (403), `Origin` de outro site (403), corpo que não é JSON (415),
validação de usuário e senha (422), cadastro com troca do id de sessão, nome
repetido (409), revisões 1 → 2, conflito com revisão antiga devolvendo o save atual
(409) sem sobrescrever, save inválido (422) e grande demais (413), preservação de
`{}` e `[]` no JSON, isolamento entre contas, logout, login, senha errada e usuário
inexistente com a mesma resposta (401), bloqueio após muitas tentativas (429),
405 e 404.

## Navegador (Chromium, `npm run test:navegador` e `npm run test:online`)

- As 66 ações do catálogo (2 básicas, 21 golpes, 22 habilidades, 4 especiais,
  3 consumíveis e 14 formas) tocam até o fim, desenham na tela e liberam a entrada,
  sem erro de JavaScript. Cada turno animado leva de 1,2 s a 3,3 s.
- Com captura de tela: **corte** (Wado Ichimonji e Dragon Slayer), **tiro**
  (pederneira), **poder** (Hiken e El Thor), **transformação com término** (Gear 2:
  entrada, 3 turnos ativa com vapor visível e arena parada, saída), silhuetas de
  seis formas, **golpe final** antes da tela de vitória.
- Três cliques seguidos numa habilidade resolvem um único turno (energia e dano uma vez).
- **Pular** encerra a sequência da Excalibur em cerca de 0,3 s e o turno fecha normalmente.
- Animações **desligadas**: turno resolvido em poucos milissegundos.
- `prefers-reduced-motion`: modo reduzido automático, nenhum deslocamento, turno concluído.
- Modo online com dois aparelhos na mesma conta: cadastro envia o progresso,
  cada jogada sincroniza, o segundo aparelho recebe o progresso, um aparelho
  desatualizado gera conflito em vez de sobrescrever, a escolha iguala os dois e,
  depois de sair da conta, o jogo segue salvando localmente.
- Layout conferido também em 390 px de largura.

## Redesign da interface

- **Fluxo pela interface** (`npm run test:fluxo`), em 360 px e 1440 px, só com cliques:
  iniciar a jornada, conferir os rótulos das ações e o registro abaixo delas,
  lutar até vencer, escolher a recompensa, abrir a ficha do item clicado, abrir
  Conta e save e exportar o save, foco visível pelo teclado e Recomeçar pedindo
  confirmação (cancelar não muda a partida).
- **Layout** (`npm run capturar-telas`) em 1440, 768 e 360 px nas telas de batalha,
  mochila (16 itens, incluindo nomes longos), ficha, perfil, vitória, derrota, loja,
  descanso, evento e conta: sem rolagem horizontal e sem botão ou título cortado.
- Os testes de animação, do modo online e da API foram rodados de novo com a nova
  interface e continuam passando.
- **Contraste** das cores de texto sobre os painéis: texto principal 15,7:1,
  secundário 9,4:1, terciário 5,7:1, botão dourado 11,5:1, violeta 7,0:1,
  vida 6,6:1, cura 10,5:1 e mítica 6,4:1 (o mínimo WCAG AA é 4,5:1).
- **Inventário de IDs**: os 90 IDs de `docs/inventario-ids-animaveis.json`
  apontam para animações existentes.

## Limites desta verificação

- As capturas foram feitas sem internet, então os títulos aparecem com a fonte
  condensada de reserva e não com a Barlow Condensed.

- O build e os testes de navegador foram rodados com um bundle do **esbuild** a
  partir dos mesmos arquivos-fonte, porque o ambiente usado não tinha acesso ao
  registro do npm para instalar o Vite. `npm run dev` e `npm run build` com Vite
  não foram executados aqui.
- A API foi testada com **SQLite**. As migrações e consultas de MySQL foram
  escritas para MySQL 8, mas não rodaram contra um servidor MySQL real.
  Para testar com MySQL: `DB_DRIVER=mysql DB_NOME=… DB_USUARIO=… DB_SENHA=… npm run api:test`
  (use um banco descartável).
