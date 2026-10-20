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

        // Mapeamento das linhas do spritesheet
        this.animations = {
            //animação de idle
            idle:      { row: 0, frames: 4,  interval: 150, startCol: 0 },
            //animação de agachar
            crouch:    { row: 1, frames: 4,  interval: 220, startCol: 0 },
            //animação de tiro
            shoot:     { row: 2, frames: 11, interval: 80,  startCol: 0 },
           //animação de andar
            walk:      { row: 4, frames: 17, interval: 25,  startCol: 0 },
           //animação de recarregar
            reload:    { row: 2, frames: 7,  interval: 93,  startCol: 3 },
           // Adicionando a animação de tiro enquanto anda (precisa de ajustes)
            walkShoot: { row: 3, frames: 6,  interval: 80,  startCol: 13 },
            // Dividindo o pulo em duas fases
            jumpUp:    { row: 3, frames: 6,  interval: 120,  startCol: 6 }, // Primeiros 6 frames: Subindo
            fall:      { row: 3, frames: 6,  interval: 120,  startCol: 3}  // Últimos 6 frames: Caindo (começa na coluna 7 / índice 6)
        };

        this.currentAnimation = 'idle';
        this.frameX = 0;
        this.lastTime = 0;

        this.facingRight = true;
        this.spriteFacesRight = true;

        this.isCrouching = false;
        this.isShooting = false;

        this.shootTimer = 0;
        this.shootCooldown = 880;

        // Sistema de munição
        this.maxAmmo = 6;
        this.ammo = 6;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 650;
    }

    crouch() {
        if (!this.isCrouching && !this.isReloading) {
            this.isCrouching = true;
            this.height = this.crouchHeight;
            this.position.y += (this.normalHeight - this.crouchHeight);
        }
    }

    standUp() {
        if (this.isCrouching) {
            this.isCrouching = false;
            this.position.y -= (this.normalHeight - this.crouchHeight);
            this.height = this.normalHeight;
        }
    }

    shoot(timestamp) {
        if (this.isReloading) return false;

        if (this.ammo <= 0) {
            this.startReload(timestamp);
            return false;
        }

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

    startReload(timestamp) {
        if (!this.isReloading) {
            this.isReloading = true;
            this.reloadTimer = timestamp;
            this.isShooting = false;
            this.frameX = 0;
            this.lastTime = timestamp;
        }
    }

    draw(ctx, timestamp, onGround) {
        if (!this.image.complete || this.image.naturalWidth === 0) {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            return;
        }

        // Gerencia o tempo de recarga
        if (this.isReloading) {
            if (timestamp - this.reloadTimer > this.reloadDuration) {
                this.isReloading = false;
                this.ammo = this.maxAmmo; 
            }
        }

        const anim = this.animations[this.currentAnimation];

        if (this.isShooting && this.currentAnimation === 'shoot') {
            if (this.frameX >= anim.frames - 1) {
                this.isShooting = false;
                if (this.ammo <= 0 && !this.isReloading) {
                    this.startReload(timestamp);
                }
            }
        }

        // Prioridade visual atualizada com as duas fases do pulo:
        let next = 'idle';
        if (this.isReloading) {
            next = 'reload';
        } else if (this.isCrouching) {
            next = 'crouch';
        } else if (!onGround) {
            // Se estiver no ar, verifica se está subindo ou caindo pelo velocity.y
            if (this.velocity.y < 0) {
                next = 'jumpUp';
            } else {
                next = 'fall';
            }
        } else if (this.isShooting && this.velocity.x !== 0) {
            next = 'walkShoot';
        } else if (this.isShooting) {
            next = 'shoot';
        } else if (this.velocity.x !== 0) {
            next = 'walk';
        }

        // Se mudou de animação, reseta o frame para 0
        if (next !== this.currentAnimation) {
            this.currentAnimation = next;
            this.frameX = 0;
            this.lastTime = timestamp;
        }

        if (this.velocity.x > 0) this.facingRight = true;
        else if (this.velocity.x < 0) this.facingRight = false;

        const currentAnim = this.animations[this.currentAnimation];
        
        // Para animações de pulo/queda, podemos travar no último frame da queda em vez de ficar repetindo em looping
        if (timestamp - this.lastTime > currentAnim.interval) {
            this.lastTime = timestamp;
            if (this.currentAnimation === 'fall') {
                // Trava no último frame da queda para não ficar piscando
                if (this.frameX < currentAnim.frames - 1) {
                    this.frameX++;
                }
            } else {
                this.frameX = (this.frameX + 1) % currentAnim.frames;
            }
        }

        const colunaAtual = (currentAnim.startCol !== undefined ? currentAnim.startCol : 0) + this.frameX;

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
            colunaAtual * this.frameSize, currentAnim.row * this.frameSize, this.frameSize, this.frameSize,
            dx, dy, size, size
        );
        ctx.restore();
    }
}