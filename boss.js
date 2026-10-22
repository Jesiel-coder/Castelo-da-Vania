// boss.js - dados, sprite e animação do Cavaleiro Sombrio.
// A lógica (IA, dano, colisão) fica no game.js.

export class Boss {
    constructor({ position, imageSrc }) {
        this.position = position;          // canto superior esquerdo da hitbox
        this.velocity = { x: 0, y: 0 };

        // Hitbox (os pés ficam em position.y + height)
        this.width = 60;
        this.height = 140;

        // Hitbox (os pés ficam em position.y + height)
        this.width = 60;
        this.height = 140;

        // Posição vertical que funcionou: y = floorY - alturaNoChao
        this.alturaNoChao = 125;

        // Sprite: quadro de 128x128 desenhado em escala 1.5
        this.frameSize = 128;
        this.scale = 1.5;

        this.facingRight = false;          // o desenho original olha para a direita

        this.image = new Image();
        this.image.src = imageSrc;

        // Linha no spritesheet, nº de frames, ms por frame e se repete
        this.animacoes = {
            idle:    { linha: 0, frames: 8, ms: 120, loop: true  },
            andar:   { linha: 1, frames: 8, ms: 100, loop: true  },
            pular:   { linha: 2, frames: 8, ms: 100, loop: false },
            ataque1: { linha: 3, frames: 7, ms: 90,  loop: false },
            ataque2: { linha: 4, frames: 8, ms: 110, loop: false },
            ataque3: { linha: 5, frames: 8, ms: 110, loop: false },
            ataque4: { linha: 6, frames: 7, ms: 120, loop: false },
            dano:    { linha: 7, frames: 4, ms: 90,  loop: false },
            morte:   { linha: 8, frames: 6, ms: 150, loop: false },
            fim:     { linha: 9, frames: 1, ms: 100, loop: true  }
        };

        this.atual = "idle";
        this.frame = 0;
        this.ultimoFrame = 0;
        this.terminou = false;   // true quando uma animação sem loop acaba

        // ---- Dados da IA e do combate (o game.js lê e escreve aqui) ----
        this.estado = "idle";    // idle | andar | ataque1 | ataque2 | ataque3 | morte | morto
        this.vidaMax = 20;       // quantos tiros ele aguenta
        this.vida = this.vidaMax;
        this.velocidade = 1.8;   // px por frame (a 60 fps)
        this.alcanceAtaque = 110;   // distância (centro a centro) para atacar de perto
        this.distanciaProjetil = 250; // acima disso, ele usa o projétil
        this.cooldownAtaque = 1800;   // ms entre ataques
        this.proximoAtaque = 0;
        this.piscaAte = 0;       // pisca quando leva tiro
        this.disparou = false;   // o projétil só sai uma vez por ataque

        // Frames em que o golpe machuca (índice do frame) e o alcance da zona de dano
        this.golpes = {
            ataque1: { ini: 2, fim: 5, alcance: 105 },
            ataque2: { ini: 3, fim: 5, alcance: 130 }
        };
        this.frameTiro = 4;      // frame do ataque 3 em que o projétil sai
        this.frameInvocar = 3;   // frame do ataque 4 em que os capangas aparecem
    }

    // Troca de animação (só reinicia se for diferente da atual)
    setAnimacao(nome) {
        if (this.atual === nome) return;
        this.atual = nome;
        this.frame = 0;
        this.ultimoFrame = 0;
        this.terminou = false;
    }

    atualizarAnimacao(timestamp) {
        const anim = this.animacoes[this.atual];

        if (timestamp - this.ultimoFrame < anim.ms) return;
        this.ultimoFrame = timestamp;

        if (this.frame < anim.frames - 1) {
            this.frame++;
        } else if (anim.loop) {
            this.frame = 0;
        } else {
            this.terminou = true;   // fica parado no último frame
        }
    }

    // Chamar dentro do ctx.translate(-camera.x, 0), igual ao player
    draw(ctx, timestamp) {
        this.atualizarAnimacao(timestamp);

        const anim = this.animacoes[this.atual];
        const tamanho = this.frameSize * this.scale;

        const centroX = this.position.x + this.width / 2;
        const pes = this.position.y + this.height;

        ctx.save();
        ctx.translate(centroX, 0);

        if (!this.facingRight) ctx.scale(-1, 1);

        ctx.drawImage(
            this.image,
            this.frame * this.frameSize, anim.linha * this.frameSize,
            this.frameSize, this.frameSize,
            -tamanho / 2, pes - tamanho,
            tamanho, tamanho
        );

        ctx.restore();
    }
}