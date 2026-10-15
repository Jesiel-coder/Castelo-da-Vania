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
}

//se o player está no chão (pra poder pular)
let onGround = false

//animação no canvas
function animate(timestamp) {
    window.requestAnimationFrame(animate)

    //limpa a tela e desenha o fundo
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
            if (onGround) player.velocity.y = -10.8
            break
    }
})

//rastreamento de teclas (soltar)
window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
    }
})