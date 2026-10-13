export class Player {
    constructor({ position, imageSrc }) {
        this.position = position
        this.velocity = { x: 0, y: 0 }
        this.width = 48
        this.height = 48

        this.image = new Image()
        this.image.src = imageSrc

        // animação
        this.frameX = 0
        this.frameY = 0
        this.maxFrame = 5
        this.frameInterval = 120
        this.lastTime = 0
    }

    draw(ctx, timestamp) {
        // enquanto a imagem não carrega, desenha um quadrado verde
        if (!this.image.complete || this.image.naturalWidth === 0) {
            ctx.fillStyle = 'green'
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
            return
        }

        // troca de quadro
        if (timestamp - this.lastTime > this.frameInterval) {
            this.lastTime = timestamp
            this.frameX = this.frameX < this.maxFrame ? this.frameX + 1 : 0
        }

        // parado x andando
        if (this.velocity.x !== 0) {
            this.frameY = 3
            this.maxFrame = 10
        } else {
            this.frameY = 0
            this.maxFrame = 5
        }

        const sw = 48 // largura de cada quadro no sprite
        const sh = 48 // altura de cada quadro no sprite

        ctx.drawImage(
            this.image,
            this.frameX * sw, this.frameY * sh, sw, sh,
            this.position.x, this.position.y, this.width, this.height
        )
    }
}