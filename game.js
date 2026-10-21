import { Player } from "./player.js"
import { salas } from "./salas.js"

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

ctx.imageSmoothingEnabled = false   // Sem isso o pixel art fica borrado ao escalar

// Gravidade aplicada ao mundo
const gravity = 0.5

// Verifica os eventos da sala atual (como troca de salas, portas, etc.)
function verificarEventos() {
    if (!sala.eventList) return;

    for (const evento of sala.eventList) {
        // Verifica se o jogador chegou ao ponto do evento na horizontal
        if (player.position.x >= evento.x) {
            if (evento.acao === 'trocarSala') {
                const destino = salas[evento.destino];

                if (!destino) {
                    console.error('Sala não encontrada:', evento.destino);
                    continue;
                }

                console.log('Trocando de sala:', evento.destino);

                // Carrega a nova sala (troca imagens e dados)
                carregarSala(destino);

                // Posiciona o jogador na coordenada de spawn configurada
                player.position.x = evento.spawn.x;
                player.position.y = destino.floorY - player.height;

                // Zera as velocidades para evitar "arrastos" na nova sala
                player.velocity.x = 0;
                player.velocity.y = 0;

                // Reinicia a posição da câmera
                camera.x = 0;

                // Impede que outros eventos da sala antiga sejam processados neste frame
                return true;
            }
        }
    }

    return false;
}

// Cria a instância do player principal
const player = new Player({
    position: { x: 0, y: 0 },
    imageSrc: './img/spritesheet.png'
})

// Sala atual e as imagens de fundo/cenário dela
let sala = salas.tutorial
let larguraMundo = 0
const sky = new Image()
const level = new Image()

// Carrega os dados e assets de uma nova sala
function carregarSala(nova) {
    sala = nova;
    larguraMundo = sala.largura * sala.escala;
    sky.src = sala.ceu || '';
    level.src = sala.cenario;
}
carregarSala(salas.tutorial)

// Estado atual das teclas de controle
const keys = {
    d: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    l: { pressed: false }
}

// Controla se o player está apoiado no chão ou em alguma superfície sólida
let onGround = false

// Configuração da câmera (acompanha o jogador apenas na horizontal)
const camera = { x: 0 }

// Evento de clique para depuração (mostra coordenadas no console)
canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect()
    const x = Math.round((e.clientX - r.left) * canvas.width / r.width + camera.x)
    const y = Math.round((e.clientY - r.top) * canvas.height / r.height)
    console.log(x, y)
})

// Armazena o timestamp do frame anterior para cálculo do Delta Time (dt)
let lastTime = 0

const CEU_ESCALA = 3   // sky.png tem 384x224, vira 1152x672

// Desenha o fundo com efeito de paralaxe (o céu se move mais devagar que a câmera)
function desenharCeu() {
    if (!sky.complete || sky.naturalWidth === 0) return
    if (!sala.ceu) return
    const w = sky.naturalWidth * CEU_ESCALA
    const h = sky.naturalHeight * CEU_ESCALA

    // Calcula o deslocamento horizontal do céu baseado no fator de paralaxe da sala
    const offset = Math.round((camera.x * sala.ceuFator) % w)

    // Repete a imagem do céu lado a lado até preencher toda a largura da tela
    for (let x = -offset; x < canvas.width; x += w) {
        ctx.drawImage(sky, x, 0, w, h)
    }
}

// ==========================================
// FUNÇÃO DEFINITIVA DE COLISÃO COM OS SÓLIDOS
// ==========================================
// Trata as colisões em 4 direções utilizando a posição anterior do player
function resolverColisoes(anterior) {
    if (!sala.solidos) return;

    for (const bloco of sala.solidos) {
        const esquerda = player.position.x;
        const direita = esquerda + player.width;
        const topo = player.position.y;
        const base = topo + player.height;

        const blocoDireita = bloco.x + bloco.w;
        const blocoBase = bloco.y + bloco.h;

        // Verifica se os retângulos de colisão se sobrepõem no frame atual
        const colide =
            direita > bloco.x &&
            esquerda < blocoDireita &&
            base > bloco.y &&
            topo < blocoBase;

        if (!colide) continue;

        const baseAnterior = anterior.y + player.height;
        const direitaAnterior = anterior.x + player.width;

        // Caiu sobre o bloco (colisão por cima)
        if (
            player.velocity.y >= 0 &&
            baseAnterior <= bloco.y
        ) {
            player.position.y = bloco.y - player.height;
            player.velocity.y = 0;
            onGround = true;
        }
        // Bateu a cabeça na parte inferior do bloco (colisão por baixo)
        else if (
            player.velocity.y < 0 &&
            anterior.y >= blocoBase
        ) {
            player.position.y = blocoBase;
            player.velocity.y = 0;
        }
        // Bateu na lateral esquerda do bloco (vindo da esquerda para a direita)
        else if (
            player.velocity.x > 0 &&
            direitaAnterior <= bloco.x
        ) {
            player.position.x = bloco.x - player.width;
        }
        // Bateu na lateral direita do bloco (vindo da direita para a esquerda)
        else if (
            player.velocity.x < 0 &&
            anterior.x >= blocoDireita
        ) {
            player.position.x = blocoDireita;
        }
    }
}

// Loop principal de animação e lógica do jogo
function animate(timestamp) {
    window.requestAnimationFrame(animate)

    // Delta time: quantos "frames de 60fps" passaram desde o último frame
    // (1 = 60fps normal, valores menores/maiores ajustam a fluidez). O limite de 50ms evita saltos caso a aba fique inativa.
    const dt = Math.min(timestamp - lastTime, 50) / (1000 / 60)
    lastTime = timestamp

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Movimento horizontal: Permite andar e atirar ao mesmo tempo (bloqueado apenas se estiver agachado)
    player.velocity.x = 0;
    if (!player.isCrouching) {
        if (keys.d.pressed) player.velocity.x = 4;
        else if (keys.a.pressed) player.velocity.x = -4;
    }

    // Se estiver segurando a tecla L, dispara projéteis continuamente respeitando a cadência da arma
    if (keys.l.pressed) {
        player.shoot(timestamp);
    }

    // 1. Guarda a posição anterior do jogador antes de aplicar a movimentação
    const anterior = {
        x: player.position.x,
        y: player.position.y
    };

    // 2. Aplica a velocidade atual multiplicada pelo Delta Time nas coordenadas
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // 3. Executa a função definitiva de colisão com os blocos sólidos da sala
    resolverColisoes(anterior);

    // Limita o movimento do player às bordas horizontais do mundo da sala atual
    player.position.x = Math.max(0, Math.min(player.position.x, larguraMundo - player.width))

    // Reseta o estado de "no chão" antes de checar o piso e as plataformas
    onGround = false

    // Colisão com o chão principal da sala
    if (player.position.y + player.height >= sala.floorY) {
        player.position.y = sala.floorY - player.height
        player.velocity.y = 0
        onGround = true
    }

    // Colisão com as plataformas flutuantes da sala (permite subir por cima delas)
    sala.platforms.forEach(p => {
        const pe = player.position.y + player.height
        const peAntes = pe - player.velocity.y * dt
        const dentroX = player.position.x + player.width > p.x
            && player.position.x < p.x + p.w

        if (dentroX && player.velocity.y >= 0 && peAntes <= p.y && pe >= p.y) {
            player.position.y = p.y - player.height
            player.velocity.y = 0
            onGround = true
        }
    })

    // Se não estiver apoiado em nenhuma superfície, aplica a aceleração da gravidade verticalmente
    if (!onGround) player.velocity.y += gravity * dt

    // Verifica se o jogador ativou algum evento (como transição de salas)
    verificarEventos();

    // A câmera segue o player centralizado na tela, sem ultrapassar os limites da sala
    const S = sala.escala
    camera.x = player.position.x + player.width / 2 - canvas.width / 2
    camera.x = Math.max(0, Math.min(camera.x, larguraMundo - canvas.width))
    camera.x = Math.round(camera.x / S) * S

    // Renderiza o plano de fundo (céu com paralaxe)
    desenharCeu()
    
    // Renderiza o cenário recortado de acordo com a posição atual da câmera
    const r = sala.recorte
    ctx.drawImage(
        level,
        camera.x / S, r.y, canvas.width / S, r.h,                // Origem (coordenadas na imagem do cenário)
        0, canvas.height - r.h * S, canvas.width, r.h * S        // Destino (coordenadas no canvas da tela)
    )

    // Renderiza o player deslocado pela posição da câmera (ele vive nas coordenadas do mundo)
    ctx.save()
    ctx.translate(-camera.x, 0)
    player.draw(ctx, timestamp, onGround)
    ctx.restore()
}
// Inicia o loop de animação
animate(0)

// ==========================================
// EVENTOS DE ENTRADA DO TECLADO
// ==========================================
window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'd':
        case 'D':
        case 'ArrowRight':
            keys.d.pressed = true;
            break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
            keys.a.pressed = true;
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            if (onGround) {
                keys.s.pressed = true;
                player.crouch();
            }
            break;
        case 'l':
        case 'L':
            keys.l.pressed = true;
            break;
        case 'w':
        case 'W':
        case 'ArrowUp':
        case ' ':
            // Pula somente se estiver no chão e não estiver agachado
            if (onGround && !player.isCrouching) {
                player.velocity.y = -12.5;
            }
            break;
    }
})

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd':
        case 'D':
        case 'ArrowRight':
            keys.d.pressed = false;
            break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
            keys.a.pressed = false;
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            keys.s.pressed = false;
            player.standUp();
            break;
        case 'l':
        case 'L':
            keys.l.pressed = false;
            break;
    }
})