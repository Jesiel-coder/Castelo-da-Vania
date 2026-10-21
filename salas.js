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
                id: 'irParaPonte',
                x: 5040,
                acao: 'trocarSala',
                destino: 'ponte',
                spawn: { x: 83, },
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
        platforms: [ { x: 1345, y: 244, w: 142, h: 19 } ],
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
        eventList: [],
    },
};