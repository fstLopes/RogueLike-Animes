// Silhueta do herói na arena. As transformações mostram camadas extras definidas
// aqui e ativadas pelo atributo data-forma (ver src/estilos/formas.css).
//
// Cada camada tem a classe `acc` e uma classe da forma. As camadas são desenhos
// originais e genéricos (aura, caudas, asa, tentáculos, vapor), não sprites oficiais.
export function heroiSvg(): string {
  return `<svg class="heroi-svg" viewBox="0 0 140 150" aria-hidden="true">
  <defs>
    <radialGradient id="g-aura" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="var(--aura, #f3bd76)" stop-opacity=".85"/>
      <stop offset="60%" stop-color="var(--aura, #f3bd76)" stop-opacity=".28"/>
      <stop offset="100%" stop-color="var(--aura, #f3bd76)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse class="h-sombra" cx="62" cy="145" rx="34" ry="4.5"/>
  <ellipse class="h-aura" cx="62" cy="86" rx="52" ry="64" fill="url(#g-aura)"/>

  <g class="acc acc-tambores">
    <circle cx="62" cy="80" r="50" class="anel-tambores"/>
    <circle cx="62" cy="30" r="7"/><circle cx="105" cy="55" r="7"/><circle cx="105" cy="105" r="7"/>
    <circle cx="62" cy="130" r="7"/><circle cx="19" cy="105" r="7"/><circle cx="19" cy="55" r="7"/>
  </g>
  <g class="acc acc-caudas">
    <path class="cauda c1" d="M52 92 C30 100 14 84 8 62"/>
    <path class="cauda c2" d="M52 92 C26 92 16 70 18 46"/>
    <path class="cauda c3 extra" d="M52 92 C34 108 10 106 2 88"/>
    <path class="cauda c4 extra" d="M52 92 C28 84 26 56 32 34"/>
    <path class="cauda c5 extra" d="M52 92 C22 112 6 118 -2 108"/>
  </g>
  <g class="acc acc-kagune">
    <path d="M52 88 C30 70 34 40 20 22"/><path d="M54 90 C36 82 18 70 6 74"/>
    <path d="M56 90 C42 104 20 110 10 128"/><path d="M50 86 C40 58 50 34 44 10"/>
  </g>
  <path class="acc acc-asa" d="M50 60 C30 34 6 38 2 64 C14 58 18 66 14 78 C24 70 30 76 30 88 C38 76 44 74 52 74 Z"/>

  <g class="h-corpo">
    <path class="h-membro" d="M57 94 L49 118 L42 141"/>
    <path class="h-membro" d="M67 94 L77 117 L85 141"/>
    <path class="h-membro h-braco-tras" d="M52 62 L41 80 L47 94"/>
    <path class="h-tronco" d="M47 57 Q62 49 76 57 L73 97 L51 97 Z"/>
    <g class="acc acc-marcas"><path d="M56 66 L68 66 M54 74 L70 74 M57 82 L67 82"/><circle cx="62" cy="88" r="3"/></g>
    <g class="acc acc-manchas"><circle cx="56" cy="68" r="2.4"/><circle cx="66" cy="76" r="2.2"/><circle cx="58" cy="86" r="2"/><circle cx="68" cy="64" r="1.8"/></g>
    <path class="h-membro h-braco" d="M72 62 L87 72 L100 67"/>
    <circle class="h-punho" cx="103" cy="66" r="5.5"/>
    <circle class="acc acc-punho-gigante" cx="111" cy="64" r="17"/>
    <g class="acc acc-garras"><path d="M106 60 L116 55 M107 66 L118 65 M106 71 L116 76"/></g>
    <g class="acc acc-serra">
      <path d="M58 30 L58 6 L66 6 L66 30 Z"/>
      <path class="dentes" d="M58 8 L54 10 L58 13 L54 16 L58 19 L54 22 L58 25 M66 8 L70 10 L66 13 L70 16 L66 19 L70 22 L66 25"/>
      <path d="M84 66 L98 54 L101 58 L88 70 Z"/>
    </g>
    <circle class="h-cabeca" cx="62" cy="41" r="11.5"/>
    <path class="h-cabelo" d="M50 37 L53 26 L57 31 L61 21 L65 30 L70 25 L73 36 Z"/>
    <path class="acc acc-cabelo-dourado" d="M48 40 L42 20 L53 28 L55 6 L63 25 L72 9 L71 28 L84 20 L75 40 Z"/>
    <path class="acc acc-cabelo-nuvem" d="M46 36 Q38 18 52 18 Q56 4 68 14 Q84 8 80 28 Q90 34 76 40 Z"/>
    <path class="acc acc-cabelo-erguido" d="M50 34 L48 12 L56 26 L60 4 L64 26 L72 10 L72 34 Z"/>
    <path class="acc acc-chifre" d="M54 31 L48 16 L58 28 Z"/>
    <g class="acc acc-orelhas"><path d="M51 33 L49 21 L57 29 Z"/><path d="M69 31 L75 20 L74 33 Z"/></g>
    <rect class="h-olho" x="66" y="39" width="5" height="2.6" rx="1.2"/>
    <path class="acc acc-sabio" d="M64 36 L73 36 L73 38 L64 38 Z M64 43 L72 43 L72 45 L64 45 Z"/>
  </g>
  <g class="acc acc-vapor"><circle cx="36" cy="60" r="7"/><circle cx="90" cy="46" r="6"/><circle cx="48" cy="24" r="5"/><circle cx="80" cy="96" r="6"/></g>
  <g class="acc acc-nuvens"><ellipse cx="62" cy="134" rx="40" ry="8"/><circle cx="28" cy="40" r="6"/><circle cx="98" cy="30" r="5"/></g>
  <g class="acc acc-chamas">
    <path d="M44 100 C36 76 42 52 50 40 C48 28 56 20 62 14 C68 22 74 28 76 40 C84 52 88 78 80 100 Z"/>
  </g>
  <g class="acc acc-espiral"><ellipse cx="62" cy="78" rx="44" ry="18"/><ellipse cx="62" cy="78" rx="36" ry="54"/></g>
</svg>`;
}
