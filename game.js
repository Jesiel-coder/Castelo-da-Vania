import { Player } from "./player.js";
import { salas } from "./salas.js";

// ==========================================
// CONFIGURAÇÃO DO CANVAS
// ==========================================

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

document.querySelector("canvas").getBoundingClientRect()

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

const camera = { x: 0 };

let onGround = false;
let pulosUsados = 0;
let lastTime = 0;

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

// Guarda coisas que já aconteceram no jogo (chefe derrotado, etc).
const estado = {
    bossMorto: false,
    puloDuplo: false
};

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

    // Limpa as teclas para evitar movimento involuntário
    // durante a transição.
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
// EVENTOS E TROCA DE SALAS
// ==========================================

function verificarEventos() {
    if (!sala.eventList) return false;

    for (const evento of sala.eventList) {
        if (eventosAtivados.has(evento.id)) continue;

        // Evento com condição: só vale depois que ela for cumprida.
        if (evento.condicao && !estado[evento.condicao]) continue;

        if (evento.w !== undefined) {
            // EVENTO EM ÁREA (porta): jogador dentro do retângulo
            // e apertando E.
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

// Desenha o céu repetido horizontalmente.
// O fator de paralaxe é configurado em salas.js.
function desenharCeu() {
    if (!sala.ceu) return;

    if (!sky.complete || sky.naturalWidth === 0) {
        return;
    }

    const largura = sky.naturalWidth * CEU_ESCALA;
    const altura = sky.naturalHeight * CEU_ESCALA;

    const fator = sala.ceuFator ?? 0.1;

    // Movimento do céu mais lento que o cenário.
    const deslocamento = camera.x * fator;

    // Mantém o deslocamento dentro da largura da imagem.
    const offset =
        ((deslocamento % largura) + largura) % largura;

    // Repete a imagem para evitar espaços vazios.
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

    // Área visível da imagem original.
    const larguraVisivel = canvas.width / escala;

    // Limita a origem horizontal à imagem.
    const origemX = Math.max(
        0,
        Math.min(
            camera.x / escala,
            level.naturalWidth - larguraVisivel
        )
    );

    // Limita o recorte vertical à altura da imagem.
    const origemY = Math.max(
        0,
        Math.min(
            recorte.y,
            level.naturalHeight
        )
    );

    // Impede que o recorte ultrapasse o final da imagem.
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

    // Largura disponível a partir da origem horizontal.
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

    // Mantém o recorte alinhado à parte inferior do canvas.
    const alturaDesenhada = alturaRecorte * escala;

    const destinoY = canvas.height - alturaDesenhada;

    ctx.drawImage(
        level,

        // Origem na imagem original.
        origemX,
        origemY,
        larguraRecorte,
        alturaRecorte,

        // Destino no canvas.
        0,
        destinoY,
        larguraRecorte * escala,
        alturaDesenhada
    );
}

// ==========================================
// COLISÕES COM BLOCOS SÓLIDOS
// ==========================================

// As coordenadas dos sólidos devem estar no mesmo
// sistema de coordenadas usado pelo jogador.
//
// A resolução horizontal e vertical é independente
// para evitar atravessar paredes e plataformas.

function resolverColisoesHorizontais(anterior) {
    if (!sala.solidos) return;

    for (const bloco of sala.solidos) {
        const esquerda = player.position.x;
        const direita = esquerda + player.width;

        const topo = player.position.y;
        const base = topo + player.height;

        const blocoDireita = bloco.x + bloco.w;
        const blocoBase = bloco.y + bloco.h;

        // Precisa existir sobreposição vertical.
        const sobrepoeY =
            base > bloco.y &&
            topo < blocoBase;

        if (!sobrepoeY) continue;

        const direitaAnterior =
            anterior.x + player.width;

        // Jogador andando para a direita.
        if (
            player.velocity.x > 0 &&
            direita > bloco.x &&
            direitaAnterior <= bloco.x
        ) {
            player.position.x =
                bloco.x - player.width;
        }

        // Jogador andando para a esquerda.
        else if (
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

        // Precisa existir sobreposição horizontal.
        const sobrepoeX =
            direita > bloco.x &&
            esquerda < blocoDireita;

        if (!sobrepoeX) continue;

        const baseAnterior =
            anterior.y + player.height;

        // Caiu em cima do bloco.
        if (
            player.velocity.y >= 0 &&
            base > bloco.y &&
            baseAnterior <= bloco.y
        ) {
            player.position.y =
                bloco.y - player.height;

            player.velocity.y = 0;
            onGround = true;
        }

        // Bateu a cabeça na parte inferior.
        else if (
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

        // Só permite pousar por cima da plataforma.
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

    // Mantém o deslocamento alinhado à escala da sala.
    camera.x = Math.round(camera.x / escala) * escala;
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================

function animate(timestamp) {
    requestAnimationFrame(animate);

    // Delta time baseado em 60 FPS.
    const dt =
        Math.min(timestamp - lastTime, 50) /
        (1000 / 60);

    lastTime = timestamp;

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

    if (!player.isCrouching) {
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
        player.shoot(timestamp);
    }

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

    // Reseta o estado antes de recalcular as colisões.
    onGround = false;

    player.position.y +=
        player.velocity.y * dt;

    resolverColisoesVerticais(anterior);

    resolverChao();
    
    resolverPlataformas(anterior);

    // Encostou no chão ou numa plataforma: recupera os pulos.
    if (onGround) pulosUsados = 0;

    // --------------------------------------
    // GRAVIDADE
    // --------------------------------------

    if (!onGround) {
        player.velocity.y += gravity * dt;
    }

    // --------------------------------------
    // EVENTOS E TROCA DE SALAS
    // --------------------------------------

    verificarEventos();

    // Garante que o jogador não fique fora dos limites
    // depois de uma eventual troca de sala.
    limitarPosicao();

    // --------------------------------------
    // ATUALIZA CÂMERA
    // --------------------------------------

    atualizarCamera();

    // --------------------------------------
    // RENDERIZAÇÃO
    // --------------------------------------

    // 1. Fundo com paralaxe.
    desenharCeu();

    // 2. Cenário principal.
    desenharCenario();

    // 3. Jogador.
    ctx.save();

    ctx.translate(-camera.x, 0);

    player.draw(
        ctx,
        timestamp,
        onGround
    );

    ctx.restore();
}

// Inicia o jogo.
requestAnimationFrame(animate);

// ==========================================
// EVENTOS DO TECLADO
// ==========================================

window.addEventListener("keydown", (event) => {
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
            // event.repeat evita que segurar a tecla dispare várias vezes.
            if (!event.repeat) keys.e.pressed = true;
            break;

        // TESTE TEMPORÁRIO: simula o boss morrendo. Apaga depois.
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
// SOLTAR TECLAS
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

// Evita que o personagem continue andando ou atirando
// caso a janela perca o foco enquanto uma tecla está pressionada.
window.addEventListener("blur", () => {
    keys.d.pressed = false;
    keys.a.pressed = false;
    keys.s.pressed = false;
    keys.l.pressed = false;
    keys.e.pressed = false;

    player.standUp();
});