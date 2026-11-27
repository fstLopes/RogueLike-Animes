# Animações de combate

## Expansao 2.1

As novas ações estão em `src/animacoes/expansao.ts`. Elas usam os mesmos
eventos de impacto e a mesma opção de pular ou reduzir efeitos.

| Ação | ID do motor | Sequência visual |
|---|---|---|
| Roda d’Água | `habilidade:resp_agua` | Preparação de 160 ms, onda azul de 270 ms e anel no impacto. |
| Mar de Chamas | `habilidade:resp_chamas` | Preparação de 265 ms e arco laranja de 235 ms. |
| Estrondo e Relâmpago | `habilidade:resp_trovao` | Preparação de 95 ms, avanço e raio dourado. |
| Presas Duplas | `habilidade:resp_fera` | Preparação de 125 ms e duas marcas diagonais. |
| Dança da Borboleta | `habilidade:resp_inseto` | Preparação de 185 ms e feixe lilás. |
| Nuvens Obscuras | `habilidade:resp_nevoa` | Preparação de 215 ms e onda de névoa de 270 ms. |
| Redemoinho de Poeira | `habilidade:resp_vento` | Preparação de 135 ms e arco verde de 235 ms. |
| Serpentinita Bipolar | `habilidade:resp_pedra` | Preparação de 290 ms e quatro traços em tom de cobre. |
| Dança do Deus do Fogo | `habilidade:resp_sol` | Preparação de 310 ms e arco solar ampliado. |
| Lua Negra · Palácio Noturno | `habilidade:resp_lua` | Preparação de 240 ms e quatro cortes violetas descendentes. |
| Onda Kamehameha | `habilidade:db_kame` | Carga azul de 270 ms e feixe com impacto após 110 ms. |
| Canhão Galick | `habilidade:db_galick` | Carga violeta de 215 ms e feixe com impacto após 110 ms. |
| Disco Cortante | `habilidade:db_kienzan` | Carga de 170 ms e projétil giratório de 290 ms. |
| Canhão de Feixe Especial | `habilidade:db_makanko` | Carga de 330 ms, feixe rosa e raio secundário. |
| Explosão Big Bang | `habilidade:db_big_bang` | Carga de 240 ms e esfera azul com rastro. |
| Esfera do Espírito | `habilidade:db_genki` | Carga de 410 ms e esfera ampliada com rastro. |
| Clarão Final | `habilidade:db_final_flash` | Carga de 360 ms e feixe dourado largo. |
| Cápsula de Emergência | `consumivel:db_capsula` | Indicador de cura e anel verde junto ao herói. |
| Preparação de Kokushibo | `inimigo:15:preparacao` | Arco violeta no chefe, sem dano. |
| Corte Lunar de Kokushibo | `inimigo:15:pesado` | Onda lunar cruza a arena e termina em quatro cortes. |
| Preparação de Vegeta | `inimigo:20:preparacao` | Luz violeta concentra-se no chefe, sem dano. |
| Canhão Galick de Vegeta | `inimigo:20:pesado` | Feixe violeta com impacto após 140 ms. |

Os ataques normais dos novos inimigos reaproveitam as animações de ataque e
impacto já existentes. O inventário desta versão contém 130 IDs.

Cada ataque de arma, habilidade, especial, consumível e transformação tem uma
sequência própria. O registro fica em `src/animacoes/registro.ts`, indexado pelo
**id da ação ou da forma** definido no catálogo (`src/dados/catalogo.ts`).

## Como funciona

1. O motor (`src/motor/combate.ts`) resolve o turno e devolve o novo estado e a
   lista de eventos (`acaoDoJogador`, `danoNoInimigo`, `esquivaDoInimigo`,
   `acaoInimiga`, `danoNoJogador`, `formaAtivada`, `formaEncerrada`, `vitoria`…).
2. A interface salva o novo estado e chama `tocarTurno` (`src/animacoes/reprodutor.ts`).
3. O reprodutor busca a animação pelo `animacaoId` do evento e toca, na ordem:
   ação do jogador → (golpe final) → ação do inimigo ou esquiva → fim da forma → derrota.
4. Cada animação chama `impacto()` no instante do golpe. É aí que aparecem o
   número de dano, o "ESQUIVOU", "BLOQUEIO", "ABSORVEU", e que as barras mudam.
   Os números vêm do resultado do motor; a animação nunca calcula dano.
5. Ao terminar, a tela é redesenhada com o estado novo.

Enquanto a sequência toca, a interface ignora novos comandos (`Aplicacao.ocupado`),
então cliques repetidos não gastam energia nem aplicam dano duas vezes.
O botão **Pular** (ou Esc) chama `Diretor.pular()`, que encerra todas as animações
e esperas na hora. Em **Conta e save → Animações de combate** dá para escolher
completas, reduzidas (só opacidade, sem deslocamento) ou desligadas. Sem escolha
salva, o jogo segue o `prefers-reduced-motion` do sistema.

## Peças reutilizáveis

`src/animacoes/efeitos.ts`: `luz`, `clarao`, `particulas` (faísca, brasa, floco,
fumaça, estilhaço, folha, bolha, pena), `rastro`, `arco` (lâmina em SVG),
`projetil` (parábola, giro, orientação e rastros), `onda`, `raio`, `feixe`,
`esticar` (braço elástico), `circulo` (círculo mágico), `anel` (onda de choque),
`marcas` (garras), `tremor`, `mover`, `reacaoDoInimigo`, `reacaoDoHeroi`,
`fantasmaDoHeroi`, `ceu`, `numero` e `rotulo`.

Os construtores `corte()` e `tiro()` em `golpes.ts` montam a estrutura comum
(preparação, avanço ou disparo, trajetória e impacto); cada golpe passa seus
próprios tempos, raios, cores, peso e partículas.

## Adicionar um item novo

1. Crie o item em `src/dados/catalogo.ts` com ids únicos (`golpe:…`,
   `habilidade:…`, `especial:…`, `forma:…`).
2. Registre a animação em `golpes.ts`, `inimigos.ts` (especiais) ou `formas.ts`.
   Para formas, adicione também o visual ativo em `src/estilos/formas.css`
   e, se precisar, uma camada nova em `src/interface/heroi.ts`.
3. Rode `npm test`. O teste `tests/animacoes.test.ts` falha se alguma ação ficar
   sem animação, se duas ações dividirem a mesma sequência ou se houver entradas órfãs.

## IDs do inventário proposto

`docs/inventario-ids-animaveis.json` propõe outros nomes de ID (por exemplo
`weapon.wado.basic` e `form.gum.gear_2`). O projeto mantém os IDs atuais, porque o
save guarda o id da forma ativa. A ponte fica em `src/animacoes/inventario-ids.ts`:
`resolverIdDoInventario("form.gum.gear_2")` devolve `forma:gear-2`. A tabela é
montada a partir do catálogo, e `tests/inventario-ids.test.ts` confere que os 90 IDs
apontam para animações existentes.

Os IDs `enemy.*` usam as animações por intenção (ataque, golpe pesado, corpo
separado, névoa e emboscada), como o próprio inventário prevê. As revelações
`loot.legendary.reveal` e `loot.mythic.reveal` estão em `src/animacoes/revelacoes.ts`.

## Sobre o Senbon e as rajadas

A regra atual aplica **um acerto** por ataque. O Senbon mostra uma agulha com três
rastros finos atrás dela, e o Ora Ora! mostra vários socos, mas o número de dano
aparece uma vez só, como na regra.

## Ações básicas

| Id da animação | Ação | Item | Sequência |
|---|---|---|---|
| `basico:soco` | Soco | — | Golpe curto: pequeno avanço, traço e anel de impacto. |
| `basico:defender` | Defender | — | Postura baixa com escudo de energia azul diante do herói. |

## Ataques de arma

| Id da animação | Ação | Item | Sequência |
|---|---|---|---|
| `golpe:marine` | Sabre da Marinha | Sabre da Marinha | Sabre comum: um arco médio descendente. |
| `golpe:dagger` | Adaga pirata | Adaga pirata | Adaga: dois talhos curtos e rápidos, bem de perto. |
| `golpe:pistol` | Pistola de pederneira | Pistola de pederneira | Pistola de pederneira: mira, clarão, recuo, fumaça e bala rápida. |
| `golpe:kunai` | Kunai | Kunai | Kunai: arremesso em parábola, girando no voo. |
| `golpe:senbon` | Senbon | Senbon | Senbon: uma agulha fina e rápida com uma sequência de rastros (um acerto, como na regra). |
| `golpe:zabuza` | Kubikiribōchō | Kubikiribōchō | Kubikiribōchō: preparação longa, arco enorme e pesado. |
| `golpe:wado` | Wado Ichimonji | Wado Ichimonji | Wado Ichimonji: postura parada, passada limpa através do alvo e um traço fino e preciso que só aparece depois, seguido do impacto. |
| `golpe:nichirin` | Nichirin | Nichirin | Nichirin: arco amplo e ondulado, com gotas. |
| `golpe:gloves` | Luvas de Roy Mustang | Luvas de Roy Mustang | Luvas de Roy Mustang: estalo nos dedos e explosão direto no alvo (sem viagem). |
| `golpe:dragon` | Dragon Slayer | Dragon Slayer | Dragon Slayer: o golpe mais pesado — ergue, pausa, arco largo e impacto que sacode tudo. |
| `golpe:zange` | Zangetsu | Zangetsu | Zangetsu: corte diagonal largo, preto com borda vermelha. |
| `golpe:saber` | Excalibur da Saber | Excalibur da Saber | Excalibur da Saber: arco dourado com luz no fio. |
| `golpe:rukia` | Sode no Shirayuki | Sode no Shirayuki | Sode no Shirayuki: corte branco que deixa flocos de gelo. |
| `golpe:elucidator` | Elucidator | Elucidator | Elucidator: corte em X, lâmina negra. |
| `golpe:lostvayne` | Lostvayne | Lostvayne | Lostvayne: clones atacam juntos, três arcos defasados. |
| `golpe:gaebolg` | Gáe Bolg | Gáe Bolg | Gáe Bolg: estocada reta e perfurante. |
| `golpe:umbrella` | Umbreaker | Umbreaker | Umbreaker: guarda-chuva em swing de baixo para cima, impacto com quique. |
| `golpe:playful` | Nuvem Brincalhona | Nuvem Brincalhona | Nuvem Brincalhona: três batidas encadeadas das seções do bastão. |
| `golpe:frieren` | Cajado de Frieren | Cajado de Frieren | Cajado de Frieren: pequena esfera mágica em linha reta. |
| `golpe:disk` | Disco de Duelo | Disco de Duelo | Disco de Duelo: carta holográfica girando até o alvo. |
| `golpe:shield` | Escudo de Leônidas | Escudo de Leônidas | Escudo de Leônidas: avanço com o escudo e onda de choque frontal. |

## Habilidades de poder (e de armas na maestria II)

| Id da animação | Ação | Item | Sequência |
|---|---|---|---|
| `habilidade:mao-separada` | Mão Separada | Bara Bara no Mi | Mão Separada: a mão se solta, gira em arco e volta. |
| `habilidade:shishi-sonson` | Shishi Sonson | Wado Ichimonji | Shishi Sonson: passa pelo inimigo num piscar; o corte surge depois, com atraso. |
| `habilidade:ignicao` | Ignição | Luvas de Roy Mustang | Ignição: estalo maior e uma linha de explosões até o alvo. |
| `habilidade:getsuga-tensho` | Getsuga Tenshō | Zangetsu | Getsuga Tenshō: a energia da lâmina sai como uma onda que atravessa a arena. |
| `habilidade:excalibur` | Excalibur | Excalibur da Saber | Excalibur: carga longa de luz e um feixe dourado enorme. |
| `habilidade:ora-ora` | Ora Ora! | Star Platinum | Ora Ora!: rajada de socos rápidos (vários impactos visuais, um só dano). |
| `habilidade:rajada-de-ki` | Rajada de Ki | Ki Saiyajin | Rajada de Ki: esfera carregada nas mãos e disparada como feixe curto. |
| `habilidade:erga-se` | Erga-se | Poder do Monarca das Sombras | Erga-se: a sombra do último inimigo derrotado sobe do chão e ataca. |
| `habilidade:gomu-gomu-no-pistol` | Gomu Gomu no Pistol | Fruta do Luffy | Gomu Gomu no Pistol: o braço estica até o alvo, acerta e volta. |
| `habilidade:rajada-da-kurama` | Rajada da Kurama | Chakra da Kurama | Rajada da Kurama: bola de chakra laranja que cresce e explode. |
| `habilidade:corte-de-antimagia` | Corte de Antimagia | Grimório de Cinco Folhas | Corte de Antimagia: lâmina negra que rasga e apaga a luz ao redor. |
| `habilidade:hiken` | Hiken | Mera Mera no Mi | Hiken: chamas se concentram no punho e saem como um punho de fogo que explode no alvo. |
| `habilidade:ice-saber` | Ice Saber | Hie Hie no Mi | Ice Saber: espada de gelo varre de baixo para cima e congela o ponto atingido. |
| `habilidade:el-thor` | El Thor | Goro Goro no Mi | El Thor: o céu escurece e se ilumina antes de o raio cair sobre o alvo. |
| `habilidade:investida-do-leopardo` | Investida do Leopardo | Neko Neko no Mi, Modelo Leopardo | Investida do Leopardo: deslocamento em alta velocidade e rastros de garras. |
| `habilidade:tsugi-no-mai` | Tsugi no Mai | Sode no Shirayuki | Tsugi no Mai: círculo de gelo no chão do alvo e uma coluna que sobe. |
| `habilidade:arremesso-carmesim` | Arremesso Carmesim | Gáe Bolg | Arremesso Carmesim: lança vermelha em curva alta que mergulha no alvo. |
| `habilidade:transmutacao-amplificada` | Transmutação Amplificada | Pedra Filosofal | Transmutação Amplificada: círculo alquímico e espinhos de pedra subindo sob o alvo. |
| `habilidade:zoltraak` | Zoltraak | Cajado de Frieren | Zoltraak: círculo mágico à frente da mão e um feixe fino e direto. |
| `habilidade:corte-de-corrente` | Corte de Corrente | Coração do Pochita | Corte de Corrente: motosserra em contato — faíscas contínuas e vários traços curtos. |
| `habilidade:telecinese` | Telecinese | Poder Psíquico de Mob | Telecinese: distorção roxa ergue o inimigo e o arremessa para baixo. |
| `habilidade:investida-rinkaku` | Investida Rinkaku | Kakuhō de Rize | Investida Rinkaku: tentáculos vermelhos chicoteiam em sequência. |

## Especiais de esquiva (ativação)

| Id da animação | Ação | Item | Sequência |
|---|---|---|---|
| `especial:esquiva-fragmentada` | Esquiva Fragmentada | Bara Bara no Mi | O golpe passa entre as partes separadas do corpo. |
| `especial:visao-do-futuro` | Visão do Futuro | Haki da Observação | O herói se move antes do golpe; o ataque acerta a pós-imagem. |
| `especial:parada-temporal` | Parada Temporal | Star Platinum | O inimigo congela no meio do ataque enquanto o tempo está parado. |
| `especial:corpo-de-gelo` | Corpo de Gelo | Hie Hie no Mi | O golpe acerta o gelo e se estilhaça; o herói fica intacto. |

## Consumíveis

| Id da animação | Ação | Item | Sequência |
|---|---|---|---|
| `consumivel:pill` | Pílula de Soldado | Pílula de Soldado | Cápsula cai até o herói; brilho verde e pontos de luz subindo. |
| `consumivel:senzu` | Semente dos Deuses | Semente dos Deuses | Cura forte: brilho maior, muitas folhas e um anel de energia. |
| `consumivel:ration` | Ração de emergência da Tropa | Ração de emergência da Tropa | Cura leve: brilho quente e poucas folhas. |

## Transformações

Cada forma tem entrada (animação), visual ativo (CSS em `src/estilos/formas.css`, visível mesmo com a arena parada) e saída.

| Id da forma | Forma | Item | Requisito | Entrada e visual ativo |
|---|---|---|---|---|
| `forma:super-saiyajin` | Super Saiyajin | Super Saiyajin | maestria 0, nível 1 | Super Saiyajin: grito, aura dourada em picos, faíscas e cabelo dourado. |
| `forma:gear-2` | Gear 2 | Fruta do Luffy | maestria 1, nível 2 | Gear 2: agacha, bombeia o corpo duas vezes e solta vapor; a pele fica rosada. |
| `forma:gear-3` | Gear 3 | Fruta do Luffy | maestria 2, nível 3 | Gear 3: o polegar infla o braço até um punho gigante. |
| `forma:gear-4` | Gear 4 | Fruta do Luffy | maestria 3, nível 4 | Gear 4: o corpo infla, ganha marcas escuras e começa a quicar. |
| `forma:gear-5` | Gear 5 | Fruta do Luffy | maestria 3, nível 6 | Gear 5: clarão branco, nuvens, batidas rítmicas e um corpo elástico de desenho animado. |
| `forma:manto-da-kurama` | Manto da Kurama | Chakra da Kurama | maestria 2, nível 2 | Manto da Kurama: bolhas de chakra sobem, o contorno de chamas e as caudas aparecem. |
| `forma:modo-chakra-da-kurama` | Modo Chakra da Kurama | Chakra da Kurama | maestria 3, nível 5 | Modo Chakra: explosão dourada, marcas no corpo e muitas caudas. |
| `forma:black-asta` | Black Asta | Grimório de Cinco Folhas | maestria 2, nível 3 | Black Asta: partículas negras convergem e uma asa rasga as costas. |
| `forma:amaru` | Amaru | Goro Goro no Mi | maestria 2, nível 3 | Amaru: anel de tambores aparece e o corpo cresce entre relâmpagos. |
| `forma:leopardo-hibrido` | Leopardo Híbrido | Neko Neko no Mi, Modelo Leopardo | maestria 0, nível 1 | Leopardo Híbrido: agacha como felino, surgem orelhas, manchas e garras. |
| `forma:forma-motosserra` | Forma Motosserra | Coração do Pochita | maestria 0, nível 1 | Forma Motosserra: puxa a corda, as lâminas saem com faíscas e vibram. |
| `forma:explosao-de-100` | Explosão de 100% | Poder Psíquico de Mob | maestria 2, nível 3 | Explosão de 100%: contador sobe, a aura gira e o cabelo se ergue. |
| `forma:kagune-rinkaku` | Kagune Rinkaku | Kakuhō de Rize | maestria 0, nível 1 | Kagune Rinkaku: tentáculos vermelhos irrompem das costas. |
| `forma:modo-sabio` | Modo Sábio | Modo Sábio dos Sapos | maestria 0, nível 1 | Modo Sábio: energia da natureza entra devagar; olhos com pigmento laranja. |

## Inimigos, esquivas e reações

| Id | Quando | Sequência |
|---|---|---|
| `inimigo:ataque` | Ataque comum (turnos 1 e 2 do ciclo) | Ataque comum: o inimigo avança e corta. |
| `inimigo:buggy-ataque` | Ataque comum no 5º andar | Bando de Buggy: facas arremessadas. |
| `inimigo:pesado` | Golpe pesado (turno 3 do ciclo) | Golpe pesado: brilho vermelho de carga e uma pancada que sacode a arena. |
| `inimigo:corpo-separado` | Buggy, turno 2 do ciclo (cortes falham) | Buggy separa o corpo: pedaços voam por trajetórias diferentes. |
| `inimigo:nevoa` | Zabuza, turno 2 do ciclo (sem dano) | Zabuza cria névoa: não causa dano neste turno. |
| `inimigo:emboscada` | Zabuza, turno 3 do ciclo | Emboscada: Zabuza some e reaparece atrás do herói. |

## Sprites que deixariam as animações mais elaboradas

As animações usam a arte existente (ícones dos itens, símbolos dos inimigos) e uma
silhueta vetorial do herói com camadas de efeito. Para uma versão mais rica, estes
sprites ajudariam (folhas com 4 a 8 quadros, fundo transparente):

- **Herói**: parado, preparação, avanço, golpe com arma, disparo, defesa, dano e queda.
- **Inimigos** (10): parado, ataque, golpe pesado, dano e derrota. Buggy: corpo
  separado em partes. Zabuza: sumindo na névoa e reaparecendo.
- **Transformações** (14): silhueta própria de cada forma (Gears 2–5, Manto e Modo
  Chakra da Kurama, Super Saiyajin, Black Asta, Amaru, Leopardo, Motosserra,
  100%, Kagune, Modo Sábio), com quadros de entrada e de saída.
- **Armas**: lâmina de cada espada para o arco do corte (Wado, Nichirin,
  Kubikiribōchō, Dragon Slayer, Zangetsu, Excalibur, Sode no Shirayuki,
  Elucidator, Lostvayne), ponta da Gáe Bolg e projéteis (kunai, senbon, bala,
  carta do Disco de Duelo).
- **Efeitos**: punho de fogo do Hiken, onda do Getsuga Tenshō, raio do El Thor,
  sombra do Monarca, coluna de gelo do Tsugi no Mai e espinhos da transmutação.
