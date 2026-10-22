// inimigos.js - dados, sprite e animação do ZUMBI e da GÁRGULA.
// A lógica (IA, dano, colisão) fica no game.js, como combinado.

// ==========================================
// DADOS DE CADA TIPO (é aqui que se ajusta o inimigo)
// ==========================================

const TIPOS = {
    zumbi: {
        imagem: "./img/zumbi.png",
        frame: 112,                 // cada célula do spritesheet é 112x112
        escala: 1.1,                // tamanho do desenho na tela
        largura: 36,                // hitbox
        altura: 85,
        vidaMax: 3,                 // tiros para morrer (só levando tiro de pé)
        velocidade: 2.5,            // px por frame (a 60 fps): 
        gatilho: 220,               // distância em que ele levanta
        distAtaque: 80,             // distância (centro a centro) para arranhar
        golpe: { ini: 4, fim: 6, alcance: 60 },   // frames em que o arranhão machuca
        cambaleia: true,            // para um instante quando leva tiro
        animacoes: {
            idle:     { linha: 0, frames: 8,  ms: 120, loop: true  },
            agachar:  { linha: 1, frames: 4,  ms: 250, loop: true  },
            levantar: { linha: 2, frames: 4,  ms: 180, loop: false },
            andar:    { linha: 3, frames: 12, ms: 100, loop: true  },
            correr:   { linha: 4, frames: 12, ms: 70,  loop: true  },
            ataque:   { linha: 5, frames: 8,  ms: 60,  loop: false },
            dano:     { linha: 6, frames: 6,  ms: 70,  loop: false },
            morte:    { linha: 7, frames: 10, ms: 120, loop: false }
        }
    },

    gargula: {
        imagem: "./img/gargula.png",
        frame: 104,                 // cada célula do spritesheet é 104x104
        escala: 1.1,
        largura: 50,
        altura: 80,
        vidaMax: 6,
        velocidade: 1.2,            // fica mais rápida quanto mais dano leva
        visao: 500,                 // distância em que ela acorda
        frameGrito: 7,              // frame do ataque em que a onda sai
        animacoes: {
            idle:    { linha: 0, frames: 8,  ms: 120, loop: true  },
            andar:   { linha: 1, frames: 12, ms: 90,  loop: true  },
            correr:  { linha: 2, frames: 12, ms: 70,  loop: true  },
            pular:   { linha: 3, frames: 8,  ms: 100, loop: false },
            ataque:  { linha: 4, frames: 10, ms: 100, loop: false },
            dano:    { linha: 6, frames: 6,  ms: 80,  loop: false },
            morte:   { linha: 7, frames: 10, ms: 120, loop: false }
        },
        // A onda sonora (projétil) está na linha 5: 3 frames fortes + 2 desbotando
        onda: { linha: 5, frames: 3, ms: 90 }
    }
};

// Cada imagem é carregada só uma vez e compartilhada entre os inimigos do mesmo tipo
const imagens = {};

function pegarImagem(src) {
    if (!imagens[src]) {
        const img = new Image();
        img.src = src;
        imagens[src] = img;
    }
    return imagens[src];
}

// ==========================================
// CLASSE DO INIMIGO
// ==========================================

export class Inimigo {
    // chao = y da linha do chão onde ele pisa
    // opcoes: { acordado, minX, maxX }
    constructor(tipo, x, chao, opcoes = {}) {
        const cfg = TIPOS[tipo];

        this.tipo = tipo;
        this.cfg = cfg;

        this.width = cfg.largura;
        this.height = cfg.altura;
        this.position = { x: x, y: chao - cfg.altura };   // canto superior esquerdo da hitbox
        this.vx = 0;

        this.facingRight = false;     // o desenho original olha para a direita

        this.image = pegarImagem(cfg.imagem);

        // Limites por onde ele pode andar (evita cair em buracos / atravessar paredes)
        this.minX = opcoes.minX ?? 40;
        this.maxX = opcoes.maxX ?? 99999;

        this.vidaMax = cfg.vidaMax;
        this.vida = this.vidaMax;

        this.piscaAte = 0;            // pisca ao levar tiro
        this.proximoAtaque = 0;
        this.disparou = false;
        this.velAnim = 1;             // multiplicador de velocidade da animação

        // Animação
        this.atual = "idle";
        this.frame = 0;
        this.ultimoFrame = 0;
        this.terminou = false;

        // Estado inicial
        if (tipo === "zumbi") {
            if (opcoes.acordado) {
                this.estado = "levantando";       // invocado pelo boss: já nasce se levantando
                this.setAnimacao("levantar");
            } else {
                this.estado = "agachado";         // zumbi do mapa: parado, imortal, sem pista
                this.setAnimacao("agachar");
            }
        } else {
            this.estado = opcoes.acordado ? "perseguir" : "idle";
            this.setAnimacao(opcoes.acordado ? "andar" : "idle");
        }
    }

    atualizarAtributos() {
    if (this.tipo !== "gargula") return;

    // Quanto menos vida, maior o multiplicador:
    // vida cheia = 1x
    // metade da vida = 1,5x
    // sem vida = 2x
    const vidaPerdida = 1 - Math.max(0, this.vida) / this.vidaMax;
    const multiplicador = 1 + vidaPerdida;

    this.velocidadeAtual = this.cfg.velocidade * multiplicador;
    this.velAnim = multiplicador;
}

    setAnimacao(nome) {
        if (this.atual === nome) return;
        this.atual = nome;
        this.frame = 0;
        this.ultimoFrame = 0;
        this.terminou = false;
    }

    atualizarAnimacao(timestamp) {
        const anim = this.cfg.animacoes[this.atual];

        if (timestamp - this.ultimoFrame < anim.ms / this.velAnim) return;
        this.ultimoFrame = timestamp;

        if (this.frame < anim.frames - 1) {
            this.frame++;
        } else if (anim.loop) {
            this.frame = 0;
        } else {
            this.terminou = true;
        }
    }

    // Chamar dentro do ctx.translate(-camera.x, 0)
    draw(ctx, timestamp) {
        this.atualizarAnimacao(timestamp);

        const anim = this.cfg.animacoes[this.atual];
        const f = this.cfg.frame;
        const tamanho = f * this.cfg.escala;

        const pes = this.position.y + this.height;
        // Os sprites foram alinhados 4 px acima da base da célula
        const margem = 4 * this.cfg.escala;

        ctx.save();

        if (timestamp < this.piscaAte) ctx.globalAlpha = 0.5;

        ctx.translate(this.position.x + this.width / 2, 0);
        if (!this.facingRight) ctx.scale(-1, 1);

        ctx.drawImage(
            this.image,
            this.frame * f, anim.linha * f, f, f,
            -tamanho / 2, pes - tamanho + margem,
            tamanho, tamanho
        );

        ctx.restore();
    }
}

export function criarInimigo(tipo, x, chao, opcoes) {
    return new Inimigo(tipo, x, chao, opcoes);
}

// ==========================================
// ONDA SONORA DA GÁRGULA (projétil)
// ==========================================

// o = { x, y, vx }  (x, y = centro da onda). Chamar dentro do ctx.translate(-camera.x, 0)
export function desenharOnda(ctx, o, timestamp) {
    const cfg = TIPOS.gargula;
    const img = pegarImagem(cfg.imagem);
    const f = cfg.frame;
    const tam = f * cfg.escala * 1.2;

    const frame = Math.floor(timestamp / cfg.onda.ms) % cfg.onda.frames;

    ctx.save();
    ctx.translate(o.x, 0);
    if (o.vx < 0) ctx.scale(-1, 1);

    ctx.drawImage(
        img,
        frame * f, cfg.onda.linha * f, f, f,
        -tam / 2, o.y - tam / 2,
        tam, tam
    );

    ctx.restore();
}
