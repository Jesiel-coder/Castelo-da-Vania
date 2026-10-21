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
        floorY: 500,
        platforms: [
            { x: 574, y: 432, w: 65, h: 17 },
            { x: 767, y: 369, w: 63, h: 17 },
            { x: 1023, y: 305, w: 64, h: 17 },
            { x: 1281, y: 441, w: 64, h: 7 },
        ],

        solidos: [
            { x: 1281, y: 448, w: 64, h: 59 },
        ],
        eventList: [
            {
                id: 'irParaCorredor',
                x: 5040,
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
        solidos: [],
        eventList: [
            {
                id: 'irParaponte',
                x: 2120,
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
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/finalRoom.png',
        escala: 1.7,
        recorte: { y: 0, h: 512 },
        largura: 800,
        floorY: 522,
        platforms: [],
        solidos: [],
        eventList: [],
    },
};