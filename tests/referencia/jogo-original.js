"use strict";
const rarities = ["Comum","Rara","Épica","Lendária","Mítica"];
const slots = {head:"Cabeça",body:"Tronco",legs:"Calça",feet:"Pés",weapon:"Arma",power:"Poder",passive:"Passivas",consumable:"Consumível"};
const gearSlots = ["head","body","legs","feet","weapon","power","passive"];
const catalog = {
  vest:["Colete de Chūnin","Naruto","body",0,"+3 de defesa. Bônus de 2 de defesa quando estiver defendendo.",{def:3,guard:2}],
  pants:["Calça da Tropa de Exploração","Attack on Titan","legs",0,"+2 de defesa.",{def:2}],
  boots:["Botas do traje do Deku","My Hero Academia","feet",0,"+3 de ataque.",{atk:3}],
  marine:["Sabre da Marinha","One Piece","weapon",0,"Corte de 14 de dano.",{hit:14,type:"cut"}],
  dagger:["Adaga pirata","One Piece","weapon",0,"Corte rápido de 13 de dano.",{hit:13,type:"cut"}],
  pistol:["Pistola de pederneira","One Piece","weapon",1,"Disparo de 18 de dano, eficaz contra Buggy.",{hit:18,type:"shot"}],
  deck:["Botas de convés","One Piece","feet",0,"+6 de Resistência.",{res:6}],
  kunai:["Kunai","Naruto","weapon",0,"Arremesso de 15 de dano.",{hit:15,type:"shot"}],
  mist:["Máscara da Névoa","Naruto","head",1,"+4 de defesa e +6 de Resistência.",{def:4,res:6}],
  senbon:["Senbon","Naruto","weapon",1,"Arremesso de 19 de dano.",{hit:19,type:"shot"}],
  plate:["Peitoral da Névoa","Naruto","body",1,"+6 de defesa.",{def:6}],
  zabuza:["Kubikiribōchō","Naruto","weapon",3,"Corte pesado de 30 de dano.",{hit:30,type:"cut"}],
  buggy:["Bara Bara no Mi","One Piece","power",2,"Dispara a mão separada e, com maestria, permite esquivar de um golpe.",{skill:["Mão Separada",6,25,"shot"],unlock:["Esquiva Fragmentada",7,"veil"]}],
  wado:["Wado Ichimonji","One Piece","weapon",1,"Corte de 19 de dano. Libera Shishi Sonson na maestria II.",{hit:19,type:"cut",skill:["Shishi Sonson",8,31,"cut"]}],
  haki:["Haki da Observação","One Piece","passive",2,"Prever o golpe ao defender recupera energia. Libera Visão do Futuro na maestria II.",{read:true,unlock:["Visão do Futuro",6,"veil"]}],
  mask:["Máscara do Kaneki","Tokyo Ghoul","head",1,"+3 de defesa e reduz em até 8 o primeiro dano recebido na luta.",{def:3,ward:8}],
  nichirin:["Nichirin","Demon Slayer","weapon",1,"Corte de 17 de dano. Acertos consecutivos acumulam dano, até +6.",{hit:17,type:"cut",chain:true}],
  gloves:["Luvas de Roy Mustang","Fullmetal Alchemist","weapon",1,"Estalo de fogo de 16 de dano. Libera Ignição na maestria II.",{hit:16,type:"fire",skill:["Ignição",7,25,"fire"]}],
  ten:["Ten","Hunter × Hunter","passive",1,"Absorve até 7 de dano no primeiro golpe recebido. A maestria melhora a proteção.",{ward:7}],
  dragon:["Dragon Slayer","Berserk","weapon",2,"Corte de 23 de dano. Ganha +8 de dano após defender.",{hit:23,type:"cut",counter:8}],
  zange:["Zangetsu","Bleach","weapon",2,"Corte de 22 de dano. Libera Getsuga Tenshō na maestria II.",{hit:22,type:"cut",skill:["Getsuga Tenshō",9,37,"energy"]}],
  saber:["Excalibur da Saber","Fate","weapon",3,"Corte de 27 de dano. Libera o golpe Excalibur na maestria II.",{hit:27,type:"cut",skill:["Excalibur",15,56,"energy"]}],
  star:["Star Platinum","JoJo’s Bizarre Adventure","power",3,"Sequência de socos. Libera Parada Temporal na maestria II, uma vez por luta.",{skill:["Ora Ora!",7,31,"impact"],unlock:["Parada Temporal",12,"stop"]}],
  ki:["Ki Saiyajin","Dragon Ball","power",2,"Dispara uma rajada de ki. Permite ativar Super Saiyajin se a transformação estiver equipada.",{skill:["Rajada de Ki",6,27,"energy"]}],
  super:["Super Saiyajin","Dragon Ball","passive",3,"Exige Ki Saiyajin equipado. A transformação dá +13 de ataque.",{require:"ki",form:["Super Saiyajin",12,13,0],res:8}],
  shadow:["Poder do Monarca das Sombras","Solo Leveling","power",4,"Permite usar a sombra do último adversário derrotado como ataque de apoio.",{skill:["Erga-se",8,40,"shadow"],res:10}],
  gum:["Fruta do Luffy","One Piece","power",4,"Libera golpes elásticos e os Gears 2 a 5 conforme a maestria e o nível da jornada.",{skill:["Gomu Gomu no Pistol",5,28,"impact"],forms:[["Gear 2",7,7,0,1,2],["Gear 3",9,10,0,2,3],["Gear 4",12,13,2,3,4],["Gear 5",16,18,4,3,6]]}],
  kurama:["Chakra da Kurama","Naruto","power",4,"Usa uma rajada de chakra. Libera o Manto da Kurama na maestria II.",{skill:["Rajada da Kurama",6,28,"energy"],forms:[["Manto da Kurama",10,11,4,2,2],["Modo Chakra da Kurama",14,16,5,3,5]]}],
  grimoire:["Grimório de Cinco Folhas","Black Clover","power",3,"Corte de antimagia. Libera uma forma que aumenta ataque na maestria II.",{skill:["Corte de Antimagia",7,34,"energy"],forms:[["Black Asta",12,14,2,2,3]]}],
  sprint:["Faixa de treinamento do Goku","Dragon Ball","head",0,"+6 de Resistência.",{res:6}],
  pill:["Pílula de Soldado","Naruto","consumable",0,"Recupera 22 PV e 6 de energia durante o combate.",{heal:22,charge:6}]
};
const exclusive = new Set(["marine","dagger","pistol","deck","buggy","kunai","mist","senbon","plate","zabuza"]);
Object.assign(catalog,{
  mera:["Mera Mera no Mi","One Piece","power",3,"Hiken lança um punho de fogo.",{skill:["Hiken",8,35,"fire"]}],
  hie:["Hie Hie no Mi","One Piece","power",3,"Ataca com Ice Saber e aprende uma defesa de gelo.",{skill:["Ice Saber",7,29,"cut"],unlock:["Corpo de Gelo",7,"veil"]}],
  goro:["Goro Goro no Mi","One Piece","power",4,"Invoca um relâmpago e libera Amaru na maestria II.",{skill:["El Thor",9,38,"energy"],forms:[["Amaru",12,13,3,2,3]]}],
  leopard:["Neko Neko no Mi, Modelo Leopardo","One Piece","power",2,"Ative a forma híbrida ou use uma investida.",{skill:["Investida do Leopardo",5,21,"impact"],forms:[["Leopardo Híbrido",6,8,2,0,1]]}],
  rukia:["Sode no Shirayuki","Bleach","weapon",2,"Corte de gelo. Libera Tsugi no Mai na maestria II.",{hit:20,type:"cut",skill:["Tsugi no Mai",8,33,"energy"]}],
  elucidator:["Elucidator","Sword Art Online","weapon",2,"Lâmina negra que ganha força em acertos consecutivos.",{hit:20,type:"cut",chain:true}],
  lostvayne:["Lostvayne","Nanatsu no Taizai","weapon",3,"Espada sagrada com contra-ataque após defender.",{hit:24,type:"cut",counter:12}],
  gaebolg:["Gáe Bolg","Fate","weapon",3,"Lança que também pode ser arremessada na maestria II.",{hit:24,type:"cut",skill:["Arremesso Carmesim",9,39,"shot"]}],
  umbrella:["Umbreaker","Gachiakuta","weapon",2,"O guarda-chuva de Enjin fortalece o golpe após defender.",{hit:19,type:"impact",counter:11}],
  playful:["Nuvem Brincalhona","Jujutsu Kaisen","weapon",2,"Bastão de três seções que encadeia impactos.",{hit:20,type:"impact",chain:true}],
  reagent:["Pedra Filosofal","Fullmetal Alchemist","power",4,"Amplifica a transmutação ofensiva.",{skill:["Transmutação Amplificada",7,39,"energy"]}],
  frieren:["Cajado de Frieren","Frieren","weapon",1,"Ataque mágico básico. Libera Zoltraak na maestria II.",{hit:16,type:"energy",skill:["Zoltraak",7,32,"energy"]}],
  chain:["Coração do Pochita","Chainsaw Man","power",3,"Puxe a corda para ativar a transformação.",{skill:["Corte de Corrente",6,26,"cut"],forms:[["Forma Motosserra",8,11,2,0,1]]}],
  mob:["Poder Psíquico de Mob","Mob Psycho 100","power",3,"Golpe telecinético. Libera o estado 100% na maestria II.",{skill:["Telecinese",6,25,"impact"],forms:[["Explosão de 100%",12,15,2,2,3]]}],
  ghoul:["Kakuhō de Rize","Tokyo Ghoul","power",2,"Desperta o kagune rinkaku e libera ataques de tentáculos.",{skill:["Investida Rinkaku",6,24,"impact"],forms:[["Kagune Rinkaku",7,8,3,0,1]]}],
  disk:["Disco de Duelo","Yu-Gi-Oh!","weapon",1,"Projeta ataques holográficos.",{hit:17,type:"energy"}],
  shield:["Escudo de Leônidas","Record of Ragnarok","weapon",2,"Um golpe de escudo após defender ganha 12 de dano.",{hit:18,type:"impact",counter:12}],
  scarf:["Cachecol de Mikasa","Attack on Titan","head",1,"Aumenta o ataque e a Resistência.",{atk:2,res:8}],
  cape:["Capa do Saitama","One Punch Man","body",1,"Aumenta a defesa e o ataque.",{def:3,atk:3}],
  greaves:["Botas do uniforme de caçador","Hunter × Hunter","feet",0,"+4 de Resistência e +1 de defesa.",{res:4,def:1}],
  trousers:["Calça do uniforme de Goku","Dragon Ball","legs",0,"+2 de ataque e +3 de Resistência.",{atk:2,res:3}],
  senzu:["Semente dos Deuses","Dragon Ball","consumable",2,"Restaura 65 PV e 15 de energia.",{heal:65,charge:15}],
  ration:["Ração de emergência da Tropa","Attack on Titan","consumable",0,"Restaura 18 PV e 4 de energia.",{heal:18,charge:4}],
  armament:["Haki do Armamento","One Piece","passive",2,"Protege do primeiro golpe. A maestria reforça o bloqueio.",{ward:11}],
  sage:["Modo Sábio dos Sapos","Naruto","passive",3,"Ative para reforçar seus golpes e sua defesa.",{form:["Modo Sábio",9,9,5]}]
});
function itemArt(key){
  const symbol=["vest","pants","boots","greaves","trousers","sprint","mist","senbon","grimoire","armament","sage","star","shadow","mob","ki","ten"].indexOf(key);
  if(symbol>=0)return '<span class="item-art uniform" aria-hidden="true" style="background-position:'+((symbol%4)*100/3)+'% '+(Math.floor(symbol/4)*100/3)+'%"></span>';
  const redraw=["gum","buggy","leopard","mera","wado","nichirin","zabuza","zange","rukia","elucidator","lostvayne","saber","dragon","mask","frieren","umbrella"].indexOf(key);
  if(redraw>=0) return '<span class="item-art reference" aria-hidden="true" style="background-position:'+((redraw%4)*100/3)+'% '+(Math.floor(redraw/4)*100/3)+'%"></span>';
  const unique={gum:0,buggy:0,leopard:0,mera:1,hie:2,goro:3,pistol:7,zabuza:5,dragon:5,zange:5,lostvayne:5,kunai:6,dagger:6,senbon:6,grimoire:15,haki:13,armament:12};
  const bySlot={weapon:4,power:12,passive:13,head:8,body:9,legs:10,feet:11,consumable:14};
  const relics={frieren:0,gloves:1,gaebolg:2,umbrella:3,playful:4,disk:5,shield:6,reagent:7,scarf:8,cape:9,sprint:10,chain:11,ghoul:12,kurama:13,pill:14,ration:15};
  const tile=relics[key]??unique[key]??bySlot[catalog[key][2]];
  return '<span class="item-art'+(Object.hasOwn(relics,key)?' relic':'')+'" aria-hidden="true" style="background-position:'+((tile%4)*100/3)+'% '+(Math.floor(tile/4)*100/3)+'%"></span>';
}
const enemyData = [
  ["Marinheiro",40,8,24,"marine",.35,"⚓"],
  ["Pirata de Buggy",51,10,23,"dagger",.38,"☠"],
  ["Atirador pirata",58,12,26,"pistol",.34,"✦"],
  ["Espadachim pirata",66,14,30,"deck",.42,"⚔"],
  ["Buggy",96,15,34,"buggy",.52,"☠"],
  ["Ninja renegado",73,15,31,"kunai",.43,"✧"],
  ["Ninja da Névoa",82,17,34,"mist",.37,"◈"],
  ["Usuário de senbon",88,18,36,"senbon",.4,"✣"],
  ["Espadachim da Névoa",96,19,39,"plate",.4,"⚔"],
  ["Zabuza",145,21,44,"zabuza",.6,"◈"]
];
const pathTypes = {fight:["Combate","⚔"],event:["Evento","✦"],shop:["Loja","◈"],rest:["Descanso","☾"],boss:["Chefe","♜"]};
const encounterStories=[
  ["Cais de East Blue","O sino do porto toca. Um marinheiro bloqueia a passarela e ergue o sabre."],
  ["Beco do porto","Um pirata do bando de Buggy corta o caminho entre as caixas e saca uma adaga."],
  ["Armazém costeiro","O estalo de uma pederneira vem de trás dos barris. O atirador já está de mira levantada."],
  ["Convés tomado","As tábuas rangem. Um espadachim pirata bate a lâmina no convés e chama você para o duelo."],
  ["Tenda do circo","A risada de Buggy ecoa na tenda. Quando ele separar o corpo, procure uma abertura ou troque o corte por outro tipo de golpe."],
  ["Estrada do País das Ondas","Marcas de sandália somem na lama. Um ninja renegado surge na estrada com uma kunai na mão."],
  ["Margem da ponte","Uma máscara branca aparece entre as pedras. O ninja da Névoa toma posição antes que você alcance a ponte."],
  ["Passarela de madeira","Três agulhas acertam um poste ao lado do caminho. Alguém está testando a distância."],
  ["Entrada da neblina","Uma espada raspa a pedra na entrada da ponte. O espadachim da Névoa espera em silêncio."],
  ["Ponte coberta pela névoa","Zabuza arrasta a Kubikiribōchō pelo chão. Quando ele sumir na névoa, prepare-se para a emboscada."]
];
const roomStories={
  event:["Um baú escondido sob as redes guarda uma fruta estranha e outras peças de saque.","Entre as tábuas soltas da ponte, você encontra a bolsa abandonada de um viajante."],
  shop:["Um mercador abre o alçapão do cais e acende uma lanterna sobre as mercadorias.","Sob a ponte, um vendedor ambulante desamarra o pano que cobre seu estoque."],
  rest:["O barulho do porto fica distante. Perto de uma fogueira, há espaço para abrir a mochila e treinar.","A neblina para na entrada de um abrigo. Você pode reforçar o equipamento antes de subir."]
};
function story(place,copy){return '<p class="story"><strong>'+place+'</strong>'+copy+'</p>';}
const paths = [["fight"],["fight","event"],["fight","shop"],["fight","rest"],["boss"],["fight"],["fight","event"],["fight","shop"],["fight","rest"],["boss"]];
const attributeNames = {atk:"Ataque",def:"Defesa",res:"Resistência"};
const stage = document.querySelector("#stage");
const side = document.querySelector("#side");
const bagButton = document.querySelector("#bag");
const resetButton = document.querySelector("#reset");
const saveKey = "torre-do-eclipse-1";
let state = {view:"title",log:[]};
let inventoryOpen = false;
let profileOpen=false;
let profileTab="gear";
let bagTab = "all";
let inspectId=null;
const bins = {all:["Todos","◇"],weapon:["Armas","⚔"],power:["Poderes","✧"],passive:["Passivas","✦"],head:["Cabeça","♜"],body:["Tronco","⛨"],legs:["Calça","Ⅱ"],feet:["Pés","»"],consumable:["Consumíveis","✚"]};
let focusAfterRender = false;
try {
  const saved = JSON.parse(localStorage.getItem(saveKey));
  if (saved?.version === 1 && ["fight","reward","route","event","shop","rest","win","lose"].includes(saved.view)) state = saved;
} catch {}
if (state.items) {
  state.obtained=[...new Set([...(state.obtained||[]),...state.items.map(item=>item.key)])];
  if (state.room?.items) state.room.items=state.room.items.filter(key=>!state.obtained.includes(key));
}

function fresh() {
  revealed.clear();
  profileOpen=false;
  profileTab="gear";
  bagTab="all";
  state = {version:1,view:"fight",floor:1,level:1,xp:0,coins:0,nextId:1,items:[],history:[],equipped:{},points:0,bonus:{atk:0,def:0,res:0},log:[],lastDefeated:null};
  inventoryOpen = false;
  enter("fight");
}
function data(item) { return catalog[item.key]; }
function itemById(id) { return state.items.find(item => item.id === Number(id)); }
function equipped(slot) { return state.items.filter(item => item.slot === slot && (state.equipped[slot] || []).includes(item.id)); }
function allEquipped() { return gearSlots.flatMap(equipped); }
function values(item) { return data(item)[5]; }
function mastery(item) { return item.xp >= 15 ? 3 : item.xp >= 7 ? 2 : item.xp >= 3 ? 1 : 0; }
function canUse(item) { return !values(item).require || equipped("power").some(power => power.key === values(item).require); }
function gain(item, amount = 1) {
  if (!item || !["weapon","power","passive"].includes(item.slot) || !canUse(item) || !state.battle) return;
  const earned = state.battle.practice[item.id] || 0;
  const granted = Math.min(amount, 4 - earned, 15 - item.xp);
  if (granted <= 0) return;
  const previous = mastery(item);
  item.xp += granted;
  state.battle.practice[item.id] = earned + granted;
  if (mastery(item) > previous) say(data(item)[0] + " alcançou maestria " + mastery(item) + ".");
}
function add(key) {
  state.obtained??=[];
  if (!catalog[key] || state.obtained.includes(key)) return null;
  const details = catalog[key];
  const item = {id:state.nextId++,key,slot:details[2],xp:0,upgrade:0};
  state.items.push(item);
  state.obtained.push(key);
  return item;
}
function stats() {
  const s = {hp:100+(state.level-1)*9,energy:20+(state.level-1)*2,atk:state.level-1+state.bonus.atk,def:state.bonus.def,res:state.bonus.res};
  for (const item of allEquipped().filter(canUse)) {
    for (const k of ["atk","def","res"]) s[k] += values(item)[k] || 0;
    if (["head","body","legs","feet"].includes(item.slot)) s.def += item.upgrade * 2;
  }
  return s;
}
function say(message) { state.log.unshift(message); state.log = state.log.slice(0,20); }
function rates(floor) {
  const n = floor - 1;
  return [60-3*n,27+n,10+n,2.5+.8*n,.5+.2*n];
}
function pick(pool) { return pool[Math.floor(Math.random()*pool.length)]; }
function offer(floor) {
  const groups=rarities.map((_,r)=>Object.keys(catalog).filter(key=>!exclusive.has(key)&&!state.obtained?.includes(key)&&catalog[key][3]===r));
  const chosen = [];
  for (let i=0;i<3;i++) {
    const weights=rates(floor).map((w,r)=>groups[r].length?w:0);
    const total=weights.reduce((a,b)=>a+b,0);
    if (!total) break;
    let roll=Math.random()*total;
    const group=groups[weights.findIndex(weight=>(roll-=weight)<0)];
    chosen.push(group.splice(Math.floor(Math.random()*group.length),1)[0]);
  }
  return chosen;
}
function enter(kind) {
  state.history.push({floor:state.floor,kind});
  state.view = kind === "boss" ? "fight" : kind;
  state.room = {};
  if (state.view === "fight") {
    const s = stats();
    state.battle = {hp:s.hp,energy:s.energy,enemyHp:enemyData[state.floor-1][1],turn:1,practice:{},firstHit:true,blockedLast:false,combo:0,form:null,used:{},veil:false};
    say("Andar "+state.floor+" · "+enemyData[state.floor-1][0]);
  }
  if (kind === "shop") state.room.items = offer(state.floor);
  if (kind === "event") {
    state.room.items=offer(state.floor);
    if (state.floor===2 && !state.obtained?.includes("leopard") && !state.room.items.includes("leopard")) state.room.items[0]="leopard";
  }
}
function intent(turn) {
  const enemy = enemyData[state.floor-1];
  if (state.floor === 5 && turn%3 === 2) return {label:"Buggy vai separar o corpo. Cortes falham neste turno.",damage:enemy[2],split:true};
  if (state.floor === 10 && turn%3 === 2) return {label:"Zabuza cria névoa e prepara uma emboscada.",damage:0};
  if (turn%3 === 0) return {label:(state.floor===10?"Emboscada na névoa":"Golpe pesado")+" · "+enemy[3]+" de dano base",damage:enemy[3],heavy:true};
  return {label:"Ataque · "+enemy[2]+" de dano base",damage:enemy[2]};
}
function hit(base,type,item) {
  const b = state.battle;
  const signature={mera:"fire",hie:"ice",rukia:"ice",goro:"lightning",gum:"elastic",leopard:"claw"};
  if(combatEffect) combatEffect.kind=signature[item?.key]||type;
  if (type === "cut" && intent(b.turn).split) { say("Buggy separou o corpo e escapou do corte."); b.combo = 0; return; }
  let damage = base + stats().atk + (b.form?.atk || 0);
  if (item) {
    damage += mastery(item)*2 + item.upgrade*2;
    if (values(item).chain) { damage += b.combo*2; b.combo = Math.min(3,b.combo+1); }
    if (b.blockedLast) damage += values(item).counter || 0;
    gain(item);
  } else b.combo = 0;
  if (state.floor === 10 && b.turn%3 === 0 && ["cut","shot"].includes(type)) damage = Math.floor(damage*.75);
  b.enemyHp = Math.max(0,b.enemyHp-damage);
  if(combatEffect)combatEffect.damage=damage;
  say("Você causou "+damage+" de dano.");
}
function available() {
  const commands = [
    {id:"punch",name:"Soco",detail:"10 de dano base · +4 energia",run:()=>{hit(10,"impact"); charge(4);}},
    {id:"guard",name:"Defender",detail:"Metade do dano · +3 energia",run:()=>charge(3),guard:true}
  ];
  const b = state.battle;
  for (const item of allEquipped().filter(canUse)) {
    const [name,,,,,v] = data(item);
    if (v.hit) commands.push({id:"weapon"+item.id,name,detail:v.hit+" de dano base",run:()=>{hit(v.hit,v.type,item); charge(2);}});
    if (v.skill && (item.slot === "power" || mastery(item) >= 2)) {
      const [name,cost,damage,type] = v.skill;
      const shadowNeeded = type === "shadow" && !state.lastDefeated;
      commands.push({id:"skill"+item.id,name,cost,disabled:shadowNeeded,detail:shadowNeeded?"Vença uma luta para capturar uma sombra":cost+" energia · "+damage+" de dano base",run:()=>{if(type==="shadow") say("Sombra invocada: "+state.lastDefeated+".");hit(damage,type,item);}});
    }
    if (v.unlock && mastery(item) >= 2) {
      const [name,cost] = v.unlock;
      commands.push({id:"special"+item.id,name,cost,disabled:b.used[item.id],detail:cost+" energia · evita uma ação inimiga por luta",run:()=>{b.veil=true;b.used[item.id]=true;gain(item);say(name+" ativada.");}});
    }
    const forms = v.forms || (v.form ? [[...v.form,0,1]] : []);
    for (const [form,cost,atk,def,requiredMastery,level] of forms) {
      if (mastery(item) < requiredMastery || state.level < level) continue;
      commands.push({id:"form"+item.id+form,name:form,cost,disabled:!!b.form || b.used.form,detail:cost+" energia · "+duration()+" turnos de ação após ativar",run:()=>{b.form={name:form,atk,def,turns:duration(),item:item.id};b.used.form=true;gain(item);say(form+" ativado.");},activate:true});
    }
  }
  for (const item of state.items.filter(item=>item.slot==="consumable")) {
    const v=values(item);
    commands.push({id:"use"+item.id,name:data(item)[0],detail:"+"+v.heal+" PV · +"+v.charge+" energia",run:()=>{b.hp=Math.min(stats().hp,b.hp+v.heal);charge(v.charge);state.items=state.items.filter(other=>other.id!==item.id);}});
  }
  return commands;
}
function duration() { return Math.min(6,3+Math.floor(stats().res/20)); }
function charge(value) { state.battle.energy = Math.min(stats().energy,state.battle.energy+value); }
function fight(id) {
  const b=state.battle;
  const move=available().find(command=>command.id===id);
  if (!move || move.disabled || b.energy<(move.cost||0)) return;
  const next=intent(b.turn);
  combatEffect={name:move.name,kind:move.activate?"form":move.guard?"guard":id.startsWith("use")?"heal":"energy",damage:0};
  b.energy-=move.cost||0;
  move.run();
  if (b.form && !move.activate) gain(itemById(b.form.item));
  if (b.enemyHp<=0) { victory(); return; }
  if (b.veil) { say("Você evitou a ação inimiga.");b.veil=false; }
  else if (next.damage) {
    let damage=Math.max(1,next.damage-stats().def-(b.form?.def||0));
    if (move.guard) {
      const bonus=allEquipped().reduce((sum,item)=>sum+(values(item).guard||0),0);
      damage=Math.max(1,Math.ceil(damage/2)-bonus);
      for (const item of equipped("passive").filter(item=>values(item).read)) {gain(item);charge(2);}
    }
    if (b.firstHit) {
      for (const item of allEquipped().filter(item=>values(item).ward && canUse(item))) {
        damage=Math.max(0,damage-values(item).ward-mastery(item)*2);gain(item);
      }
      b.firstHit=false;
    }
    b.hp=Math.max(0,b.hp-damage);
    say("Você recebeu "+damage+" de dano"+(move.guard?" ao defender.":"."));
  } else say("O inimigo prepara o próximo golpe.");
  if (b.form && !move.activate && --b.form.turns<=0) b.form=null;
  b.blockedLast=!!move.guard;
  b.turn++;
  if (b.hp<=0) {
    state.view="lose";state.items=[];state.equipped={};state.points=0;
    say("A jornada terminou no andar "+state.floor+".");
  }
}
function xp(amount) {
  state.xp+=amount;
  while (state.xp>=3 && state.level<10) {
    state.xp-=3;state.level++;state.points++;say("Nível "+state.level+" · 1 ponto de atributo.");
  }
}
function victory() {
  const e = enemyData[state.floor-1];
  const money = state.floor%5===0 ? 22 : 9+state.floor;
  const earnedXp = state.floor%5===0 ? 3 : 2;
  state.coins+=money;xp(earnedXp);state.lastDefeated=e[0];
  const drop = !state.obtained?.includes(e[4]) && Math.random()<e[5] ? e[4] : null;
  if (drop) { add(drop);say("Drop exclusivo: "+catalog[drop][0]+"."); }
  say("Vitória · +"+earnedXp+" XP · +"+money+" moedas.");
  state.room={items:offer(state.floor),drop,money,earnedXp};
  state.view="reward";
}
function completeRoom() { state.view=state.floor===10?"win":"route"; }
function take(key) {
  if (!state.room.items?.includes(key) || !add(key)) return;
  say(catalog[key][0]+" foi para a mochila.");completeRoom();
}
function price(key) {return [13,22,31,45,62][catalog[key][3]];}
function equipment(id) {
  const item=itemById(id);
  if (!item || item.slot==="consumable" || state.view==="fight") return;
  const set=state.equipped[item.slot] || [];
  if (set.includes(id)) state.equipped[item.slot]=set.filter(entry=>entry!==id);
  else if (item.slot==="passive") {
    if (set.length>=3) {say("Retire uma passiva para liberar um dos 3 espaços.");return;}
    state.equipped.passive=[...set,id];
  } else state.equipped[item.slot]=[id];
}
function itemForms(item){
  const v=values(item);
  return v.forms || (v.form?[[...v.form,0,1]]:[]);
}
function formValue(item){
  return Math.max(0,...itemForms(item).filter(f=>mastery(item)>=f[4]&&state.level>=f[5]&&stats().energy>=f[1]).map(f=>f[2]+f[3]*.9-f[1]*.2));
}
function gearValue(item){
  const v=values(item), rank=mastery(item), bonus=2*(rank+item.upgrade);
  const attack=v.hit?v.hit+bonus:0;
  const skill=v.skill&&(item.slot==="power"||rank>=2)?v.skill[2]+bonus-v.skill[1]*.65:0;
  return Math.max(attack,skill)+(v.atk||0)+(v.def||0)*1.25+(v.res||0)*.22+
    (["head","body","legs","feet"].includes(item.slot)?item.upgrade*2.5:0)+
    (v.ward?(v.ward+rank*2)*.45:0)+(v.guard||0)*.4+(v.counter||0)*.4+(v.chain?3:0)+(v.read?4:0)+(v.unlock&&rank>=2?5:0);
}
function equipBest(){
  if(state.view==="fight"||!inventoryOpen)return;
  const setup={}, pool=slot=>state.items.filter(item=>item.slot===slot);
  let best=-Infinity, keep=-1;
  for(const slot of ["head","body","legs","feet","weapon"]){
    const options=pool(slot).sort((a,b)=>gearValue(b)-gearValue(a)||Number(equipped(slot).includes(b))-Number(equipped(slot).includes(a)));
    if(options.length)setup[slot]=[options[0].id];
  }
  for(const power of [null,...pool("power")]){
    const candidates=pool("passive").filter(p=>!values(p).require||values(p).require===power?.key);
    function compare(selected,start){
      const set=power?[power,...selected]:selected;
      const score=set.reduce((sum,i)=>sum+gearValue(i),0)+Math.max(0,...set.map(formValue));
      const ties=set.filter(i=>equipped(i.slot).includes(i)).length+set.length*.01;
      if(score>best || (score===best&&ties>keep)){
        best=score;keep=ties;setup.power=power?[power.id]:[];setup.passive=selected.map(i=>i.id);
      }
      if(selected.length<3)for(let i=start;i<candidates.length;i++)compare([...selected,candidates[i]],i+1);
    }
    compare([],0);
  }
  state.equipped=setup;
  say("Melhores equipamentos aplicados para uma build equilibrada.");
}
function drawItemSheet(item){
  const [name,anime,slot,rarity,description,v]=data(item), rank=mastery(item);
  const active=equipped(slot).includes(item);
  const source=enemyData.find(e=>e[4]===item.key);
  const facts=[["Anime",anime],["Categoria",slots[slot]],["Raridade",rarities[rarity]],["Estado",active?"Equipado":"Na mochila"],["Melhoria","+"+item.upgrade],["Origem",source?source[0]+" · "+Math.round(source[5]*100)+"% de drop":item.key==="leopard"?"Evento do 2º andar ou sorteio geral":"Recompensas, eventos e lojas da torre"]];
  if(!source)facts.push(["Preço na loja",price(item.key)+" moedas"]);
  if(["weapon","passive","power"].includes(slot))facts.push(["Maestria",rank+" · "+item.xp+"/15 XP"],["Próximo marco",rank===3?"Concluída":[3,7,15][rank]+" XP"]);
  for(const [key,label] of Object.entries(attributeNames))if(v[key])facts.push([label,"+"+v[key]]);
  if(["head","body","legs","feet"].includes(slot)&&item.upgrade)facts.push(["Defesa da melhoria","+"+item.upgrade*2]);
  const moves=[],extra=2*(rank+item.upgrade);
  const types={cut:"corte",shot:"projétil",impact:"impacto",energy:"energia",fire:"fogo",shadow:"sombra"};
  if(v.hit)moves.push("Ataque de "+types[v.type]+" · "+(v.hit+extra)+" de dano antes dos atributos do personagem. Recupera 2 de energia.");
  if(v.skill)moves.push(v.skill[0]+" · "+(v.skill[2]+extra)+" de dano de "+types[v.skill[3]]+" antes dos atributos. Custa "+v.skill[1]+" de energia."+(slot==="weapon"?" Requer maestria II.":"")+(v.skill[3]==="shadow"?" Requer uma sombra de inimigo derrotado.":""));
  if(v.unlock)moves.push(v.unlock[0]+" · "+v.unlock[1]+" de energia. Evita uma ação inimiga, uma vez por luta. Requer maestria II.");
  if(v.ward)moves.push("Absorve até "+(v.ward+rank*2)+" de dano do primeiro golpe recebido.");
  if(v.read)moves.push("Revela a intenção do turno seguinte e recupera 2 de energia extra ao defender um ataque.");
  if(v.counter)moves.push("Após defender, o próximo ataque da arma recebe +"+v.counter+" de dano.");
  if(v.chain)moves.push("Acertos em sequência aumentam o dano em 2, até +6.");
  if(v.guard)moves.push("Defender reduz o dano recebido em mais "+v.guard+".");
  if(v.heal||v.charge)moves.push("Um uso · recupera "+(v.heal||0)+" PV e "+(v.charge||0)+" de energia.");
  if(v.require)facts.push(["Poder exigido",catalog[v.require][0]+(canUse(item)?" · equipado":" · falta equipar")]);
  const forms=itemForms(item).map(([title,cost,atk,def,m,l])=>title+" · custo "+cost+" · +"+atk+" ataque / +"+def+" defesa · maestria "+m+" e nível "+l+".");
  if(forms.length)forms.push("Uma ativação por combate. Com sua Resistência atual, a forma dura "+duration()+" turnos após ativar.");
  const list=(title,rows)=>rows.length?"<section><h3>"+title+'</h3><ul class="moves">'+rows.map(line=>"<li>"+line+"</li>").join("")+"</ul></section>":"";
  return '<div class="item-sheet"><div>'+button("uninspect","","← Voltar à mochila")+'</div><div class="sheet-top">'+itemArt(item.key)+'<div><div class="eyebrow">'+rarities[rarity]+" · "+slots[slot]+'</div><h2 tabindex="-1">'+name+'</h2></div></div><p>'+description+'</p><dl class="facts">'+facts.map(([key,value])=>"<div><dt>"+key+"</dt><dd>"+value+"</dd></div>").join("")+"</dl>"+list("Habilidades e efeitos",moves)+list("Transformações",forms)+(slot==="consumable"?"":button("equip",item.id,active?"Retirar equipamento":"Equipar","button primary",state.view==="fight"))+"</div>";
}
function perform(action,arg) {
  if(action==="profile" && !["title","lose"].includes(state.view)){
    profileOpen=!profileOpen;
    inventoryOpen=false;
    inspectId=null;
  }
  if(action==="profileTab" && profileOpen && ["gear","points"].includes(arg))profileTab=arg;
  if(action==="bag")profileOpen=false;
  if(action==="inspect"&&inventoryOpen&&itemById(arg))inspectId=Number(arg);
  if(["uninspect","bag","start","reset"].includes(action))inspectId=null;
  if(action==="best")equipBest();
  if (action==="bin" && inventoryOpen && Object.hasOwn(bins,arg)) {
    bagTab=arg;
    render();
    stage.querySelector('#bin-'+arg)?.focus({preventScroll:true});
    return;
  }
  const ids=arg===undefined ? undefined : Number(arg);
  if (action==="start") fresh();
  if (action==="bag" && !["title","lose"].includes(state.view)) inventoryOpen=!inventoryOpen;
  if (action==="reset" && confirm("Recomeçar do 1º andar e encerrar esta jornada?")) fresh();
  if (action==="turn" && state.view==="fight") fight(arg);
  if (action==="equip" && inventoryOpen) equipment(ids);
  if (action==="next" && state.view==="route" && paths[state.floor]?.includes(arg)) {state.floor++;enter(arg);}
  if (action==="take" && ["reward","event"].includes(state.view)) take(arg);
  if (action==="eventcoins" && state.view==="event") {state.coins+=18;say("Você recebeu 18 moedas.");completeRoom();}
  if (action==="buy" && state.view==="shop" && state.room.items.includes(arg) && state.coins>=price(arg) && add(arg)) {
    state.coins-=price(arg);state.room.items=state.room.items.filter(key=>key!==arg);say("Você comprou "+catalog[arg][0]+".");
  }
  if (action==="continue" && state.view==="reward" && !state.room.items.length) completeRoom();
  if (action==="leave" && state.view==="shop") completeRoom();
  if (action==="restskip" && state.view==="rest") {state.coins+=8;say("Você recebeu 8 moedas no descanso.");completeRoom();}
  if (["practice","upgrade"].includes(action) && state.view==="rest") {
    const item=itemById(ids);
    if (item && item.slot!=="consumable") {
      if (action==="practice") item.xp=Math.min(15,item.xp+4); else item.upgrade++;
      say(data(item)[0]+(action==="practice"?" ganhou maestria.":" foi melhorado."));completeRoom();
    }
  }
  if (action==="attribute" && state.points>0 && state.view!=="fight" && Object.hasOwn(attributeNames,arg)) {
    const gain=arg==="res"?8:2;state.bonus[arg]+=gain;state.points--;say(attributeNames[arg]+" +"+gain+".");
  }
  if (state.view==="lose") inventoryOpen=false;
  focusAfterRender = true;
  render();
  animateAction(action,arg);
}
let combatEffect=null;
const revealed=new Set();
function animateAction(action,arg) {
  const effect=combatEffect;
  combatEffect=null;
  if(typeof window==="undefined"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const scene=stage.querySelector(".arena");
  if(scene && action==="turn" && effect){
    const tones={cut:"#d9efff",ice:"#a3e8ff",fire:"#ff9a54",lightning:"#ffe779",shot:"#ffc381",shadow:"#c68bff",elastic:"#ff9fb1",claw:"#ffc86a",impact:"#fff0cc",guard:"#8bdfff",heal:"#a4ffbe",form:"#f9b6ff",energy:"#bda1ff"};
    const layer=document.createElement("div"), shape=document.createElement("i"), badge=document.createElement("span");
    layer.className="combat-fx";layer.setAttribute("aria-hidden","true");layer.style.setProperty("--tone",tones[effect.kind]||tones.energy);
    shape.className="effect-shape "+effect.kind;
    badge.className="fx-label";
    badge.textContent=effect.name+(effect.damage?"  −"+effect.damage:"");
    layer.append(shape,badge);scene.append(layer);
    const motion={shot:["translate(-115%,-50%)","translate(-12%,-50%)"],elastic:["translate(-135%,-50%) scaleX(.2)","translate(-50%,-50%) scaleX(1.8)"],lightning:["translate(-50%,-100%) scale(.6)","translate(-50%,-50%) scale(1.35)"],cut:["translate(-30%,-100%) scale(.35)","translate(-50%,-50%) scale(1.35)"]};
    const [start,end]=motion[effect.kind]||motion.cut.map((_,i)=>"translate(-50%,-50%) scale("+(i?1.45:.35)+")");
    shape.animate([{opacity:.15,transform:start},{opacity:.86,offset:.4},{opacity:0,transform:end}],{duration:470});
    const sparks=effect.kind==="claw"?3:8;
    for(let i=0;i<sparks;i++){
      const spark=document.createElement("i"), angle=i*360/sparks;
      spark.className="spark";layer.append(spark);
      spark.animate([{opacity:1,transform:"rotate("+angle+"deg) translateX(8px)"},{opacity:0,transform:"rotate("+angle+"deg) translateX("+(48+i*4)+"px)"}],{duration:430});
    }
    badge.animate([{opacity:0,transform:"translateX(-24px)"},{opacity:1,offset:.22},{opacity:1,offset:.78},{opacity:0,transform:"translateY(-10px)"}],{duration:950}).onfinish=()=>layer.remove();
  }
  animateReveals();
}
function animateReveals(){
  if(typeof window==="undefined"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  for(const item of stage.querySelectorAll(".discovery")){
    const id=state.floor+":"+state.view+":"+item.dataset.arg;
    if(revealed.has(id))continue;
    revealed.add(id);
    const color=item.classList.contains("r4")?"#f988d7":"#ffc575";
    item.animate([{transform:"translateY(12px) scale(.93)",opacity:.35},{transform:"translateY(0) scale(1.035)",opacity:1,boxShadow:"0 0 26px "+color},{transform:"none",opacity:1}],{duration:750,easing:"ease-out"});
  }
}
function button(action,arg,content,classes="button",disabled=false) {
  return '<button type="button" class="'+classes+'" data-action="'+action+'" data-arg="'+(arg??"")+'"'+(disabled?" disabled":"")+">"+content+"</button>";
}
function arena(label,title,detail,symbol="") {
  return '<div class="arena '+(state.floor>=6?"mist":"")+'"><div class="arc-lines" aria-hidden="true"></div><div class="enemy-symbol" aria-hidden="true">'+symbol+'</div><div class="eyebrow">'+label+'</div><h2 tabindex="-1">'+title+'</h2><p>'+detail+"</p></div>";
}
function card(key,action,extra="",disabled=false) {
  const [name,anime,slot,rarity,description]=catalog[key];
  return button(action,key,itemArt(key)+'<span class="eyebrow">'+rarities[rarity]+' · '+slots[slot]+'</span><strong>'+name+'</strong><small>'+anime+'</small><p>'+description+'</p>'+extra,"card r"+rarity+(rarity>=3?" discovery":""),disabled);
}
function dropReveal(key){
  const [name,,,rarity]=catalog[key];
  return '<div data-arg="'+key+'" class="headline-drop r'+rarity+(rarity>=3?' discovery':'')+'">'+itemArt(key)+'<div><div class="rarity-stamp">Drop '+rarities[rarity]+'</div><strong>'+name+'</strong><p>Guardado na mochila</p></div></div>';
}
function meter(label,current,max,style="") {
  return '<div class="meter-label"><span>'+label+'</span><strong>'+current+' / '+max+'</strong></div><div class="meter '+style+'"><i style="width:'+Math.max(0,Math.min(100,current/max*100))+'%"></i></div>';
}
function drawInventory() {
  const inspected=itemById(inspectId);
  if(inspected)return drawItemSheet(inspected);
  const note=state.view==="fight"?"Consulta durante o combate. Equipe os itens entre as lutas.":"Escolha o equipamento para a próxima luta.";
  const visible=state.items.filter(item=>bagTab==="all" || item.slot===bagTab);
  const tabs=Object.entries(bins).map(([key,[label]])=>{
    const selected=key===bagTab;
    const count=key==="all"?state.items.length:state.items.filter(item=>item.slot===key).length;
    return '<button role="tab" class="bag-tab" id="bin-'+key+'" aria-controls="bag-panel" aria-selected="'+selected+'" tabindex="'+(selected?0:-1)+'" data-action="bin" data-arg="'+key+'">'+label+' <b>'+count+'</b></button>';
  }).join("");
  const tiles=visible.map(item=>{
    const [name,anime,slot,rarity,description]=data(item);
    const active=(state.equipped[slot]||[]).includes(item.id);
    const progress=["weapon","power","passive"].includes(slot)?'<div><small>Maestria '+mastery(item)+' · '+item.xp+'/15</small><div class="mastery"><i style="width:'+(100*item.xp/15)+'%"></i></div></div>':"";
    const requirement=values(item).require?'<p>Exige '+catalog[values(item).require][0]+' equipado.</p>':"";
    const gates=(values(item).forms||[]).map(([form,,,,masteryLevel,level])=>form+" (maestria "+masteryLevel+", nível "+level+")").join(" · ");
    return '<article class="loot inspect-card r'+rarity+'"><button class="inspect-link" data-action="inspect" data-arg="'+item.id+'" aria-label="Ver ficha de '+name+'"></button><div class="loot-top">'+itemArt(item.key)+'<span class="eyebrow">'+rarities[rarity]+'</span>'+(active?'<span class="worn">Equipado</span>':'')+'</div><div><small>'+anime+' · '+slots[slot]+'</small><h3>'+name+(item.upgrade?' +'+item.upgrade:'')+'</h3></div><p>'+description+'</p>'+progress+requirement+'<small>Ver ficha do item ↗</small>'+'<footer>'+(slot==="consumable"?'<small>Use no menu de combate</small>':button("equip",item.id,active?"Retirar":"Equipar","button",state.view==="fight"))+"</footer></article>";
  }).join("");
  const empty=state.items.length?"Você ainda não encontrou itens deste tipo.":"Vença uma luta para escolher sua primeira recompensa.";
  return '<div class="bag-head"><div class="eyebrow">Equipamentos · Andar '+state.floor+'</div><div class="row"><h2 tabindex="-1">Mochila</h2>'+button("bag","","Voltar à jornada")+'</div><p>'+note+'</p></div><div class="bag-body"><div class="bag-tools">'+button("best","","Equipar melhores","button primary",state.view==="fight"||!state.items.some(i=>gearSlots.includes(i.slot)))+'<small>Equilibra ataque, defesa e formas disponíveis.</small></div><div class="bag-tabs" role="tablist" aria-label="Tipos de item">'+tabs+'</div><section role="tabpanel" tabindex="0" id="bag-panel" aria-labelledby="bin-'+bagTab+'"><div class="bag-caption"><h3>'+bins[bagTab][0]+'</h3><small>'+visible.length+(visible.length===1?' item':' itens')+'</small></div>'+(tiles?'<div class="bag-grid">'+tiles+'</div>':'<div class="empty-bin"><b>'+ (state.items.length?"Aba vazia":"Mochila vazia")+'</b>'+empty+'</div>')+'</section></div>';
}
function drawForms() {
  const b=state.battle;
  const choices=[];
  for(const item of allEquipped()){
    const v=values(item);
    const forms=v.forms||(v.form?[[...v.form,0,1]]:[]);
    for(const [name,cost,attack,defense,rank,level] of forms){
      const reason=!canUse(item)?"Equipe "+catalog[v.require][0]:mastery(item)<rank?"Requer maestria "+rank:state.level<level?"Requer nível "+level:b.used.form?"Forma já usada nesta luta":b.energy<cost?"Energia insuficiente":"";
      choices.push(button("turn","form"+item.id+name,"<strong>"+name+"</strong><small>"+(reason||cost+" energia · "+duration()+" turnos")+"</small><small>+"+attack+" ataque"+(defense?" · +"+defense+" defesa":"")+"</small>","button action",!!reason));
    }
  }
  return choices.length?'<section class="form-panel"><h3>Transformações</h3><div class="action-grid">'+choices.join("")+'</div></section>':"";
}
function drawFight() {
  const b=state.battle;
  const e=enemyData[state.floor-1];
  const read=equipped("passive").some(item=>values(item).read);
  return arena((state.floor<=5?"East Blue":"País das Ondas")+" · Andar "+state.floor,e[0],"Turno "+b.turn+(state.floor%5===0?" · Chefe":""),e[6])+
    '<div class="main-content">'+(b.turn===1?story(...encounterStories[state.floor-1]):"")+meter("PV do inimigo",b.enemyHp,e[1])+
    '<div class="intent"><strong>Intenção</strong> · '+intent(b.turn).label+(read?'<br><small>Haki: próximo turno · '+intent(b.turn+1).label+'</small>':"")+"</div>"+
    (b.form?'<p class="note">'+b.form.name+" · "+b.form.turns+" turnos restantes</p>":"")+
    '<div class="action-grid">'+available().filter(move=>!move.activate).map(move=>button("turn",move.id,"<strong>"+move.name+"</strong><small>"+move.detail+"</small>","button action",move.disabled||b.energy<(move.cost||0))).join("")+"</div>"+drawForms()+"</div>";
}
function drawRoom() {
  const room=state.room;
  switch(state.view) {
    case "reward":
      return arena("Andar "+state.floor,"Vitória","+"+room.earnedXp+" XP · +"+room.money+" moedas","✦")+
        '<div class="main-content">'+(room.drop?dropReveal(room.drop):"")+
        (room.items.length?'<h3>Escolha uma recompensa</h3><div class="cards">'+room.items.map(key=>card(key,"take")).join("")+'</div>':button("continue","","Continuar a jornada"))+"</div>";
    case "route":
      return arena("Andar "+state.floor+" concluído","Escolha a rota","Próximo andar · "+(state.floor+1),"✧")+
        '<div class="main-content"><div class="cards">'+paths[state.floor].map(kind=>{
          const [name,icon]=pathTypes[kind];
          const hints={fight:"Ganhe XP, moedas e chance de drop.",event:"Escolha entre uma recompensa e moedas.",shop:"Troque moedas por recompensas.",rest:"Melhore um item ou treine maestria.",boss:"Combate obrigatório para avançar."};
          return button("next",kind,'<span class="eyebrow">'+icon+'</span><strong>'+name+'</strong><p>'+hints[kind]+'</p>',"card");
        }).join("")+"</div></div>";
    case "event":
      return arena("Andar "+state.floor+" · Evento",state.floor<6?"Baú no porto":"Achado na ponte","Escolha um item encontrado ou fique com as moedas.","✦")+
        '<div class="main-content">'+story("O que aconteceu",roomStories.event[state.floor<6?0:1])+'<div class="cards">'+room.items.map(key=>card(key,"take")).join("")+'</div><div>'+button("eventcoins","","+18 moedas")+"</div></div>";
    case "shop":
      return arena("Andar "+state.floor+" · Loja","Mercador da torre","Sua bolsa tem "+state.coins+" moedas.","◈")+
        '<div class="main-content">'+story("Encontro com o mercador",roomStories.shop[state.floor<6?0:1])+'<div class="cards">'+(room.items.map(key=>card(key,"buy",'<small>'+price(key)+' moedas</small>',state.coins<price(key))).join("")||'<p class="soft">Estoque esgotado.</p>')+'</div><div>'+button("leave","","Sair da loja","button primary")+"</div></div>";
    case "rest":
      return arena("Andar "+state.floor+" · Descanso","Acampamento","Escolha um benefício antes de seguir.","☾")+
        '<div class="main-content">'+story("Pausa na subida",roomStories.rest[state.floor<6?0:1])+'<div class="cards">'+state.items.filter(item=>item.slot!=="consumable").map(item=>{
          const training=["weapon","power","passive"].includes(item.slot)&&item.xp<15;
          return '<article class="card"><strong>'+data(item)[0]+'</strong>'+(item.slot==="passive"?"" :button("upgrade",item.id,"Melhorar equipamento"))+(training?button("practice",item.id,"Treinar · +4 maestria"):"")+"</article>";
        }).join("")+'</div><div>'+button("restskip","","+8 moedas")+"</div></div>";
    case "win":
      return arena("10 andares concluídos","Torre conquistada","Você derrotou Zabuza e concluiu a jornada no nível "+state.level+".","✦")+
        '<div class="main-content"><div>'+button("start","","Nova jornada","button primary")+" "+button("bag","","Ver mochila")+'</div></div>';
    case "lose":
      return arena("Andar "+state.floor,"Fim da jornada","Sua próxima subida começa no 1º andar com a mochila vazia.","☾")+
        '<div class="main-content"><div>'+button("start","","Tentar de novo","button primary")+"</div></div>";
    default:
      return arena("Roguelike por turnos","Torre do Eclipse","De East Blue ao País das Ondas, cada rota muda o que você leva para a próxima luta.","◐")+
        '<div class="main-content"><div>'+button("start","","Iniciar jornada","button primary")+'</div><p class="help">10 andares · 2 chefes · 1 inimigo por combate</p><p class="help">Você começa sem equipamento. No modo Normal, vida e energia são restauradas antes de cada luta.</p></div>';
  }
}
function drawProfile(){
  const s=stats(), fight=state.view==="fight";
  const tabs='<div class="bag-tabs" role="tablist" aria-label="Perfil">'+[["gear","Equipados"],["points","Atributos"]].map(([key,label])=>'<button class="bag-tab" id="profile-'+key+'" role="tab" aria-selected="'+(profileTab===key)+'" tabindex="'+(profileTab===key?0:-1)+'" aria-controls="profile-panel" data-action="profileTab" data-arg="'+key+'">'+label+(key==="points"&&state.points?' <b>'+state.points+'</b>':'')+'</button>').join("")+'</div>';
  const gear=gearSlots.map(slot=>{
    const list=equipped(slot);
    const tiles=list.map(item=>'<div class="row">'+itemArt(item.key)+'<strong>'+data(item)[0]+'</strong></div>').join("");
    return '<article class="card"><small>'+slots[slot]+(slot==="passive"?' · '+list.length+'/3':'')+'</small>'+(tiles||'<span class="soft">Espaço vazio</span>')+'</article>';
  }).join("");
  const points='<h3>'+state.points+(state.points===1?' ponto disponível':' pontos disponíveis')+'</h3><p class="help">'+(fight?'Distribua os pontos entre combates.':'Cada melhoria custa 1 ponto.')+'</p><div class="cards">'+Object.entries(attributeNames).map(([key,label])=>'<article class="card"><small>'+label+'</small><strong>'+s[key]+'</strong><small>+'+state.bonus[key]+' por pontos distribuídos</small>'+button("attribute",key,"Melhorar +"+(key==="res"?8:2),"button",fight||!state.points)+'</article>').join("")+'</div>';
  return '<div class="bag-head"><div class="eyebrow">Personagem · Nível '+state.level+'</div><div class="row"><h2 tabindex="-1">Perfil</h2>'+button("profile","","Voltar à jornada")+'</div></div><div class="bag-body">'+tabs+'<section class="main-content" id="profile-panel" role="tabpanel" aria-labelledby="profile-'+profileTab+'">'+(profileTab==="gear"?'<div class="cards">'+gear+'</div>':points)+'</section></div>';
}
function drawLog(){
  if(!state.log.length)return "";
  return '<section class="pad log" aria-label="Registro da jornada" style="border-top:1px solid var(--line)"><h3 class="panel-title">Registro</h3><ul class="feed" aria-live="polite">'+state.log.map(line=>"<li>"+line+"</li>").join("")+"</ul></section>";
}
function render() {
  const started=state.view!=="title";
  const profileButton=document.querySelector("#profile");
  profileButton.hidden=!started||state.view==="lose";
  profileButton.textContent=profileOpen?"Fechar perfil":"Perfil"+(state.points?" ("+state.points+")":"");
  profileButton.setAttribute("aria-expanded",String(profileOpen));
  bagButton.hidden=!started||state.view==="lose";
  resetButton.hidden=!started;
  bagButton.textContent=inventoryOpen?"Fechar mochila":"Mochila";
  stage.innerHTML=profileOpen?drawProfile():inventoryOpen?drawInventory():(state.view==="fight"?drawFight():drawRoom())+drawLog();
  const fought=state.view==="fight";
  const s=started?stats():null;
  side.innerHTML='<section class="panel pad"><div class="row"><h3>Torre</h3><span class="tag">'+(started?state.floor+" / 10":"10 andares")+'</span></div><div class="tower">'+paths.map((_,index)=>'<span class="'+((index+1)%5===0?"boss ":"")+(state.floor===index+1?"current":state.floor>index+1?"past":"")+'">'+(index+1)+"</span>").join("")+'</div></section>'+
    (started&&state.view!=="lose"?'<section class="panel pad"><div class="row panel-title"><h3>Personagem</h3><span class="tag">Nível '+state.level+'</span></div>'+meter("Vida",fought?state.battle.hp:s.hp,s.hp)+meter("Energia",fought?state.battle.energy:s.energy,s.energy,"energy")+meter("XP",Math.min(3,state.xp),3,"exp")+
    '<div class="row"><small>Resistência '+s.res+'</small><strong>'+state.coins+' moedas</strong></div></section>':"");
  if (started) try {localStorage.setItem(saveKey,JSON.stringify(state));} catch {}
  if (focusAfterRender) {
    stage.querySelector(profileOpen?'[role="tab"][aria-selected="true"]':state.view==="fight"&&!inventoryOpen?".action-grid .action:not(:disabled)":"h2")?.focus({preventScroll:true});
    focusAfterRender=false;
  }
}
document.addEventListener("click",event=>{
  const action=event.target.closest("[data-action]");
  if (action) perform(action.dataset.action,action.dataset.arg);
});
document.addEventListener("keydown",event=>{
  const tab=event.target.closest('[role="tab"]');
  if (!tab) return;
  const keys=tab.dataset.action==="profileTab"?["gear","points"]:Object.keys(bins);
  const index=keys.indexOf(tab.dataset.arg);
  const next={ArrowRight:(index+1)%keys.length,ArrowLeft:(index+keys.length-1)%keys.length,Home:0,End:keys.length-1}[event.key];
  if (next===undefined) return;
  event.preventDefault();
  perform(tab.dataset.action,keys[next]);
});
bagButton.addEventListener("click",()=>perform("bag"));
resetButton.addEventListener("click",()=>perform("reset"));
render();
animateReveals();
