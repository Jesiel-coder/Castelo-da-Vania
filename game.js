import { Player } from "./player.js";
import { salas } from "./salas.js";

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

        y: player.position.y + player.height * 0.45,

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

    if (timestamp < invulneravelAte) {
        ctx.globalAlpha = Math.floor(timestamp / 100) % 2 ? 0.35 : 1;
    }

    player.draw(ctx, timestamp, onGround);

    ctx.restore();

    desenharTiros();    

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