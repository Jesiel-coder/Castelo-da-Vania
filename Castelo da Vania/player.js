//classe do player (só personagem: posição, velocidade, sprite e animação)
export class Player {
    constructor({ position, imageSrc }) {
        this.position = position
        this.velocity = { x: 0, y: 0 }
        this.width = 48
        this.height = 48

        //imagem do spritesheet
        this.image = new Image()
        this.image.src = imageSrc

        //controle da animação
        this.frameX = 0
        this.frameY = 0
        this.maxFrame = 5
        this.frameInterval = 120   //tempo (ms) entre uma troca de quadro e outra
        this.lastTime = 0
    }

    draw(ctx, timestamp) {
        //enquanto a imagem não carrega, desenha um quadrado verde
        if (!this.image.complete || this.image.naturalWidth === 0) {
            ctx.fillStyle = 'green'
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
            return
        }

        //troca de quadro a cada frameInterval ms
        if (timestamp - this.lastTime > this.frameInterval) {
            this.lastTime = timestamp
            this.frameX = this.frameX < this.maxFrame ? this.frameX + 1 : 0
        }

        //escolhe a animação: andando ou parado
        if (this.velocity.x !== 0) {
            this.frameY = 3
            this.maxFrame = 10
        } else {
            this.frameY = 0
            this.maxFrame = 5
        }

        //tamanho de cada quadro dentro do spritesheet
        const sw = 48
        const sh = 48

        //desenha só o quadro atual (recorte do spritesheet)
        ctx.drawImage(
            this.image,
            this.frameX * sw, this.frameY * sh, sw, sh,
            this.position.x, this.position.y, this.width, this.height
        )
    }
}