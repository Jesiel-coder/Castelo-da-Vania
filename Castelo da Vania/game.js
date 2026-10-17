import { Player } from "./player.js"
import { salas } from "./salas.js"

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

ctx.imageSmoothingEnabled = false   // sem isso o pixel art fica borrado ao escalar

//gravidade
const gravity = 0.5

//cria o player
const player = new Player({
    position: { x: 0, y: 0 },
    imageSrc: './img/spritesheet.png'
})

//sala atual e as imagens dela
let sala = salas.tutorial
let larguraMundo = 0
const sky = new Image()
const level = new Image()

//carrega uma sala (troca as imagens)
function carregarSala(nova) {
    sala = nova
    larguraMundo = sala.largura * sala.escala
    sky.src = sala.ceu
    level.src = sala.cenario
}
carregarSala(salas.tutorial)

//teclas apertadas
const keys = {
    d: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    l: { pressed: false }
}

//se o player está no chão (pra poder pular)
let onGround = false

//câmera (só anda na horizontal)
const camera = { x: 0 }

//tempo do frame anterior (pro delta time)
let lastTime = 0

const CEU_ESCALA = 3   // sky.png tem 384x224, vira 1152x672

function desenharCeu() {
    if (!sky.complete || sky.naturalWidth === 0) return

    const w = sky.naturalWidth * CEU_ESCALA
    const h = sky.naturalHeight * CEU_ESCALA

    // quanto o céu já andou, "dando a volta" a cada largura da imagem
    const offset = Math.round((camera.x * sala.ceuFator) % w)

    // repete lado a lado até preencher a tela
    for (let x = -offset; x < canvas.width; x += w) {
        ctx.drawImage(sky, x, 0, w, h)
    }
}

//animação no canvas
function animate(timestamp) {
    window.requestAnimationFrame(animate)

    //delta time: quantos "frames de 60fps" passaram desde o último frame
    //(1 = 60fps, 0.6 = 100fps). O limite de 50ms evita saltos quando a aba fica em segundo plano
    const dt = Math.min(timestamp - lastTime, 50) / (1000 / 60)   //←
    lastTime = timestamp                                           //←

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Movimento horizontal: Agora permite andar E atirar ao mesmo tempo! (apenas bloqueia se agachado)
    player.velocity.x = 0;
    if (!player.isCrouching) {
        if (keys.d.pressed) player.velocity.x = 3;
        else if (keys.a.pressed) player.velocity.x = -3;
    }

    // Se estiver segurando a tecla L, tenta disparar continuamente respeitando a cadência
    if (keys.l.pressed) {
        player.shoot(timestamp);
    }

    player.position.x += player.velocity.x * dt   //←
    player.position.y += player.velocity.y * dt   //←

    player.position.x = Math.max(0, Math.min(player.position.x, larguraMundo - player.width))

    onGround = false

    // Colisão com o chão principal
    if (player.position.y + player.height >= sala.floorY) {   //←
        player.position.y = sala.floorY - player.height        //←
        player.velocity.y = 0
        onGround = true
    }

    // Colisão com as plataformas
    sala.platforms.forEach(p => {                              //←
        const pe = player.position.y + player.height
        const peAntes = pe - player.velocity.y * dt            //←
        const dentroX = player.position.x + player.width > p.x
            && player.position.x < p.x + p.w

        if (dentroX && player.velocity.y >= 0 && peAntes <= p.y && pe >= p.y) {
            player.position.y = p.y - player.height
            player.velocity.y = 0
            onGround = true
        }
    })

    if (!onGround) player.velocity.y += gravity * dt   //←

    //câmera segue o player, sem passar das bordas da sala
    const S = sala.escala
    camera.x = player.position.x + player.width / 2 - canvas.width / 2
    camera.x = Math.max(0, Math.min(camera.x, larguraMundo - canvas.width))
    camera.x = Math.round(camera.x / S) * S

    //céu: anda só 10% da câmera
    desenharCeu()
    
    //cenário: recorta a faixa na posição da câmera
    const r = sala.recorte
    ctx.drawImage(
        level,
        camera.x / S, r.y, canvas.width / S, r.h,                 // origem (imagem)
        0, canvas.height - r.h * S, canvas.width, r.h * S         // destino (canvas)
    )

    //player: desenhado deslocado pela câmera (ele vive nas coordenadas do mundo)
    ctx.save()
    ctx.translate(-camera.x, 0)
    player.draw(ctx, timestamp)
    ctx.restore()
}
animate(0)

// Eventos de Teclado
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
                player.velocity.y = -10.8;
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