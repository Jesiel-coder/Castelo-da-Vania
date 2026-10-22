export class Player {
    constructor({ position, imageSrc }) {
        // POSIÇÃO / VELOCIDADE
        this.position = position;
        this.velocity = { x: 0, y: 0 };

        // HITBOX / DIMENSÕES
        this.normalHeight = 70;
        this.crouchHeight = 45;
        this.width = 36;
        this.height = this.normalHeight;

        // SPRITE / ESCALA
        this.image = new Image();
        this.image.src = imageSrc;
        this.frameSize = 64;
        this.scale = 2;

        // SPRITESHEET (MAPEAMENTO DE ANIMAÇÕES)
        this.animations = {
            idle:      { row: 0, frames: 4,  interval: 200, startCol: 0 },  // PARADO
            crouch:    { row: 1, frames: 4,  interval: 250, startCol: 0 },  // AGACHADO
            shoot:     { row: 2, frames: 11, interval: 60,  startCol: 0 },  // TIRO PARADO
            walk:      { row: 4, frames: 17, interval: 60,  startCol: 0 },  // ANDANDO
            reload:    { row: 2, frames: 7,  interval: 93,  startCol: 3 },  // RECARGA
            walkShoot: { row: 3, frames: 6,  interval: 60,  startCol: 12 }, // TIRO ANDANDO
            jumpUp:    { row: 3, frames: 6,  interval: 120, startCol: 6 },  // PULO (SUBINDO)
            fall:      { row: 3, frames: 6,  interval: 120, startCol: 3 }   // QUEDA (CAINDO)
        };

        // ESTADOS DE CONTROLE DE ANIMAÇÃO
        this.currentAnimation = 'idle';
        this.frameX = 0;
        this.lastTime = 0;
        this.facingRight = true;
        this.spriteFacesRight = true;

        // ESTADOS DE AÇÃO E CADÊNCIA
        this.isCrouching = false;
        this.isShooting = false;
        this.shootTimer = 0;
        this.shootCooldown = 660; // INTERVALO DE DISPARO

        // MUNIÇÃO E RECARGA
        this.maxAmmo = 6;
        this.ammo = 6;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 650; // TEMPO DE RECARGA
    }

    // AÇÃO: AGACHAR
    crouch() {
        if (!this.isCrouching && !this.isReloading) {
            this.isCrouching = true;
            this.height = this.crouchHeight;
            this.position.y += (this.normalHeight - this.crouchHeight);
        }
    }

    // AÇÃO: LEVANTAR
    standUp() {
        if (this.isCrouching) {
            this.isCrouching = false;
            this.position.y -= (this.normalHeight - this.crouchHeight);
            this.height = this.normalHeight;
        }
    }

    // AÇÃO: ATIRAR
    shoot(timestamp) {
        if (this.isReloading) return false;
        if (this.ammo <= 0) { this.startReload(timestamp); return false; }

        if (timestamp - this.shootTimer > this.shootCooldown) {
            this.shootTimer = timestamp;
            this.isShooting = true;
            this.frameX = 0;
            this.lastTime = timestamp;
            this.ammo--; 
            return true; 
        }
        return false;
    }
    
    // AÇÃO: RECARGA MANUAL
    tentarRecarregar(timestamp) {
        if (!this.isReloading && !this.isShooting && this.ammo < this.maxAmmo) {
            this.startReload(timestamp);
        }
    }

    // AÇÃO: INICIAR RECARGA
    startReload(timestamp) {
        if (!this.isReloading) {
            this.isReloading = true;
            this.reloadTimer = timestamp;
            this.isShooting = false;
            this.frameX = 0;
            this.lastTime = timestamp;
        }
    }

    // RENDERIZAÇÃO E ATUALIZAÇÃO DO PLAYER
    draw(ctx, timestamp, onGround) {
        if (!this.image.complete || this.image.naturalWidth === 0) return;

        // RECARGA: TEMPO EXCEDIDO
        if (this.isReloading) {
            if (timestamp - this.reloadTimer > this.reloadDuration) {
                this.isReloading = false;
                this.ammo = this.maxAmmo; 
            }
        }

        const anim = this.animations[this.currentAnimation];

        // TIRO: TÉRMINO DA ANIMAÇÃO
        if (this.isShooting && (this.currentAnimation === 'shoot' || this.currentAnimation === 'walkShoot')) {
            if (this.frameX >= anim.frames - 1) {
                this.isShooting = false;
                if (this.ammo <= 0 && !this.isReloading) {
                    this.startReload(timestamp);
                }
            }
        }

        // PRIORIDADE VISUAL
        let next = 'idle';
        if (this.isReloading) next = 'reload';
        else if (this.isCrouching) next = 'crouch';
        else if (!onGround) next = (this.velocity.y < 0) ? 'jumpUp' : 'fall';
        else if (this.isShooting && this.velocity.x !== 0) next = 'walkShoot';
        else if (this.isShooting) next = 'shoot';
        else if (this.velocity.x !== 0) next = 'walk';

        // TROCA DE ANIMAÇÃO E RESET DE FRAME
        if (next !== this.currentAnimation) {
            this.currentAnimation = next;
            this.frameX = 0;
            this.lastTime = timestamp;
        }

        // ORIENTAÇÃO (DIREITA / ESQUERDA)
        if (this.velocity.x > 0) this.facingRight = true;
        else if (this.velocity.x < 0) this.facingRight = false;

        // TEMPO DE QUADRO (FRAME INTERVAL)
        const currentAnim = this.animations[this.currentAnimation];
        if (timestamp - this.lastTime > currentAnim.interval) {
            this.lastTime = timestamp;
            if (this.currentAnimation === 'fall') {
                if (this.frameX < currentAnim.frames - 1) this.frameX++;
            } else {
                this.frameX = (this.frameX + 1) % currentAnim.frames;
            }
        }

        // CÁLCULO DE RECORTE (SPRITESHEET)
        const colunaAtual = (currentAnim.startCol !== undefined ? currentAnim.startCol : 0) + this.frameX;
        const size = this.frameSize * this.scale;
        const centerX = this.position.x + this.width / 2;
        const dx = centerX - size / 2;
        const dy = this.position.y + this.height - size;

        // DESENHO NO CANVAS (CONTEXT)
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        if (this.facingRight !== this.spriteFacesRight) {
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
        ctx.drawImage(
            this.image,
            colunaAtual * this.frameSize, currentAnim.row * this.frameSize, this.frameSize, this.frameSize,
            dx, dy, size, size
        );
        ctx.restore();
    }
}