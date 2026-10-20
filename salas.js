//salas.js - dados de cada sala (quem mexe no mapa edita só aqui)
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
            { x: 1281, y: 441, w: 64, h: 17 },
        ]
    },

}