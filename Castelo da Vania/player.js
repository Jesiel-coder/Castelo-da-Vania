//classe do player (só personagem: posição, velocidade, sprite e animação)
export class Player {
    constructor({ position, imageSrc }) {
        this.position = position
        this.velocity = { x: 0, y: 0 }

        //colisão do player (hitbox)
        this.width = 36
        this.height = 70

        //imagem do spritesheet
        this.image = new Image()
        this.image.src = imageSrc

        //cada quadro do spritesheet tem 64x64 e é ampliado 2x
        this.frameSize = 64
        this.scale = 2

        //animações: fileira do spritesheet, quantidade de quadros e tempo (ms) entre quadros
        this.animations = {
            idle: { row: 0, frames: 4,  interval: 150 },
            walk: { row: 4, frames: 17, interval: 70 },
        }
        this.currentAnimation = 'idle'
        this.frameX = 0
        this.lastTime = 0

        //direção: o sprite original olha pra qual lado?
        this.facingRight = true
        this.spriteFacesRight = true   //se ele andar "de costas", troque pra false
    }

    draw(ctx, timestamp) {
        //enquanto a imagem não carrega, desenha um quadrado verde
        if (!this.image.complete || this.image.naturalWidth === 0) {
            ctx.fillStyle = 'green'
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
            return
        }

        //escolhe a animação: andando ou parado (reinicia o quadro ao trocar)
        const next = this.velocity.x !== 0 ? 'walk' : 'idle'
        if (next !== this.currentAnimation) {
            this.currentAnimation = next
            this.frameX = 0
        }

        //guarda pra qual lado ele está virado
        if (this.velocity.x > 0) this.facingRight = true
        else if (this.velocity.x < 0) this.facingRight = false

        //troca de quadro a cada "interval" ms
        const anim = this.animations[this.currentAnimation]
        if (timestamp - this.lastTime > anim.interval) {
            this.lastTime = timestamp
            this.frameX = (this.frameX + 1) % anim.frames
        }

        //tamanho final do desenho e posição: centralizado na hitbox, pés na base dela
        const size = this.frameSize * this.scale
        const centerX = this.position.x + this.width / 2
        const dx = centerX - size / 2
        const dy = this.position.y + this.height - size

        ctx.imageSmoothingEnabled = false   //mantém a pixel art nítida

        ctx.save()
        //espelha o desenho quando ele olha pro lado contrário do sprite
        if (this.facingRight !== this.spriteFacesRight) {
            ctx.translate(centerX, 0)
            ctx.scale(-1, 1)
            ctx.translate(-centerX, 0)
        }
        ctx.drawImage(
            this.image,
            this.frameX * this.frameSize, anim.row * this.frameSize, this.frameSize, this.frameSize,
            dx, dy, size, size
        )
        ctx.restore()
    }
}