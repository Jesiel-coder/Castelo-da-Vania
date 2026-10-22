import { Player } from "./player.js";
import { salas } from "./salas.js";
import { Boss } from "./boss.js";
import { criarInimigo, desenharOnda } from "./inimigos.js";

// ==========================================
// CONFIGURAÇÃO DO CANVAS
// ==========================================

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1024;
canvas.height = 576;

ctx.imageSmoothingEnabled = false;

const gravity = 0.45;

// ==========================================
// JOGADOR
// ==========================================

const player = new Player({
    position: { x: 0, y: 430 },
    imageSrc: "./img/spritesheet.png"
});

const boss = new Boss({
    position: { x: 1100, y: 0 },       // o y certo é colocado no resetarBoss
    imageSrc: "./img/boss.png"
});
const projeteisBoss = [];       
const minions = [];   // capangas invocados pelo boss
const inimigos = [];
const ondasSonicas = [];

// ==========================================
// SALA E RECURSOS
// ==========================================

let sala = salas.tutorial;

let larguraMundo = sala.largura * sala.escala;

const sky = new Image();
const level = new Image();

// Imagem da tela final
const telaFinalImg = new Image();
telaFinalImg.src = "./img/thanks.png";

const menuImg = new Image();
menuImg.src = "./img/menu_bg.png";

const gameOverImg = new Image();
gameOverImg.src = "./img/gameover_bg.png";

const camera = { x: 0 };

let onGround = false;
let mostrarInimigos = false;
let pulosUsados = 0;
let lastTime = 0;
let vida = 6;
const vidaMax = 6;
let invulneravelAte = 0;
const tiros = [];

// ==========================================
// TOCHAS E ESCURIDÃO (OTIMIZADO)
// ==========================================

const tochas = [
    { x: 2096, y: 336 },
    { x: 1617, y: 343 },
    { x: 1203, y: 338 },
    { x: 1007, y: 339 },
    { x: 590, y: 336 },
    { x: 113, y: 344 }
];

const canvasEscuridao = document.createElement("canvas");
canvasEscuridao.width = canvas.width;
canvasEscuridao.height = canvas.height;
const ctxEscuridao = canvasEscuridao.getContext("2d");

function dispararTiro() {
    // Impede o disparo durante a recarga
    if (player.isReloading) return;

    const timestamp = performance.now();

    // O método shoot controla a animação e a munição
    if (!player.shoot(timestamp)) return;

    const velocidade = 9;
    const tamanho = 8;

    tiros.push({
        x: player.facingRight
            ? player.position.x + player.width
            : player.position.x - tamanho,

        y: player.position.y + player.height * 0.15,

        vx: player.facingRight ? velocidade : -velocidade,
        tamanho: tamanho
    });
}

function atualizarTiros() {
    for (let i = tiros.length - 1; i >= 0; i--) {
        const tiro = tiros[i];

        // Guarda a posição anterior
        const xAnterior = tiro.x;

        // Move o projétil
        tiro.x += tiro.vx;

        // Verifica se saiu dos limites do mundo
        if (tiro.x < 0 || tiro.x > larguraMundo) {
            tiros.splice(i, 1);
            continue;
        }

        let colidiu = false;

        // Verifica colisão com plataformas
        if (sala.platforms) {
            for (const plataforma of sala.platforms) {
                if (
                    tiro.x + tiro.tamanho > plataforma.x &&
                    tiro.x < plataforma.x + plataforma.w &&
                    tiro.y + 4 > plataforma.y &&
                    tiro.y < plataforma.y + plataforma.h
                ) {
                    colidiu = true;
                    break;
                }
            }
        }

        // Verifica colisão com blocos sólidos
        if (!colidiu && sala.solidos) {
            for (const bloco of sala.solidos) {
                if (
                    tiro.x + tiro.tamanho > bloco.x &&
                    tiro.x < bloco.x + bloco.w &&
                    tiro.y + 4 > bloco.y &&
                    tiro.y < bloco.y + bloco.h
                ) {
                    colidiu = true;
                    break;
                }
            }
        }

        // Remove o tiro ao colidir com um obstáculo
        if (colidiu) {
            tiros.splice(i, 1);
        }
    }
}  


function desenharTiros() {
    ctx.fillStyle = "#ffcc00";

    for (const tiro of tiros) {
        ctx.fillRect(
            tiro.x - camera.x,
            tiro.y,
            tiro.tamanho,
            4
        );
    }
}

// Evita processar o mesmo evento várias vezes.
const eventosAtivados = new Set();

// ==========================================
// TECLAS
// ==========================================

const keys = {
    d: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    l: { pressed: false },
    e: { pressed: false }
};

let opcaoGameOver = 0;
// 0 = Reiniciar
// 1 = Menu Principal

// Guarda coisas que já aconteceram no jogo (chefe derrotado, tela final, etc).
const estado = {
    menu: true,        // Começa no menu inicial
    bossMorto: false,
    puloDuplo: false,
    morreu: false,     // Novo estado para game over
    fim: false
};

// Para depuração no console do navegador
window.estado = estado;

// ==========================================
// CARREGAMENTO DE SALAS
// ==========================================

function carregarSala(nova) {
    if (!nova) {
        console.error("Tentativa de carregar uma sala inexistente.");
        return;
    }

    sala = nova;

    larguraMundo = sala.largura * sala.escala;

    // Limpa as teclas para evitar movimento involuntário durante a transição.
    keys.d.pressed = false;
    keys.a.pressed = false;
    keys.s.pressed = false;
    keys.l.pressed = false;
    keys.e.pressed = false;

    // Carrega o cenário.
    level.src = sala.cenario;

    level.onload = () => {
        console.log("Tamanho da imagem:", level.naturalWidth, level.naturalHeight);
    };

    // Carrega o céu somente se a sala possuir um.
    if (sala.ceu) {
        sky.src = sala.ceu;
    } else {
        sky.removeAttribute("src");
    }

    // Reinicia a câmera.
    camera.x = 0;

    // Reinicia a lista de eventos da nova sala.
    eventosAtivados.clear();
        spawnarInimigos(nova);

        // Ao entrar na sala do boss (e ele ainda vivo), reinicia a luta
    if (nova === salas.boss && !estado.bossMorto) resetarBoss();

    console.log("Sala carregada:", sala.cenario);
}

carregarSala(salas.tutorial);

// ==========================================
// EVENTOS E TROCA DE SALAS / TELA FINAL
// ==========================================

function verificarEventos() {
    if (!sala.eventList) return false;

    for (const evento of sala.eventList) {
        if (eventosAtivados.has(evento.id)) continue;

        // Evento com condição: só vale depois que ela for cumprida.
        if (evento.condicao && !estado[evento.condicao]) continue;

        if (evento.w !== undefined) {
            // EVENTO EM ÁREA (como o baú ou portas): jogador dentro do retângulo e apertando E.
            const dentro =
                player.position.x < evento.x + evento.w &&
                player.position.x + player.width > evento.x &&
                player.position.y < evento.y + evento.h &&
                player.position.y + player.height > evento.y;

            if (!dentro || !keys.e.pressed) continue;
        } else {
            // EVENTO EM LINHA (como o do corredor): só passar do x.
            if (player.position.x + player.width < evento.x) continue;
        }

        // Ativa a Tela Final (Baú)
        if (evento.acao === "telaFinal") {
            eventosAtivados.add(evento.id);
            estado.fim = true;
            return true;
        }

        // Transição de Sala
        if (evento.acao === "trocarSala") {
            const destino = salas[evento.destino];

            if (!destino) {
                console.error("Sala não encontrada:", evento.destino);
                eventosAtivados.add(evento.id);
                continue;
            }

            console.log("Trocando de sala:", evento.destino);

            eventosAtivados.add(evento.id);
            carregarSala(destino);

            // Posiciona o jogador na entrada da nova sala.
            player.position.x = evento.spawn?.x ?? 0;
            player.position.y =
                evento.spawn?.y ?? destino.floorY - player.height;

            player.velocity.x = 0;
            player.velocity.y = 0;

            larguraMundo = destino.largura * destino.escala;
            onGround = true;

            return true;
        }
    }

    return false;
}

// ==========================================
// DEPURAÇÃO: MOSTRAR COORDENADAS COM CLIQUE
// ==========================================

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();

    const x = Math.round(
        (event.clientX - rect.left) *
        canvas.width / rect.width +
        camera.x
    );

    const y = Math.round(
        (event.clientY - rect.top) *
        canvas.height / rect.height
    );

    console.log("X:", x, "Y:", y);
});

// ==========================================
// PARALLAX
// ==========================================

const CEU_ESCALA = 3;

function desenharCeu() {
    if (!sala.ceu) return;

    if (!sky.complete || sky.naturalWidth === 0) {
        return;
    }

    const largura = sky.naturalWidth * CEU_ESCALA;
    const altura = sky.naturalHeight * CEU_ESCALA;

    const fator = sala.ceuFator ?? 0.1;

    const deslocamento = camera.x * fator;

    const offset =
        ((deslocamento % largura) + largura) % largura;

    for (
        let x = -Math.ceil(offset);
        x < canvas.width;
        x += largura
    ) {
        ctx.drawImage(
            sky,
            Math.round(x),
            0,
            largura,
            altura
        );
    }
}

// ==========================================
// DESENHAR CENÁRIO
// ==========================================

function desenharCenario() {
    if (!level.complete || level.naturalWidth === 0) {
        return;
    }

    const escala = sala.escala;
    const recorte = sala.recorte;

    if (!recorte || escala <= 0) {
        return;
    }

    const larguraVisivel = canvas.width / escala;

    const origemX = Math.max(
        0,
        Math.min(
            camera.x / escala,
            level.naturalWidth - larguraVisivel
        )
    );

    const origemY = Math.max(
        0,
        Math.min(
            recorte.y,
            level.naturalHeight
        )
    );

    const alturaDisponivel =
        level.naturalHeight - origemY;

    const alturaRecorte = Math.max(
        0,
        Math.min(
            recorte.h,
            alturaDisponivel
        )
    );

    if (alturaRecorte <= 0) return;

    const larguraDisponivel =
        level.naturalWidth - origemX;

    const larguraRecorte = Math.max(
        0,
        Math.min(
            larguraVisivel,
            larguraDisponivel
        )
    );

    if (larguraRecorte <= 0) return;

    const alturaDesenhada = alturaRecorte * escala;

    const destinoY = canvas.height - alturaDesenhada;

    ctx.drawImage(
        level,
        origemX,
        origemY,
        larguraRecorte,
        alturaRecorte,
        0,
        destinoY,
        larguraRecorte * escala,
        alturaDesenhada
    );
}

// ==========================================
// COLISÕES COM BLOCOS SÓLIDOS
// ==========================================

function resolverColisoesHorizontais(anterior) {
    if (!sala.solidos) return;

    for (const bloco of sala.solidos) {
        const esquerda = player.position.x;
        const direita = esquerda + player.width;

        const topo = player.position.y;
        const base = topo + player.height;

        const blocoDireita = bloco.x + bloco.w;
        const blocoBase = bloco.y + bloco.h;

        const sobrepoeY =
            base > bloco.y &&
            topo < blocoBase;

        if (!sobrepoeY) continue;

        const direitaAnterior =
            anterior.x + player.width;

        if (
            player.velocity.x > 0 &&
            direita > bloco.x &&
            direitaAnterior <= bloco.x
        ) {
            player.position.x =
                bloco.x - player.width;
        } else if (
            player.velocity.x < 0 &&
            esquerda < blocoDireita &&
            anterior.x >= blocoDireita
        ) {
            player.position.x = blocoDireita;
        }
    }
}

function resolverColisoesVerticais(anterior) {
    if (!sala.solidos) return;

    for (const bloco of sala.solidos) {
        const esquerda = player.position.x;
        const direita = esquerda + player.width;

        const topo = player.position.y;
        const base = topo + player.height;

        const blocoDireita = bloco.x + bloco.w;
        const blocoBase = bloco.y + bloco.h;

        const sobrepoeX =
            direita > bloco.x &&
            esquerda < blocoDireita;

        if (!sobrepoeX) continue;

        const baseAnterior =
            anterior.y + player.height;

        if (
            player.velocity.y >= 0 &&
            base > bloco.y &&
            baseAnterior <= bloco.y
        ) {
            player.position.y =
                bloco.y - player.height;

            player.velocity.y = 0;
            onGround = true;
        } else if (
            player.velocity.y < 0 &&
            topo < blocoBase &&
            anterior.y >= blocoBase
        ) {
            player.position.y = blocoBase;
            player.velocity.y = 0;
        }
    }
}

// ==========================================
// COLISÃO COM O CHÃO
// ==========================================

function resolverChao() {
    if (
        player.position.y + player.height >=
        sala.floorY
    ) {
        player.position.y =
            sala.floorY - player.height;

        player.velocity.y = 0;
        onGround = true;
    }
}

// ==========================================
// COLISÃO COM PLATAFORMAS
// ==========================================

function resolverPlataformas(anterior) {
    if (!sala.platforms) return;

    for (const plataforma of sala.platforms) {
        const esquerda = player.position.x;
        const direita = esquerda + player.width;

        const base = player.position.y + player.height;
        const baseAnterior =
            anterior.y + player.height;

        const dentroX =
            direita > plataforma.x &&
            esquerda < plataforma.x + plataforma.w;

        if (
            dentroX &&
            player.velocity.y >= 0 &&
            base >= plataforma.y &&
            baseAnterior <= plataforma.y
        ) {
            player.position.y =
                plataforma.y - player.height;

            player.velocity.y = 0;
            onGround = true;
        }
    }
}

// ==========================================
// LIMITES DO MUNDO
// ==========================================

function limitarPosicao() {
    player.position.x = Math.max(
        0,
        Math.min(
            player.position.x,
            Math.max(0, larguraMundo - player.width)
        )
    );
}

    

// ==========================================
// CÂMERA
// ==========================================

function atualizarCamera() {
    const escala = sala.escala;

    camera.x =
        player.position.x +
        player.width / 2 -
        canvas.width / 2;

    camera.x = Math.max(
        0,
        Math.min(
            camera.x,
            Math.max(0, larguraMundo - canvas.width)
        )
    );

    camera.x = Math.round(camera.x / escala) * escala;
}

// ==========================================
// DANO, ESPINHOS E RESPAWN
// ==========================================

function reposicionarNoRespawn() {
    const r = sala.respawn ?? { x: 0, y: sala.floorY };

    player.position.x = r.x;
    player.position.y = r.y - player.height;
    player.velocity.x = 0;
    player.velocity.y = 0;
}

function sofrerDano(timestamp) {
    if (timestamp < invulneravelAte) return;

    vida--;
    invulneravelAte = timestamp + 1500;

    if (vida <= 0) {
        console.log("Game Over!");
        estado.morreu = true;
        return;
    }

    reposicionarNoRespawn();
}

function verificarEspinhos(timestamp, dt) {
    if (!sala.espinhos) return;

    for (const e of sala.espinhos) {
        // Posição atual e anterior da base (pé) do player usando o dt
        const baseAtual = player.position.y + player.height;
        const baseAntes = baseAtual - (player.velocity.y * dt);

        const esquerda = player.position.x;
        const direita = esquerda + player.width;

        const blocoDireita = e.x + e.w;
        const blocoBase = e.y + e.h;

        // 1. Verifica se está dentro da largura horizontal do espinho
        const dentroX = direita > e.x && esquerda < blocoDireita;

        if (!dentroX) continue;

        // 2. Verifica se o pé cruzou a linha de cima do espinho neste frame
        const cruzouPorCima = baseAntes <= e.y && baseAtual >= e.y;

        // Ou se o personagem está totalmente dentro da área do espinho
        const dentroY = baseAtual > e.y && player.position.y < blocoBase;

        if (cruzouPorCima || dentroY) {
            sofrerDano(timestamp);
            return;
        }
    }
}

// ==========================================
// TELA FINAL DE AGRADECIMENTO
// ==========================================

function desenharTelaFinal() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!telaFinalImg.complete || telaFinalImg.naturalWidth === 0) return;

    const fator = Math.min(
        canvas.width / telaFinalImg.naturalWidth,
        canvas.height / telaFinalImg.naturalHeight
    );

    const w = telaFinalImg.naturalWidth * fator;
    const h = telaFinalImg.naturalHeight * fator;

    ctx.drawImage(
        telaFinalImg,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h
    );
}

function desenharMenuInicial() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!menuImg.complete || menuImg.naturalWidth === 0) return;

    const fator = Math.min(
        canvas.width / menuImg.naturalWidth,
        canvas.height / menuImg.naturalHeight
    );

    const w = menuImg.naturalWidth * fator;
    const h = menuImg.naturalHeight * fator;

    ctx.drawImage(
        menuImg,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h
    );
}

function desenharGameOver() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameOverImg.complete || gameOverImg.naturalWidth === 0) return;

    const fator = Math.min(
        canvas.width / gameOverImg.naturalWidth,
        canvas.height / gameOverImg.naturalHeight
    );

    const w = gameOverImg.naturalWidth * fator;
    const h = gameOverImg.naturalHeight * fator;

    ctx.drawImage(
        gameOverImg,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h
    );
    // Indicador da opção selecionada.
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";

    const x = canvas.width / 2 - 235;
    const y = opcaoGameOver === 0 ? 337 : 405;

    ctx.fillText("▶", x, y);

    ctx.textAlign = "left";
}

function iluminarTochas() {
    if (sala !== salas.corredor) return;

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    for (const tocha of tochas) {
        const x = tocha.x - camera.x;
        const y = tocha.y;
        const raio = 170;

        const luz = ctx.createRadialGradient(
            x, y, 5,
            x, y, raio
        );

        luz.addColorStop(0, "rgba(255, 190, 80, 0.9)");
        luz.addColorStop(0.3, "rgba(255, 120, 30, 0.4)");
        luz.addColorStop(0.7, "rgba(180, 50, 10, 0.12)");
        luz.addColorStop(1, "rgba(255, 60, 0, 0)");
        ctx.fillStyle = luz;

        ctx.beginPath();
        ctx.arc(x, y, raio, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function aplicarEscuridaoCorredor() {
    if (sala !== salas.corredor) return;

    // Escurece a camada auxiliar inteira
    ctxEscuridao.clearRect(
        0, 0,
        canvasEscuridao.width,
        canvasEscuridao.height
    );

    ctxEscuridao.fillStyle = "rgba(0, 0, 0, 0.985)";
    ctxEscuridao.fillRect(
        0, 0,
        canvasEscuridao.width,
        canvasEscuridao.height
    );

    // Abre uma área de visão em cada tocha
    ctxEscuridao.globalCompositeOperation = "destination-out";

    for (const tocha of tochas) {
        const xTela = tocha.x - camera.x;
        const yTela = tocha.y;
        const raio = 170;

        const luz = ctxEscuridao.createRadialGradient(
            xTela, yTela, 10,
            xTela, yTela, raio
        );

        luz.addColorStop(0, "rgba(0, 0, 0, 1)");
        luz.addColorStop(0.4, "rgba(0, 0, 0, 0.85)");
        luz.addColorStop(0.75, "rgba(0, 0, 0, 0.4)");
        luz.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctxEscuridao.fillStyle = luz;
        ctxEscuridao.beginPath();
        ctxEscuridao.arc(xTela, yTela, raio, 0, Math.PI * 2);
        ctxEscuridao.fill();
    }

    ctxEscuridao.globalCompositeOperation = "source-over";

    // Aplica a escuridão sobre o jogo
    ctx.drawImage(canvasEscuridao, 0, 0);
}

// ==========================================
// BOSS: CAVALEIRO SOMBRIO
// ==========================================

function retangulosSeTocam(a, b) {
    return (
        a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y
    );
}

function retanguloPlayer() {
    return { x: player.position.x, y: player.position.y, w: player.width, h: player.height };
}

function retanguloBoss() {
    return { x: boss.position.x, y: boss.position.y, w: boss.width, h: boss.height };
}

// Coloca o boss vivo e cheio de vida no início da luta
function resetarBoss() {
    boss.vida = boss.vidaMax;
    boss.estado = "idle";
    boss.setAnimacao("idle");
    boss.position.x = 1100;
    boss.position.y = salas.boss.floorY - boss.alturaNoChao;
    boss.proximoAtaque = performance.now() + 1500;   // respira antes do 1º ataque
    boss.piscaAte = 0;
    projeteisBoss.length = 0;
    inimigos.length = 0; ondasSonicas.length = 0;
}

// Dano no jogador vindo do boss (sem teleportar para o respawn, só um pulinho)
function sofrerDanoBoss(timestamp) {
    if (timestamp < invulneravelAte) return;

    vida--;
    invulneravelAte = timestamp + 1500;

    if (vida <= 0) {
        estado.morreu = true;
        return;
    }

    player.velocity.y = -6;
    onGround = false;
}

// Os tiros do jogador acertam o boss
function receberTirosNoBoss(timestamp) {
    const alvo = retanguloBoss();

    for (let i = tiros.length - 1; i >= 0; i--) {
        const t = tiros[i];
        const tiroRect = { x: t.x, y: t.y, w: t.tamanho, h: 4 };

        if (retangulosSeTocam(tiroRect, alvo)) {
            tiros.splice(i, 1);
            boss.vida--;
            boss.piscaAte = timestamp + 120;
        }
    }
}

// Zona na frente do boss onde o golpe machuca
function zonaDoGolpe(alcance) {
    return {
        x: boss.facingRight ? boss.position.x + boss.width : boss.position.x - alcance,
        y: boss.position.y + boss.height * 0.15,
        w: alcance,
        h: boss.height * 0.85
    };
}

function dispararProjetilBoss() {
    const raio = 12;

    projeteisBoss.push({
        x: boss.facingRight ? boss.position.x + boss.width + raio : boss.position.x - raio,
        y: boss.position.y + boss.height * 0.4,      // centro da bola
        vx: (boss.facingRight ? 1 : -1) * 5.5,
        raio: raio
    });
}

function atualizarProjeteisBoss(timestamp, dt) {
    for (let i = projeteisBoss.length - 1; i >= 0; i--) {
        const p = projeteisBoss[i];
        p.x += p.vx * dt;

        // Saiu do mundo
        if (p.x < 0 || p.x > larguraMundo) {
            projeteisBoss.splice(i, 1);
            continue;
        }

        const rect = { x: p.x - p.raio, y: p.y - p.raio, w: p.raio * 2, h: p.raio * 2 };

        // Bateu numa parede
        let bateu = false;
        if (sala.solidos) {
            for (const b of sala.solidos) {
                if (retangulosSeTocam(rect, b)) { bateu = true; break; }
            }
        }

        // Acertou o jogador
        if (!bateu && retangulosSeTocam(rect, retanguloPlayer())) {
            sofrerDanoBoss(timestamp);
            bateu = true;
        }

        if (bateu) projeteisBoss.splice(i, 1);
    }
}

function desenharProjeteisBoss() {
    for (const p of projeteisBoss) {
        const x = p.x - camera.x;
        const brilho = ctx.createRadialGradient(x, p.y, 2, x, p.y, p.raio * 1.6);
        brilho.addColorStop(0, "rgba(255, 255, 255, 1)");
        brilho.addColorStop(0.3, "rgba(190, 100, 255, 0.95)");
        brilho.addColorStop(1, "rgba(120, 30, 200, 0)");

        ctx.fillStyle = brilho;
        ctx.beginPath();
        ctx.arc(x, p.y, p.raio * 1.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function iniciarAtaqueBoss(nome) {
    boss.estado = nome;
    boss.setAnimacao(nome);
    boss.velocity.x = 0;
    boss.disparou = false;
}

function atualizarBoss(timestamp, dt) {
    if (sala !== salas.boss) return;

    // --- MORTO: só fica o pó no chão ---
    if (boss.estado === "morto") return;

    // --- MORRENDO: espera a animação acabar e libera a saída ---
    if (boss.estado === "morte") {
        if (boss.terminou) {
            boss.estado = "morto";
            boss.setAnimacao("fim");
            estado.bossMorto = true;   // libera a porta de saída
            estado.puloDuplo = true;   // libera o pulo duplo
        }
        return;
    }

    // --- TIROS DO JOGADOR ---
    receberTirosNoBoss(timestamp);

    if (boss.vida <= 0) {
        boss.estado = "morte";
        boss.setAnimacao("morte");
        boss.velocity.x = 0;
        projeteisBoss.length = 0;
        minions.length = 0;
        return;
    }

    // Fase 2: com metade da vida ou menos, fica mais rápido e agressivo
    const mult = boss.vida <= boss.vidaMax / 2 ? 1.5 : 1;

    const centroBoss = boss.position.x + boss.width / 2;
    const centroPlayer = player.position.x + player.width / 2;
    const distancia = centroPlayer - centroBoss;       // positivo = jogador à direita
    const dist = Math.abs(distancia);

    // --- ATACANDO ---
    if (boss.estado.startsWith("ataque")) {
        boss.velocity.x = 0;

        // Golpes corpo a corpo: machucam só nos frames ativos
        const golpe = boss.golpes[boss.estado];
        if (golpe && boss.frame >= golpe.ini && boss.frame <= golpe.fim) {
            if (retangulosSeTocam(zonaDoGolpe(golpe.alcance), retanguloPlayer())) {
                sofrerDanoBoss(timestamp);
            }
        }

        // Projétil: sai uma vez, no frame certo
        if (boss.estado === "ataque3" && boss.frame >= boss.frameTiro && !boss.disparou) {
            boss.disparou = true;
            dispararProjetilBoss();
        }

            // Invocação: os capangas surgem uma vez, no frame certo
        if (boss.estado === "ataque4" && boss.frame >= boss.frameInvocar && !boss.disparou) {
            boss.disparou = true;
            invocarMinions(timestamp);
        }

        // Fim da animação: volta ao idle e começa o cooldown
        if (boss.terminou) {
            boss.estado = "idle";
            boss.setAnimacao("idle");
            boss.proximoAtaque = timestamp + boss.cooldownAtaque / mult;
        }
    }
   // --- IDLE / ANDAR ---
else {
    boss.facingRight = distancia > 0; // sempre olha para o jogador

    const perto = dist <= boss.alcanceAtaque;
    let ataque = null;

    if (timestamp >= boss.proximoAtaque) {
        // Sem capangas vivos, tem chance de invocar (maior na fase 2)
        if (
            !inimigos.some(inimigo => inimigo.vida > 0) &&
            Math.random() < 0.35 * mult
        ) {
            ataque = "ataque4";
        } else if (perto) {
            ataque = Math.random() < 0.5 ? "ataque1" : "ataque2";
        } else if (dist > boss.distanciaProjetil) {
            ataque = "ataque3";
        }
    }

    if (ataque) {
        iniciarAtaqueBoss(ataque);
    } else if (!perto) {
        boss.estado = "andar";
        boss.setAnimacao("andar");
        boss.velocity.x = (distancia > 0 ? 1 : -1) * boss.velocidade * mult;
    } else {
        boss.estado = "idle";
        boss.setAnimacao("idle");
        boss.velocity.x = 0;
    }
}

// Movimento horizontal (com dt) e limites da sala
boss.position.x += boss.velocity.x * dt;
boss.position.x = Math.max(0, Math.min(boss.position.x, 1486 - boss.width));

// Encostar no boss também machuca
if (retangulosSeTocam(retanguloBoss(), retanguloPlayer())) {
    sofrerDanoBoss(timestamp);
}
}
// Barra de vida do boss (embaixo da tela)
function desenharVidaBoss() {
    if (sala !== salas.boss) return;
    if (boss.estado === "morte" || boss.estado === "morto") return;

    const largura = 400;
    const x = (canvas.width - largura) / 2;
    const y = canvas.height - 40;

    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, largura, 14);

    ctx.fillStyle = "#a33cff";
    ctx.fillRect(x, y, largura * Math.max(0, boss.vida) / boss.vidaMax, 14);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, largura, 14);

    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("CAVALEIRO SOMBRIO", canvas.width / 2, y - 6);
    ctx.textAlign = "left";
}

// ==========================================
// INIMIGOS: ZUMBI E GÁRGULA
// ==========================================

function retanguloDe(e) {
    return { x: e.position.x, y: e.position.y, w: e.width, h: e.height };
}

// Zona na frente do inimigo (arranhão)
function zonaFrente(e, alcance) {
    return {
        x: e.facingRight ? e.position.x + e.width : e.position.x - alcance,
        y: e.position.y + e.height * 0.2,
        w: alcance,
        h: e.height * 0.8
    };
}

function inimigosVivos() {
    return inimigos.filter(i => i.estado !== "morto" && i.estado !== "morrendo").length;
}

function spawnarInimigos(s) {
    inimigos.length = 0;
    ondasSonicas.length = 0;

    console.log("=== SPAWN DE INIMIGOS ===");
    console.log("Cenário:", s.cenario);
    console.log("Inimigos configurados:", s.inimigos);

    if (!s.inimigos || s.inimigos.length === 0) {
        console.warn("Nenhum inimigo configurado nesta sala.");
        return;
    }

    for (const e of s.inimigos) {
        const chao = e.y ?? e.chao ?? s.floorY;

        const inimigo = criarInimigo(e.tipo, e.x, chao, {
            minX: e.minX ?? 40,
            maxX: e.maxX ?? (s.largura * s.escala - 40)
        });

        inimigos.push(inimigo);

        console.log("Inimigo criado:", {
            tipo: inimigo.tipo,
            x: inimigo.position.x,
            y: inimigo.position.y,
            largura: inimigo.width,
            altura: inimigo.height,
            estado: inimigo.estado,
            imagem: inimigo.image.src,
            imagemCarregada: inimigo.image.complete,
            dimensoesImagem: `${inimigo.image.naturalWidth}x${inimigo.image.naturalHeight}`
        });

        inimigo.image.onload = () => {
            console.log(
                `Imagem de ${inimigo.tipo} carregada:`,
                inimigo.image.naturalWidth,
                "x",
                inimigo.image.naturalHeight
            );
        };

        inimigo.image.onerror = () => {
            console.error("ERRO AO CARREGAR IMAGEM:", inimigo.image.src);
        };
    }
    console.log("FINAL DO SPAWN:", inimigos.length);
    console.log("Total de inimigos criados:", inimigos.length);
}

// Invocação do boss: um inimigo por vez
// 75% de chance de zumbi e 25% de chance de gárgula
function invocarMinions(timestamp) {
    // Não invoca outro enquanto houver um inimigo vivo
    if (inimigos.some(inimigo => inimigo.vida > 0)) {
        return;
    }

    const chao = salas.boss.floorY;

    // Alterna aleatoriamente o lado da invocação
    const esquerda = Math.random() < 0.5;
    const x = esquerda
        ? Math.max(60, boss.position.x - 110)
        : Math.min(1420, boss.position.x + boss.width + 70);

    // Sorteia o tipo do inimigo
    const tipo = Math.random() < 0.25 ? "gargula" : "zumbi";

    const opcoes = {
        acordado: true,
        minX: 50,
        maxX: 1480
    };

    inimigos.push(criarInimigo(tipo, x, chao, opcoes));
}

// Os tiros do jogador acertam o inimigo
function receberTirosNoInimigo(ini, timestamp) {
    const alvo = retanguloDe(ini);

    for (let i = tiros.length - 1; i >= 0; i--) {
        const t = tiros[i];

        if (!retangulosSeTocam({ x: t.x, y: t.y, w: t.tamanho, h: 4 }, alvo)) continue;

        tiros.splice(i, 1);                       // o tiro some sempre

        if (ini.estado === "agachado") continue;  // zumbi agachado é imortal

        ini.vida--;
        ini.piscaAte = timestamp + 120;

        if (ini.estado === "idle") ini.estado = "perseguir";   // acordou a gárgula

        // Zumbi cambaleia ao levar tiro
        if (ini.cfg.cambaleia && ini.estado === "perseguir") {
            ini.estado = "dano";
            ini.setAnimacao("dano");
        }
    }
}

// ---------- IA DO ZUMBI ----------
function iaZumbi(z, timestamp, dx, dist, dy) {
    const jogador = retanguloPlayer();

    // Distância horizontal entre as bordas dos personagens.
    const zEsquerda = z.position.x;
    const zDireita = z.position.x + z.width;
    const pEsquerda = jogador.x;
    const pDireita = jogador.x + jogador.w;

    let distanciaBordas;

    if (zDireita < pEsquerda) {
        distanciaBordas = pEsquerda - zDireita;
    } else if (pDireita < zEsquerda) {
        distanciaBordas = zEsquerda - pDireita;
    } else {
        distanciaBordas = 0;
    }

    const dir = dx > 0 ? 1 : -1;

    // Se o jogador se afastar mais de 60 px,
    // o zumbi interrompe o que estiver fazendo e se agacha.
    if (distanciaBordas > 200) {
        z.estado = "agachado";
        z.vx = 0;
        z.setAnimacao("agachar");
        return;
    }

    switch (z.estado) {
        case "agachado":
            z.vx = 0;
            z.setAnimacao("agachar");

            // Desperta quando o jogador chega a 50 px das bordas.
            if (distanciaBordas <= 200 && dy < 200) {
            z.estado = "levantando";
            z.setAnimacao("levantar");
            }
            break;

        case "levantando":
            z.vx = 0;

            if (z.terminou) {
                z.estado = "perseguir";
            }
            break;

        case "dano":
            z.vx = 0;

            if (z.terminou) {
                z.estado = "perseguir";
            }
            break;

        case "atacando": {
            z.vx = 0;

            const golpe = z.cfg.golpe;

            if (
                z.frame >= golpe.ini &&
                z.frame <= golpe.fim &&
                retangulosSeTocam(
                    zonaFrente(z, golpe.alcance),
                    retanguloPlayer()
                )
            ) {
                sofrerDanoBoss(timestamp);
            }

            if (z.terminou) {
                z.estado = "perseguir";
                z.proximoAtaque = timestamp + 1200;
            }
            break;
        }

        default:
            z.facingRight = dx > 0;

            if (
            distanciaBordas <= 35 &&
            timestamp >= z.proximoAtaque
            ) {
                z.estado = "atacando";
                z.vx = 0;
                z.setAnimacao("ataque");
            } else {
                z.setAnimacao("andar");
                z.vx = dir * z.cfg.velocidade;
            }
            break;
    }
}

// ---------- IA DA GÁRGULA ----------
function dispararOnda(g) {
    ondasSonicas.push({
        x: g.facingRight ? g.position.x + g.width + 20 : g.position.x - 20,
        y: g.position.y + g.height * 0.4,
        vx: (g.facingRight ? 1 : -1) * 4.5
    });
}

function iaGargula(g, timestamp, dx, dist) {
    const dir = dx > 0 ? 1 : -1;

    // Quanto mais ferida, mais rápida fica.
    const vidaRestante = Math.max(0, g.vida / g.vidaMax);
    const perdida = 1 - vidaRestante;
    const furia = 1 + perdida;

    // A velocidade de animação acompanha a fúria.
    g.velAnim = furia;

    switch (g.estado) {
        case "idle":
            g.setAnimacao("idle");

            if (dist < g.cfg.visao) {
                g.estado = "perseguir";
            }
            break;

        case "gritando":
            // Dispara a onda sonora durante a animação.
            if (g.frame >= g.cfg.frameGrito && !g.disparou) {
                g.disparou = true;
                dispararOnda(g);
            }

            if (g.terminou) {
                g.estado = "perseguir";
                g.proximoAtaque = timestamp + 2500 / furia;
            }
            break;

        default:
            g.facingRight = dx > 0;

            // O ataque sonoro só fica disponível com 45% da vida ou menos.
            if (vidaRestante <= 0.45 && dist > 120) {
                // A chance aumenta conforme a velocidade de ataque aumenta.
                const chanceBase = 0.005;
                const chance = chanceBase * furia;

                if (
                    timestamp >= g.proximoAtaque &&
                    Math.random() < chance
                ) {
                    g.estado = "gritando";
                    g.setAnimacao("ataque");
                    g.disparou = false;
                    break;
                }
            }

            // Movimento normal: mais velocidade quando perde vida.
            g.setAnimacao(perdida >= 0.4 ? "correr" : "andar");
            g.vx = dir * g.cfg.velocidade * furia;

            if (
                retangulosSeTocam(
                    {
                        x: g.position.x,
                        y: g.position.y,
                        w: g.width,
                        h: g.height
                    },
                    retanguloPlayer()
                )
            ) {
                sofrerDanoBoss(timestamp);
            }
            break;
    }
}

function atualizarInimigo(ini, timestamp, dt) {
    if (ini.estado === "morto") return;

    // Morrendo: espera a animação acabar
    if (ini.estado === "morrendo") {
        if (ini.terminou) ini.estado = "morto";
        return;
    }

    receberTirosNoInimigo(ini, timestamp);

    if (ini.vida <= 0) {
        ini.estado = "morrendo";
        ini.setAnimacao("morte");
        return;
    }

    const dx = (player.position.x + player.width / 2) - (ini.position.x + ini.width / 2);
    const dist = Math.abs(dx);
    const dy = Math.abs(player.position.y - ini.position.y);

    ini.vx = 0;

    if (ini.tipo === "zumbi") iaZumbi(ini, timestamp, dx, dist, dy);
    else iaGargula(ini, timestamp, dx, dist);

    // Movimento horizontal (com dt) e limites
    ini.position.x += ini.vx * dt;
    ini.position.x = Math.max(ini.minX, Math.min(ini.position.x, ini.maxX - ini.width));
}

function atualizarInimigos(timestamp, dt) {
    for (const ini of inimigos) atualizarInimigo(ini, timestamp, dt);
}

function atualizarOndas(timestamp, dt) {
    for (let i = ondasSonicas.length - 1; i >= 0; i--) {
        const o = ondasSonicas[i];
        o.x += o.vx * dt;

        if (o.x < 0 || o.x > larguraMundo) {
            ondasSonicas.splice(i, 1);
            continue;
        }

        const rect = { x: o.x - 22, y: o.y - 40, w: 44, h: 80 };

        let bateu = false;
        if (sala.solidos) {
            for (const b of sala.solidos) {
                if (retangulosSeTocam(rect, b)) { bateu = true; break; }
            }
        }

        if (!bateu && retangulosSeTocam(rect, retanguloPlayer())) {
            sofrerDanoBoss(timestamp);
            bateu = true;
        }

        if (bateu) ondasSonicas.splice(i, 1);
    }
}

// Chamar dentro do ctx.translate(-camera.x, 0)
function desenharInimigos(timestamp) {
    for (const ini of inimigos) {
        ini.draw(ctx, timestamp);
    }

    for (const o of ondasSonicas) {
        desenharOnda(ctx, o, timestamp);
    }
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================

function animate(timestamp) {
    requestAnimationFrame(animate);

    const dt =
        Math.min(timestamp - lastTime, 50) /
        (1000 / 60);

    lastTime = timestamp;

    // 1. Se estiver no Menu Inicial, desenha o menu e para por aqui
    if (estado.menu) {
        desenharMenuInicial();
        return;
    }

    // 2. Se o jogador morreu, desenha o Game Over e para por aqui
    if (estado.morreu) {
        desenharGameOver();
        return;
    }

    // 3. Se o jogo acabou (pegou o baú), desenha a tela final e para por aqui
    if (estado.fim) {
        desenharTelaFinal();
        return;
    }


    // Limpa o canvas.
    ctx.fillStyle = "black";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // --------------------------------------
    // MOVIMENTAÇÃO HORIZONTAL
    // --------------------------------------

   player.velocity.x = 0;

    if (!player.isCrouching && !player.isReloading) {
        if (keys.d.pressed) {
            player.velocity.x = 4;
        } else if (keys.a.pressed) {
            player.velocity.x = -4;
        }
    }

    // --------------------------------------
    // DISPARO
    // --------------------------------------

    if (keys.l.pressed) {
        dispararTiro();
    }

    atualizarTiros();

    // --------------------------------------
    // GUARDA A POSIÇÃO ANTERIOR
    // --------------------------------------

    const anterior = {
        x: player.position.x,
        y: player.position.y
    };

    // --------------------------------------
    // MOVIMENTAÇÃO HORIZONTAL
    // --------------------------------------

    player.position.x +=
        player.velocity.x * dt;

    resolverColisoesHorizontais(anterior);

    limitarPosicao();

    // --------------------------------------
    // MOVIMENTAÇÃO VERTICAL
    // --------------------------------------

    onGround = false;

    player.position.y +=
        player.velocity.y * dt;

    resolverColisoesVerticais(anterior);

    resolverChao();
    
    resolverPlataformas(anterior);

    if (onGround) pulosUsados = 0;

    // --------------------------------------
    // GRAVIDADE
    // --------------------------------------

    if (!onGround) {
        player.velocity.y += gravity * dt;
    }

    // --------------------------------------
    // EVENTOS E ESPINHOS
    // --------------------------------------

    verificarEspinhos(timestamp, dt);

    verificarEventos();

    limitarPosicao();

    // Boss e projéteis dele
    atualizarBoss(timestamp, dt);
    atualizarProjeteisBoss(timestamp, dt);
    atualizarInimigos(timestamp, dt);
    atualizarOndas(timestamp, dt);

    // --------------------------------------
    // ATUALIZA CÂMERA
    // --------------------------------------

    atualizarCamera();

    // --------------------------------------
    // RENDERIZAÇÃO
    // --------------------------------------

    desenharCeu();

    desenharCenario();

    // Jogador (pisca enquanto está invulnerável).
        ctx.save();

    ctx.translate(-camera.x, 0);

    // Boss (desenhado antes, para o jogador ficar na frente). Pisca ao levar tiro.
    if (sala === salas.boss) {
        boss.draw(ctx, timestamp);
        ctx.globalAlpha = 1;
    }

    if (timestamp < invulneravelAte) {
        ctx.globalAlpha = Math.floor(timestamp / 100) % 2 ? 0.35 : 1;
    }
    desenharInimigos(timestamp);

    player.draw(ctx, timestamp, onGround);

    ctx.restore();

    desenharTiros();
    desenharProjeteisBoss();   

    // Efeito de luz das tochas e escuridão no corredor
    iluminarTochas();
    aplicarEscuridaoCorredor();

    // Vida (quadradinhos provisórios).
    for (let i = 0; i < vidaMax; i++) {
        ctx.fillStyle = i < vida ? "#d22" : "#333";
        ctx.fillRect(20 + i * 28, 20, 20, 20);
    }
    // HUD de munição
    for (let i = 0; i < player.maxAmmo; i++) {
        ctx.fillStyle = i < player.ammo ? "#ffcc00" : "#333";
        ctx.fillRect(20 + i * 28, 50, 20, 20);
    }

    if (mostrarInimigos) {
    const inimigosVivos = inimigos.filter(
        inimigo => inimigo.vida > 0
    ).length;

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(`Inimigos vivos: ${inimigosVivos}`, 20, 100);
}
    
        desenharVidaBoss();
}
// Inicia o jogo.
requestAnimationFrame(animate);

function iniciarJogo() {
    estado.menu = false;
    estado.morreu = false;
    estado.fim = false;

    vida = vidaMax;
    invulneravelAte = 0;

    estado.bossMorto = false;
    estado.puloDuplo = false;

    pulosUsados = 0;
    onGround = false;

    // Primeiro, reinicia o boss.
    // resetarBoss() limpa o array de inimigos.
    resetarBoss();

    // Depois, carrega a sala e cria os inimigos dela.
    carregarSala(salas.tutorial);

    player.position.x = 0;
    player.position.y = 430;

    player.velocity.x = 0;
    player.velocity.y = 0;

    camera.x = 0;

    console.log("Jogo iniciado!");
}

function voltarAoMenu() {
    estado.menu = true;
    estado.morreu = false;
    estado.fim = false;

    vida = vidaMax;
    invulneravelAte = 0;

    estado.bossMorto = false;
    estado.puloDuplo = false;

    pulosUsados = 0;
    onGround = false;

    carregarSala(salas.tutorial);

        resetarBoss();

    player.position.x = 0;
    player.position.y = 430;

    player.velocity.x = 0;
    player.velocity.y = 0;

    camera.x = 0;

    opcaoGameOver = 0;

    console.log("Voltando ao menu principal.");
}

// ==========================================
// EVENTOS DO TECLADO
// ==========================================

window.addEventListener("keydown", (event) => {
    // Menu inicial: Enter ou espaço para iniciar.
    if (estado.menu) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            iniciarJogo();
        }
        return;
    }

    // Game Over: Enter ou espaço para reiniciar.
    if (estado.morreu) {
        // Alterna entre Reiniciar e Menu Principal.
        if (
            event.key === "ArrowUp" ||
            event.key === "ArrowDown" ||
            event.key === "w" ||
            event.key === "s"
        ) {
            event.preventDefault();
            opcaoGameOver = 1 - opcaoGameOver;
            return;
        }

        // Confirma a opção selecionada.
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            if (opcaoGameOver === 0) {
                iniciarJogo();
            } else {
                voltarAoMenu();
            }
        }

        return;
    }

    // Ignora os controles durante a tela final.
    if (estado.fim) return;

    switch (event.key) {
        case "d":
        case "D":
        case "ArrowRight":
            keys.d.pressed = true;
            break;

        case "a":
        case "A":
        case "ArrowLeft":
            keys.a.pressed = true;
            break;

        case "s":
        case "S":
        case "ArrowDown":
            if (onGround && !player.isCrouching) {
                keys.s.pressed = true;
                player.crouch();
            }
            break;

        case "l":
        case "L":
            keys.l.pressed = true;
            break;

        case "e":
        case "E":
            if (!event.repeat) keys.e.pressed = true;
            break;

        case "i":
        case "I":
            if (!event.repeat) {
            mostrarInimigos = !mostrarInimigos;
            }
                break;

        // TESTE TEMPORÁRIO: simula o boss morrendo.
        case "m":
        case "M":
            estado.bossMorto = true;
            estado.puloDuplo = true;
            console.log("Boss morto! Pulo duplo liberado.");
            break;

        case "w":
        case "W":
        case "ArrowUp":
        case " ":
            event.preventDefault();

            if (player.isCrouching) break;

            if (onGround) {
                player.velocity.y = -13.5; // Impulso para cima
                onGround = false;
                pulosUsados = 1;
            } else if (
                estado.puloDuplo &&
                pulosUsados < 2 &&
                !event.repeat
            ) {
                player.velocity.y = -13.5;
                pulosUsados = 2;
            }
            break;
            
            case "r":
        case "R":
            player.tentarRecarregar(performance.now());
            break;
            event.preventDefault();

            if (player.isCrouching) break;

            if (onGround) {
                player.velocity.y = -13.5;
                onGround = false;
                pulosUsados = 1;
            } else if (
                estado.puloDuplo &&
                pulosUsados < 2 &&
                !event.repeat
            ) {
                player.velocity.y = -13.5;
                pulosUsados = 2;
            }
            break;
    }
});

// ==========================================
// SOLTAR TECLAS (CORREÇÃO DE MOVIMENTO)
// ==========================================

window.addEventListener("keyup", (event) => {
    switch (event.key) {
        case "d":
        case "D":
        case "ArrowRight":
            keys.d.pressed = false;
            break;

        case "a":
        case "A":
        case "ArrowLeft":
            keys.a.pressed = false;
            break;

        case "s":
        case "S":
        case "ArrowDown":
            keys.s.pressed = false;
            player.standUp();
            break;

        case "l":
        case "L":
            keys.l.pressed = false;
            break;

        case "e":
        case "E":
            keys.e.pressed = false;
            break;
    }
});

window.addEventListener("blur", () => {
    keys.d.pressed = false;
    keys.a.pressed = false;
    keys.s.pressed = false;
    keys.l.pressed = false;
    keys.e.pressed = false;

    player.standUp();
});