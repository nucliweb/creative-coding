import { CONFIG, RESOURCES } from '../config.js';
import { codeBlock } from '../fx/highlight.js';
import { INTRO_SHADER } from '../demos/shaderIntro.js';

const full = '<div class="demo-host"></div>';

// minutes: planned duration, used by the presenter view to tell you if you are ahead or behind.
// stage: tells the phones which controller to show.
export const SLIDES = [
  {
    id: 'titol',
    title: 'Títol',
    minutes: 0.5,
    stage: 'idle',
    html: () => `
      <div class="slide title-slide">
        <img class="logo" src="logo-girotronica.svg" alt="${CONFIG.event}">
        <h1 class="glitch" data-text="CREATIVE CODING">CREATIVE CODING</h1>
        <p class="big">programar per crear,<br><span class="c-magenta">no (només) per resoldre</span><span class="cursor"></span></p>
        <p class="byline">${CONFIG.speaker} · ${CONFIG.handle}</p>
      </div>`,
    notes: `Bon dia! Sóc ${CONFIG.speaker}.
- No començo amb una definició: començo amb vosaltres.
- [→] Gireu-vos cap a la càmera.`,
  },
  {
    id: 'hola',
    title: 'Hola, Girotrònica (càmera ASCII)',
    minutes: 0.75,
    bg: false,
    html: () => `<div class="slide">${full}<div class="hud tr"><span class="big-hud glitch" data-text="HOLA, GIROTRÒNICA">HOLA, GIROTRÒNICA</span></div></div>`,
    demo: () => import('../demos/asciiCam.js'),
    notes: `Apunta la càmera al públic.
- "Aquests sou vosaltres. Cada píxel de la càmera és un caràcter."
- "Unes 80 línies de JavaScript. Sense llibreries."
- Fes soroll: la pluja s'accelera amb el micro.
Tecles: m mirall · +/- resolució · c contrast`,
  },
  {
    id: 'que-es',
    title: 'Què és el Creative Coding?',
    minutes: 1.25,
    steps: 3,
    html: () => `
      <div class="slide">
        <div class="kicker">00 · definició</div>
        <h2>Què és el Creative Coding?</h2>
        <p class="big">Escriure codi per <span class="c-cyan">expressar</span>, <span class="c-magenta">explorar</span> i <span class="c-yellow">sorprendre</span>.</p>
        <ul class="stack" style="list-style:none">
          <li data-step="1">▸ El procés importa tant com el resultat</li>
          <li data-step="2">▸ L'error no és un bug: <span class="c-magenta">és una feature</span></li>
          <li data-step="3">▸ Generatiu · Interactiu · Efímer</li>
        </ul>
      </div>`,
    notes: `- Feu codi cada dia per resoldre problemes. Avui: codi que no ha de ser útil.
- [1] No hi ha especificació: el sketch et diu cap a on anar.
- [2] Quan una cosa "falla" i queda bonica, te la quedes. El glitch és estètica.
- [3] Generatiu: regles + atzar. Interactiu: el públic hi participa. Efímer: cada execució és única.`,
  },
  {
    id: 'origens',
    title: 'Orígens',
    minutes: 1.75,
    steps: 3,
    html: () => `
      <div class="slide">
        <div class="kicker">01 · orígens</div>
        <h2>Abans de la paraula</h2>
        <ul class="timeline">
          <li data-step="1"><span class="year">1965</span><span>Primeres exposicions d'art per ordinador: <b class="c-cyan">Georg Nees</b> (Stuttgart) i <b class="c-cyan">A. Michael Noll</b> (Nova York)</span></li>
          <li data-step="1"><span class="year">1968</span><span><b class="c-magenta">Cybernetic Serendipity</b>, ICA de Londres</span></li>
          <li data-step="1"><span class="year">1968</span><span><b class="c-cyan">Vera Molnár</b> comença amb l'ordinador (des del 1959 feia de «màquina imaginària»)</span></li>
          <li data-step="2"><span class="year">1999</span><span><b class="c-yellow">Design By Numbers</b> · John Maeda, MIT</span></li>
          <li data-step="2"><span class="year">2001</span><span><b class="c-yellow">Processing</b> · Casey Reas i Ben Fry</span></li>
          <li data-step="3"><span class="year">2011</span><span><b class="c-green">WebGL</b>: la GPU entra al navegador</span></li>
          <li data-step="3"><span class="year">2013</span><span><b class="c-green">Shadertoy</b>: una xarxa social de shaders</span></li>
          <li data-step="3"><span class="year">2014</span><span><b class="c-green">p5.js</b> · Lauren Lee McCarthy</span></li>
          <li data-step="3"><span class="year">2023</span><span><b class="c-green">WebGPU</b> arriba a Chrome</span></li>
        </ul>
      </div>`,
    notes: `- [1] Anys 60: ordinadors de laboratori, plotters, targetes perforades. Matemàtics i enginyers fent art.
  Molnár no tenia accés a ordinadors: executava els algorismes a mà. Ella era la màquina.
- [2] Maeda al MIT; els seus alumnes Reas i Fry creen Processing. Eina per a artistes que volen programar.
- [3] El navegador es converteix en el llenç: WebGL, Shadertoy, p5.js... i ara WebGPU.`,
  },
  {
    id: 'schotter',
    title: 'Georg Nees · Schotter (1968)',
    minutes: 1,
    html: () => `
      <div class="slide">
        <div class="split wide-left">
          <div class="stack">
            <div class="kicker">recreació en directe</div>
            <h2>Georg Nees<br><span class="c-cyan">Schotter</span> (1968)</h2>
            <div class="panel">${codeBlock(`
for (let j = 0; j < 22; j++) {
  for (let i = 0; i < 12; i++) {
    const caos = j / 22;
    push();
    translate(x + i * s + random(-caos, caos) * s,
              y + j * s + random(-caos, caos) * s);
    rotate(random(-caos, caos) * HALF_PI);
    square(0, 0, s);
    pop();
  }
}`)}</div>
          </div>
          <div class="live-canvas" style="aspect-ratio:12/20;width:min(100%, 48vh);justify-self:center"></div>
        </div>
      </div>`,
    demo: () => import('../demos/schotter.js'),
    demoTarget: '.live-canvas',
    notes: `- Schotter = grava. Ordre perfecte a dalt, caos a baix. Una sola variable: la fila.
- Dos bucles i un random(). Això és el 1968.
- Feu soroll: el micro multiplica el caos.`,
  },
  {
    id: 'molnar',
    title: 'Vera Molnár · (Des)Ordres (1974)',
    minutes: 0.75,
    html: () => `
      <div class="slide">
        <div class="split">
          <div class="stack">
            <div class="kicker">recreació en directe</div>
            <h2>Vera Molnár<br><span class="c-magenta">(Des)Ordres</span> (1974)</h2>
            <p>Ordre rigorós<br>+ una mica d'atzar<br>= <span class="c-yellow">vida</span></p>
            <p class="muted">1924 – 2023</p>
          </div>
          <div class="live-canvas" style="aspect-ratio:1;width:min(100%, 78vh);justify-self:center"></div>
        </div>
      </div>`,
    demo: () => import('../demos/molnar.js'),
    demoTarget: '.live-canvas',
    notes: `- Pionera absoluta. Va treballar amb ordinadors fins passats els 90 anys.
- Quadrats concèntrics amb els vèrtexs desplaçats. Alguns desapareixen.
- La idea clau del Creative Coding: dissenyes el sistema, no el resultat.`,
  },
  {
    id: 'processing',
    title: 'Processing',
    minutes: 0.75,
    html: () => `
      <div class="slide">
        <div class="split">
          <div class="stack">
            <div class="kicker">02 · processing</div>
            <h1 style="font-size:calc(var(--fs) * clamp(28px,4.6vw,88px))">PROCESSING</h1>
            <p>2001 · Casey Reas i Ben Fry<br><span class="muted">MIT Media Lab</span></p>
            <div class="panel">${codeBlock(`
void setup() {
  size(800, 600);
}

void draw() {
  ellipse(mouseX, mouseY, 50, 50);
}`)}</div>
          </div>
          <div class="live-canvas panel" style="padding:0"></div>
        </div>
      </div>`,
    demo: () => import('../demos/firstSketch.js'),
    demoTarget: '.live-canvas',
    notes: `- Un "sketchbook": no és un projecte, és un esbós. Prems Play i ho veus.
- setup() un cop, draw() 60 vegades per segon. Aquest és tot el model mental.
- Aquest codi és el "hola món" de milers d'artistes. Tecla x neteja.`,
  },
  {
    id: 'processing-demo',
    title: 'Demo Processing (app)',
    minutes: 1.25,
    html: () => `
      <div class="slide">
        <div class="split">
          <div class="stack">
            <div class="kicker">demo · processing real</div>
            <h2>T3chFest 2019 <span class="c-magenta">→</span><br>${CONFIG.event}</h2>
            <p>El volum del micro<br>controla la mida del logo.</p>
            <p class="c-yellow pixel" style="font-size:calc(var(--fs) * clamp(14px,1.6vw,28px))">⌘ + TAB → PROCESSING → ⌘ + R</p>
          </div>
          <div class="panel compact">${codeBlock(`
import processing.sound.*;

Amplitude loudness;
PShape logo;

void setup() {
  size(1280, 720);
  logo = loadShape("logo.svg");
  AudioIn mic = new AudioIn(this, 0);
  mic.start();
  loudness = new Amplitude(this);
  loudness.input(mic);
}

void draw() {
  background(0);
  float w = map(loudness.analyze(), 0, 0.5, 40, width);
  shape(logo, (width - w) / 2, (height - w / 5) / 2, w, w / 5);
}`)}</div>
        </div>
      </div>`,
    notes: `- Fa uns anys vaig fer aquesta demo a T3chFest amb Processing.
- Canvia a Processing (Cmd+Tab), obre processing/GirotronicaClap i prem Cmd+R.
- Demana que aplaudeixin: el logo creix amb el volum.
- Cmd+Q i tornes aquí.`,
  },
  {
    id: 'aplaudiu',
    title: 'Aplaudiu! (versió web)',
    minutes: 1.25,
    bg: false,
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/clapLogo.js'),
    notes: `- La mateixa idea, 2026, al navegador amb p5.js + Web Audio.
- Ara és un joc: l'energia s'acumula mentre aplaudiu i baixa si pareu.
- Objectiu: MAX POWER.
Tecles: r reinicia · w forçar victòria · +/- sensibilitat micro · mantén Q = micro simulat`,
  },
  {
    id: 'p5',
    title: 'p5.js + QR',
    minutes: 0.75,
    stage: 'rings',
    html: () => `
      <div class="slide">
        <div class="split">
          <div class="stack">
            <div class="kicker">03 · p5.js</div>
            <h1 style="font-size:calc(var(--fs) * clamp(28px,4.6vw,88px))">P5.JS</h1>
            <p>Processing, al navegador.<br><span class="muted">2014 · Lauren Lee McCarthy</span></p>
            <div class="panel">${codeBlock(`
function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  circle(mouseX, mouseY, 50);
}`)}</div>
          </div>
          <div class="stack" style="align-items:center">
            <p class="pixel c-yellow" style="font-size:calc(var(--fs) * clamp(14px,1.8vw,32px))">TRAIEU EL MÒBIL</p>
            <div data-qr="big"></div>
          </div>
        </div>
      </div>`,
    notes: `- Mateixa filosofia que Processing, però JavaScript i una URL. Cap instal·lació.
- Una comunitat que posa l'accessibilitat i la inclusió al centre.
- Que escanegin el QR ara: les demos següents les controlen ells.`,
  },
  {
    id: 'anells',
    title: 'Anells (control des del mòbil)',
    minutes: 1.5,
    bg: false,
    stage: 'rings',
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/rings.js'),
    notes: `- Remake de la demo de 2019: ara amb p5.js i Firebase Realtime Database.
- Tothom controla els mateixos paràmetres: l'últim que toca, guanya. Caos col·lectiu.
- Fixeu-vos en el panell: veieu en groc el que canvieu.
Tecles: g panell local (pla B) · r reinicia valors`,
  },
  {
    id: 'missatges',
    title: 'Missatges a la pluja',
    minutes: 1.25,
    bg: false,
    stage: 'messages',
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/messages.js'),
    notes: `- Envieu una paraula des del mòbil (màxim 20 caràcters, amb filtre).
- Cada lletra cau com a pluja digital i es fixa al seu lloc.
Tecles: w envia una paraula de prova (pla B)`,
  },
  {
    id: 'shaders',
    title: 'Shaders',
    minutes: 1,
    stage: 'idle',
    html: () => `
      <div class="slide">
        <div class="kicker">04 · shaders</div>
        <h2>Un programa per a <span class="c-magenta">cada píxel</span>. Tots alhora.</h2>
        <div class="split">
          <div class="stack">
            <div class="panel magenta">${codeBlock(INTRO_SHADER)}</div>
            <p class="muted" style="font-size:calc(var(--fs) * clamp(16px,1.6vw,30px))">1920 × 1080 × 60 fps = <span class="c-yellow">124 milions</span> d'execucions per segon</p>
          </div>
          <div class="live-canvas panel magenta keep-colors" style="padding:0"></div>
        </div>
      </div>`,
    demo: () => import('../demos/shaderIntro.js'),
    demoTarget: '.live-canvas',
    notes: `- Canvi de paradigma: no dibuixes formes. Escrius el color d'UN píxel, i la GPU ho executa per a tots en paral·lel.
- Entrada: la coordenada del píxel i el temps. Sortida: un color.
- 5 línies → aquesta animació. Ara apliquem-ho a la càmera.`,
  },
  {
    id: 'glitch',
    title: 'Shader glitch (càmera)',
    minutes: 1.75,
    bg: false,
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/glitchCam.js'),
    notes: `- Cada efecte són poques línies dins del mateix fragment shader.
- Activa'ls d'un en un: 1 block glitch · 2 pixelat · 3 RGB · 4 paleta 8-bit · 5 tèrmica · 6 datamosh · 7 CRT · 0 cap.
- El micro controla la intensitat: demaneu que cridin.
- m mirall`,
  },
  {
    id: 'webgpu',
    title: 'WebGPU',
    minutes: 0.75,
    stage: 'particles',
    html: () => `
      <div class="slide">
        <div class="kicker">05 · webgpu</div>
        <h2>La GPU ja no només pinta:<br><span class="c-cyan">també calcula</span>.</h2>
        <div class="panel cyan">${codeBlock(`
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  var p = particles[id.x];
  let d = attractor - p.pos;
  p.vel = p.vel * 0.96 + d / dot(d, d) * force;
  p.pos += p.vel;
  particles[id.x] = p;
}`)}</div>
        <p class="pixel c-yellow" style="font-size:calc(var(--fs) * clamp(14px,1.6vw,28px))">1.000.000 PARTÍCULES · 60 FPS · AL NAVEGADOR</p>
      </div>`,
    notes: `- WebGL només sabia pintar. WebGPU porta els compute shaders: càlcul general a la GPU.
- Cada partícula és un fil d'execució: un milió de fils, cada frame.
- Mòbils a punt: ara cadascun de vosaltres serà un eixam.`,
  },
  {
    id: 'particules',
    title: 'Partícules WebGPU (un eixam per mòbil)',
    minutes: 1.75,
    bg: false,
    stage: 'particles',
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/particles.js'),
    notes: `- Cada mòbil és un atractor amb el seu color. Arrossegueu el dit per moure el vostre eixam.
- Sense mòbils hi ha 3 atractors fantasma. Amb el ratolí (clic i arrossega) en pots afegir un.
- Feu soroll: el micro afegeix turbulència.
Tecles: s remolí · f estela`,
  },
  {
    id: 'final',
    title: 'TOT JUNT',
    minutes: 1.5,
    bg: false,
    stage: 'finale',
    html: () => `<div class="slide">${full}</div>`,
    demo: () => import('../demos/finale.js'),
    notes: `- Tot a la vegada: càmera amb shader, partícules WebGPU, els vostres mòbils, les vostres paraules i el micro.
- Demana: moveu els eixams, envieu paraules i, per acabar, el MÉS FORT possible.
Tecles: l logo · p paleta · d datamosh · w paraula de prova`,
  },
  {
    id: 'gracies',
    title: 'Ara us toca',
    minutes: 0.5,
    stage: 'idle',
    html: () => `
      <div class="slide">
        <div class="split">
          <div class="stack">
            <h2 class="glitch" data-text="ARA US TOCA">ARA US TOCA</h2>
            <ul class="stack resources">
              ${RESOURCES.map((r) => `<li>▸ <a href="${r.url}" target="_blank" rel="noopener">${r.name}</a> <span class="muted">· ${r.note}</span></li>`).join('')}
            </ul>
            <p class="byline">GRÀCIES! · ${CONFIG.speaker} · ${CONFIG.handle}</p>
          </div>
          <div class="stack" style="align-items:center">
            <p class="pixel c-yellow" style="font-size:calc(var(--fs) * clamp(13px,1.6vw,30px))">CODI I RECURSOS</p>
            <div data-qr="repo" data-qr-label="github.com/nucliweb/creative-coding"></div>
          </div>
        </div>
      </div>`,
    notes: `- Tot el que heu vist és al repo (slides, demos i sketch de Processing) i el QR porta directament als recursos.
- Repte: Genuary al gener. Un sketch al dia.
- Gràcies!`,
  },
];
