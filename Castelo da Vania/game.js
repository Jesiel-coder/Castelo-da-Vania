import { Player } from "./player.js"
import { platforms, floorY } from "./mapa.js"

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

//gravidade
const gravity = 0.5

//classe que mexe no fundo e nas sprites
class Sprite {
    constructor({ position, imageSrc }) {
        this.position = position
        this.image = new Image()
        this.image.src = imageSrc
    }

    draw(context) {
        context.drawImage(this.image, this.position.x, this.position.y)
    }

    update(context) {
        this.draw(context)
    }
}

//cria o player
const player = new Player({
    position: { x: 0, y: 0 },
    imageSrc: './img/spritesheet.png'
})

//cria o fundo
const background = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: './img/background.png'
})

//teclas apertadas
const keys = {
    d: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    l: { pressed: false }
}

//se o player está no chão (pra poder pular)
let onGround = false

let lastTime = 0
const fpsInterval = 1000 / 60

//animação no canvas
function animate(timestamp) {
    window.requestAnimationFrame(animate)
    
 const timeSinceLastFrame = timestamp - lastTime
 if (timeSinceLastFrame >= fpsInterval) {
    lastTime = timestamp - (timeSinceLastFrame % fpsInterval)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    background.update(ctx)

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

    player.position.x += player.velocity.x
    player.position.y += player.velocity.y

    onGround = false

    // Colisão com o chão principal
    if (player.position.y + player.height >= floorY) {
        player.position.y = floorY - player.height
        player.velocity.y = 0
        onGround = true
    }

    // Colisão com as plataformas
    platforms.forEach(p => {
        const pe = player.position.y + player.height
        const peAntes = pe - player.velocity.y
        const dentroX = player.position.x + player.width > p.x
                     && player.position.x < p.x + p.w

        if (dentroX && player.velocity.y >= 0 && peAntes <= p.y && pe >= p.y) {
            player.position.y = p.y - player.height
            player.velocity.y = 0
            onGround = true
        }
    })

    if (!onGround) player.velocity.y += gravity

    player.draw(ctx, timestamp)
}
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