// player.js
export class Player {
    constructor({ position, imageSrc }) {
        this.position = position;
        this.velocity = { x: 0, y: 0 };

        // Hitbox padrão e de agachamento
        this.normalHeight = 70;
        this.crouchHeight = 45;
        this.width = 36;
        this.height = this.normalHeight;

        this.image = new Image();
        this.image.src = imageSrc;

        this.frameSize = 64;
        this.scale = 2;

        // Mapeamento das linhas do spritesheet enviado
        this.animations = {
            idle:   { row: 0, frames: 4,  interval: 150 },
            crouch: { row: 1, frames: 4,  interval: 220 }, // Linha 2 para agachar
            shoot:  { row: 2, frames: 11, interval: 80  }, // Linha 3 para atirar
            walk:   { row: 4, frames: 17, interval: 25  }  // Linha 5 para andar
        };

        this.currentAnimation = 'idle';
        this.frameX = 0;
        this.lastTime = 0;

        this.facingRight = true;
        this.spriteFacesRight = true;

        this.isCrouching = false;
        this.isShooting = false;

        this.shootTimer = 0;
        this.shootCooldown = 250;
    }

    crouch() {
        if (!this.isCrouching) {
            this.isCrouching = true;
            this.height = this.crouchHeight;
            
            // Move o Y para baixo para manter os pés colados no chão ao encolher a hitbox
            this.position.y += (this.normalHeight - this.crouchHeight);
        }
    }

    standUp() {
       // Só executa se ele ESTIVER agachado
        if (this.isCrouching) {
            this.isCrouching = false;
            
            // Move o Y para cima para dar espaço para a hitbox crescer sem empurrar o chão
            this.position.y -= (this.normalHeight - this.crouchHeight);
            this.height = this.normalHeight;
        }
    }

    shoot(timestamp) {
        if (timestamp - this.shootTimer > this.shootCooldown) {
            this.shootTimer = timestamp;
            this.isShooting = true;
            return true; // Indica que o tiro foi disparado com sucesso
        }
        return false;
    }

    draw(ctx, timestamp) {
        if (!this.image.complete || this.image.naturalWidth === 0) {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            return;
        }

        // Reseta o estado do tiro automaticamente após o cooldown passar um pouco
        if (this.isShooting && timestamp - this.shootTimer > 200) {
            this.isShooting = false;
        }

        // Prioridade visual: Agachado > Atirando > Andando > Parado
        let next = 'idle';
        if (this.isCrouching) {
            next = 'crouch';
        } else if (this.isShooting) {
            next = 'shoot';
        } else if (this.velocity.x !== 0) {
            next = 'walk';
        }

        if (next !== this.currentAnimation) {
            this.currentAnimation = next;
            this.frameX = 0;
        }

        if (this.velocity.x > 0) this.facingRight = true;
        else if (this.velocity.x < 0) this.facingRight = false;

        const anim = this.animations[this.currentAnimation];
        if (timestamp - this.lastTime > anim.interval) {
            this.lastTime = timestamp;
            this.frameX = (this.frameX + 1) % anim.frames;
        }

        const size = this.frameSize * this.scale;
        const centerX = this.position.x + this.width / 2;
        const dx = centerX - size / 2;
        const dy = this.position.y + this.height - size;

        ctx.imageSmoothingEnabled = false;

        ctx.save();
        if (this.facingRight !== this.spriteFacesRight) {
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
        ctx.drawImage(
            this.image,
            this.frameX * this.frameSize, anim.row * this.frameSize, this.frameSize, this.frameSize,
            dx, dy, size, size
        );
        ctx.restore();
    }
}
