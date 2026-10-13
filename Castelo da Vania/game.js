import { Player } from "./player.js"

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

const gravity = 0.5

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

const player = new Player({
    position: { x: 0, y: 0 },
    imageSrc: './img/spritesheet.png'
})

const background = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: './img/background.png'
})

const keys = {
    d: { pressed: false },
    a: { pressed: false },
}

let onGround = false

function animate(timestamp) {
    window.requestAnimationFrame(animate)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    background.update()

    // velocidade horizontal
    player.velocity.x = 0
    if (keys.d.pressed) player.velocity.x = 3
    else if (keys.a.pressed) player.velocity.x = -3

    // movimento
    player.position.x += player.velocity.x
    player.position.y += player.velocity.y

    // gravidade e chão
    if (player.position.y + player.height + player.velocity.y < canvas.height) {
        player.velocity.y += gravity
        onGround = false
    } else {
        player.velocity.y = 0
        onGround = true
    }

    player.draw(ctx, timestamp)
}

animate(0)

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = true; break
        case 'a': keys.a.pressed = true; break
        case 'w':
            if (onGround) player.velocity.y = -15
            break
    }
})

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
    }
})