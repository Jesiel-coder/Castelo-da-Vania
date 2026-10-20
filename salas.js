//salas.js - dados de cada sala (quem mexe no mapa edita só aqui)
// salas.js
export const salas = {
    tutorial: {
        ceu: './img/sky.png',
        ceuFator: 0.1,
        cenario: './img/Tutorial.png',
        escala: 2,
        recorte: { y: 739, h: 288 },
        largura: 1984,
        floorY: 472,
        platforms: [
            { x: 641, y: 411, w: 65, h: 17 },
            { x: 834, y: 348, w: 63, h: 17 },
            { x: 1086, y: 284, w: 64, h: 17 },
        ],

        eventList: [
            {
                id: 'irParaPonte',
                x: 500,
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
        platforms: [],
        eventList: [],
    },
};