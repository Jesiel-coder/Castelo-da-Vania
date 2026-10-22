//salas.js - dados de cada sala (quem mexe no mapa edita só aqui)
// salas.js
export const salas = {
    tutorial: {
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/tutorial.png',
        escala: 2,
        recorte: { y: 770, h: 279 },   //faixa da imagem que tem desenho
        largura: 2550,
        floorY: 549,
        platforms: [
            { x: 574, y: 432, w: 65, h: 17 },
            { x: 767, y: 369, w: 63, h: 17 },
            { x: 1023, y: 305, w: 64, h: 17 },
            { x: 1281, y: 441, w: 64, h: 7 },

            //chão
            { x: 0, y: 500, w: 835, h: 30 },
            { x: 1346, y: 500, w: 3752, h: 20 },
        ],

        solidos: [
            //plataforma pré espinho
            { x: 0, y: 500, w: 835, h: 100 },
            //plataforma pós espinho
            { x: 1281, y: 448, w: 64, h: 59 },

            //portão no final
            { x: 4993, y: 47, w: 62, h: 254 },
        ],
                espinhos: [
            { x: 835, y: 515, w: 446, h: 34 },   // fundo do buraco (estimado)
        ],
        respawn: { x: 500, y: 500 },             // y = linha do chão onde ele reaparece

        // INIMIGOS DESTA SALA
        inimigos: [
        { tipo: 'gargula', x: 4416, y: 500 },
        { tipo: 'zumbi', x: 3180, y: 500 },
        ],

        eventList: [
            {
                id: 'irParaCorredor',
                x: 5070,
                acao: 'trocarSala',
                destino: 'corredor',
                spawn: { x: 0, },
            },
        ],
    },

    corredor: {
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/castleCorridor.png',
        escala: 1,
        recorte: { y: 481, h: 576 },
        largura: 2209,
        floorY: 511,
        platforms: [
            { x: 1025, y: 414, w: 160, h: 25 },
            { x: 1025, y: 190, w: 160, h: 25 },
        ],
        solidos: [
            //esquerda do mapa
            { x: 0, y: 30, w: 36, h: 301 },
            //direita do mapa
            { x: 0, y: 30, w: 2208, h: 31 },
            //topo do mapa
            { x: 2181, y: 63, w: 23, h: 216 },
        ],

        // INIMIGOS DESTA SALA
        inimigos: [
        { tipo: 'gargula', x: 1101, y: 511 },
        { tipo: 'gargula', x: 1641, y: 511 },
        { tipo: 'gargula', x: 2096, y: 511 },
        { tipo: 'zumbi', x: 791, y: 511 },
        { tipo: 'zumbi', x: 1105, y: 511 },
        { tipo: 'zumbi', x: 1409, y: 511 },
        { tipo: 'zumbi', x: 1845, y: 511 },
        ],

        eventList: [
            {
                id: 'irParaponte',
                x: 2189,
                acao: 'trocarSala',
                destino: 'ponte',
                spawn: { x: 50, },
            },
        ],
    },

    ponte: {
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/sala_ponte.png',
        escala: 1.5,
        recorte: { y: 0, h: 320 },
        largura: 1024,
        floorY: 531,
        platforms: [{ x: 1345, y: 244, w: 142, h: 19 }],
        solidos: [
            // Parede esquerda da torre
            { x: 0, y: 0, w: 46, h: 530 },

            // Parede horizontal abaixo da porta superior
            { x: 1344, y: 248, w: 142, h: 96 },

            // Parede horizontal acima da porta superior
            { x: 1344, y: 100, w: 142, h: 48 },
            // Parede horizontal esquerda acima da porta
            { x: 48, y: 101, w: 97, h: 240 },

            // Parede direita da torre
            { x: 1488, y: 0, w: 100, h: 541 },
            //topo do mapa
            { x: 0, y: 0, w: 1535, h: 135 },
        ],
        inimigos: [
            { tipo: 'gargula', x: 872, y: 531 },
            { tipo: 'gargula', x: 1121, y: 531 },
        ],
        eventList: [
            {
                id: 'portaEsquerda',            // → corredor
                x: 48, y: 444, w: 90, h: 87,
                acao: 'trocarSala',
                destino: 'corredor',
                spawn: { x: 2000 },
            },
            {
                id: 'portaBaixo',               // → boss
                x: 1392, y: 444, w: 90, h: 87,
                acao: 'trocarSala',
                destino: 'boss',
                spawn: { x: 40 },
            },
            {
                id: 'portaCima',                // → final
                x: 1392, y: 156, w: 90, h: 87,
                acao: 'trocarSala',
                destino: 'final',
                spawn: { x: 240 },
            },
        ],
    },

    boss: {
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/BossRoom.png',
        escala: 1.5,
        recorte: { y: 481, h: 576 },
        largura: 1024,
        floorY: 527,
        platforms: [
            { x: 190, y: 334, w: 192, h: 20 },
            { x: 622, y: 334, w: 288, h: 20 },
            { x: 1151, y: 334, w: 192, h: 20 },
        ],
        solidos: [
            { x: 1486, y: 0, w: 100, h: 540 },
            { x: 0, y: 130, w: 45, h: 48 },
            { x: 45, y: 0, w: 0, h: 130 },
        ],
        eventList: [
            {
                id: 'saidaBoss',
                x: 0, y: 440, w: 96, h: 90,
                acao: 'trocarSala',
                destino: 'ponte',
                spawn: { x: 1420 },
                condicao: 'bossMorto',
            },
        ],
    },

    final: {
        cenario: './img/finalRoom.png',
        escala: 1.7,
        recorte: { y: 0, h: 512 },
        largura: 800,
        floorY: 522,
        platforms: [
            { x:  760, y: 466, w: 380, h: 19 },
        ],
        solidos: [
            //direita do mapa
            { x: 1312, y: 32, w: 42, h: 488 },
            //esquerda do mapa
            { x: 0, y: 32, w: 47, h: 487 },
            //topo do mapa 
            { x: 0, y: 32, w: 1359, h: 54 },
            //embaixo do bau
            { x: 763, y: 483, w: 378, h: 36 },
        ],
        eventList: [
            {
                id: 'bau',
                x: 934, y: 420, w: 110, h: 50, // Em cima da plataforma do baú
                acao: 'telaFinal',
            },
        ],
    },
};