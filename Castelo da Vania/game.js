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

    draw() {
        ctx.drawImage(this.image, this.position.x, this.position.y)
    }

    update() {
        this.draw()
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
}

//se o player está no chão (pra poder pular)
let onGround = false

const fpsInterval = 1000 / 60 // Define o tempo padrão para 60 frames por segundo
let lastTime = 0

//animação no canvas
function animate(timestamp) {
    window.requestAnimationFrame(animate)

<<<<<<< Updated upstream
    //limpa a tela e desenha o fundo
=======
    const elapsed = timestamp - lastTime
    if (elapsed < fpsInterval) return
    lastTime = timestamp - (elapsed % fpsInterval)

>>>>>>> Stashed changes
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    background.update()

    //velocidade horizontal
    player.velocity.x = 0
    if (keys.d.pressed) player.velocity.x = 3
    else if (keys.a.pressed) player.velocity.x = -3

    //movimento do player
    player.position.x += player.velocity.x
    player.position.y += player.velocity.y

    //colisão: começa achando que está no ar
onGround = false

//chão
if (player.position.y + player.height >= floorY) {
    player.position.y = floorY - player.height
    player.velocity.y = 0
    onGround = true
}

//plataformas (só pousa se estiver caindo e vindo de cima)
platforms.forEach(p => {
    const pe = player.position.y + player.height   //pé do player agora
    const peAntes = pe - player.velocity.y         //pé do player no frame anterior
    const dentroX = player.position.x + player.width > p.x
                 && player.position.x < p.x + p.w

    if (dentroX && player.velocity.y >= 0 && peAntes <= p.y && pe >= p.y) {
        player.position.y = p.y - player.height
        player.velocity.y = 0
        onGround = true
    }
})

//gravidade (só se estiver no ar)
if (!onGround) player.velocity.y += gravity

    //desenha o player
    player.draw(ctx, timestamp)
}

animate(0)

//rastreamento de teclas (apertar)
window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = true; break
        case 'a': keys.a.pressed = true; break
        case 'w':
            if (onGround){
                player.velocity.y = -10.8
                keys.s.pressed = false;
            }
            break;
        case 's':
<<<<<<< Updated upstream
            if (onGround){
                keys.s.pressed = true;
=======
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
        case 'Space':
        case ' ':
            // Pula somente se estiver no chão e não estiver agachado
            if (onGround && !player.isCrouching) {
                player.velocity.y = -10.8;
>>>>>>> Stashed changes
            }
            break;
    }
})

//rastreamento de teclas (soltar)
window.addEventListener('keyup', (event) => {
    switch (event.key) {
<<<<<<< Updated upstream
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
        case 's': keys.s.pressed = false; break
=======
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
>>>>>>> Stashed changes
    }
})