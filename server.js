const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));


// =========================================================
// PERSISTÊNCIA
// =========================================================

const ARQUIVO_JSON = './ranking.json';

let dadosApp = {
    configuracoes: {
        tempoTorneio: 180
    },

    rankingFreestyle: []
};


// =========================================================
// ESTADO OFICIAL DA COMPETIÇÃO
// =========================================================

let estadoCompeticao = {

    modo: null,

    status: 'aguardando',

    torneio: {
        robo1: 'Robô 1',
        robo2: 'Robô 2',

        pontos1: 0,
        pontos2: 0,

        tempoRestante: 180,

        vencedor: null
    },

    freestyle: {
        robo1: 'Robô 1',
        robo2: 'Robô 2',

        tempoDecorrido: 0,

        vencedor: null
    }

};


// =========================================================
// CARREGAR JSON
// =========================================================

if (fs.existsSync(ARQUIVO_JSON)) {

    try {

        const arquivo = fs.readFileSync(
            ARQUIVO_JSON,
            'utf-8'
        );

        const dadosLidos = JSON.parse(arquivo);

        if (Array.isArray(dadosLidos)) {

            dadosApp.rankingFreestyle =
                dadosLidos;

        } else {

            dadosApp = {
                ...dadosApp,
                ...dadosLidos
            };

        }

        console.log(
            'Dados carregados com sucesso.'
        );

    } catch (erro) {

        console.error(
            'Erro ao ler ranking.json:',
            erro
        );

    }

}


// =========================================================
// SALVAR DADOS
// =========================================================

function salvarDados() {

    fs.writeFileSync(
        ARQUIVO_JSON,
        JSON.stringify(
            dadosApp,
            null,
            2
        )
    );

}


salvarDados();


// =========================================================
// TIMER CENTRAL
// =========================================================

let timerServidor = null;


// =========================================================
// DESFAZER ÚLTIMA AÇÃO
// =========================================================

let estadoAnterior = null;
let ultimaAcao = null;


function salvarEstadoAnterior(descricao) {

    estadoAnterior = JSON.parse(
        JSON.stringify(estadoCompeticao)
    );

    ultimaAcao = descricao;

}


function limparEstadoAnterior() {

    estadoAnterior = null;

    ultimaAcao = null;

}



function pararTimer() {

    if (timerServidor) {

        clearInterval(timerServidor);

        timerServidor = null;

    }

}


// =========================================================
// ENVIA ESTADO PARA TODAS AS TELAS
// =========================================================

function transmitirEstado() {

    io.emit(
        'estado_competicao',
        estadoCompeticao
    );

}


// =========================================================
// TIMER DO TORNEIO
// =========================================================

function iniciarTimerTorneio() {

    pararTimer();

    estadoCompeticao.status =
        'em_andamento';

    transmitirEstado();


    timerServidor = setInterval(() => {

        if (
            estadoCompeticao
                .torneio
                .tempoRestante > 0
        ) {

            estadoCompeticao
                .torneio
                .tempoRestante--;

            transmitirEstado();

        } else {

            pararTimer();

            estadoCompeticao.status =
                'finalizado';

            transmitirEstado();

        }

    }, 1000);

}


// =========================================================
// TIMER FREESTYLE
// =========================================================

function iniciarTimerFreestyle() {

    pararTimer();

    estadoCompeticao.status =
        'em_andamento';

    transmitirEstado();


    timerServidor = setInterval(() => {

        estadoCompeticao
            .freestyle
            .tempoDecorrido++;

        transmitirEstado();

    }, 1000);

}


// =========================================================
// SEGURANÇA
// =========================================================

const SENHA_MESTRE = 'sumo2026';

let controleLogadoId = null;


// =========================================================
// SOCKET.IO
// =========================================================

io.on('connection', (socket) => {

    console.log(
        'Cliente conectado:',
        socket.id
    );


    // -----------------------------------------------------
    // SINCRONIZAÇÃO INICIAL
    // -----------------------------------------------------

    socket.emit(
        'carregar_dados',
        dadosApp
    );

    socket.emit(
        'estado_competicao',
        estadoCompeticao
    );


    // =====================================================
    // AUTENTICAÇÃO DO CONTROLE
    // =====================================================

    socket.on(
        'autenticar_controle',
        (senha) => {

            if (senha !== SENHA_MESTRE) {

                socket.emit(
                    'erro_autenticacao',
                    'Senha incorreta!'
                );

                return socket.disconnect();

            }


            if (
                controleLogadoId !== null &&
                controleLogadoId !== socket.id
            ) {

                socket.emit(
                    'erro_autenticacao',
                    'O controle já está em uso!'
                );

                return socket.disconnect();

            }


            controleLogadoId = socket.id;


            socket.emit(
                'controle_autorizado'
            );


            socket.emit(
                'carregar_dados',
                dadosApp
            );


            socket.emit(
                'estado_competicao',
                estadoCompeticao
            );

        }
    );


    // =====================================================
    // COMANDOS DO CONTROLE
    // =====================================================

    socket.on(
        'comando_controle',
        (acao) => {

            if (
                socket.id !==
                controleLogadoId
            ) {
                return;
            }

            // =====================================================
            // REGISTRA O ESTADO ANTES DE UMA ALTERAÇÃO
            // =====================================================

            const acoesDesfaziveis = [
                'PREPARAR_TORNEIO',
                'RETOMAR_TORNEIO',
                'PAUSAR_TORNEIO',
                'PONTUAR_TORNEIO',
                'INICIAR_FREESTYLE',
                'REGISTRAR_FREESTYLE'
            ];


            if (
                acoesDesfaziveis.includes(
                    acao.tipo
                )
            ) {

                salvarEstadoAnterior(
                    acao.tipo
                );

            }


            switch (acao.tipo) {


                // =========================================
                // MUDAR MODO
                // =========================================

                case 'MUDAR_MODO':

                    pararTimer();

                    estadoCompeticao.modo =
                        acao.modo;

                    estadoCompeticao.status =
                        'aguardando';

                    transmitirEstado();

                    break;


                // =========================================
                // PREPARAR TORNEIO
                // =========================================

                case 'PREPARAR_TORNEIO':

                    pararTimer();

                    estadoCompeticao.modo =
                        'torneio';

                    estadoCompeticao.status =
                        'preparado';

                    estadoCompeticao.torneio = {

                        robo1:
                            acao.robo1 ||
                            'Robô Azul',

                        robo2:
                            acao.robo2 ||
                            'Robô Vermelho',

                        pontos1: 0,

                        pontos2: 0,

                        tempoRestante:
                            dadosApp
                                .configuracoes
                                .tempoTorneio ||
                            180,

                        vencedor: null

                    };


                    transmitirEstado();

                    break;


                // =========================================
                // INICIAR / RETOMAR TORNEIO
                // =========================================

                case 'RETOMAR_TORNEIO':

                    if (
                        estadoCompeticao.modo !==
                        'torneio'
                    ) {
                        return;
                    }

                    iniciarTimerTorneio();

                    break;


                // =========================================
                // PAUSAR TORNEIO
                // =========================================

                case 'PAUSAR_TORNEIO':

                    pararTimer();

                    estadoCompeticao.status =
                        'pausado';

                    transmitirEstado();

                    break;


                // =========================================
                // PONTUAR TORNEIO
                // =========================================

                case 'PONTUAR_TORNEIO':

                    if (
                        estadoCompeticao.modo !==
                        'torneio'
                    ) {
                        return;
                    }


                    if (acao.robo === 1) {

                        estadoCompeticao
                            .torneio
                            .pontos1 =
                            acao.pontos;

                    }


                    if (acao.robo === 2) {

                        estadoCompeticao
                            .torneio
                            .pontos2 =
                            acao.pontos;

                    }


                    // Vitória
                    if (acao.pontos >= 2) {

                        pararTimer();

                        estadoCompeticao.status =
                            'finalizado';


                        estadoCompeticao
                            .torneio
                            .vencedor =
                            acao.robo === 1
                                ? estadoCompeticao
                                    .torneio
                                    .robo1
                                : estadoCompeticao
                                    .torneio
                                    .robo2;

                    } else {

                        const p1 =
                            estadoCompeticao
                                .torneio
                                .pontos1;

                        const p2 =
                            estadoCompeticao
                                .torneio
                                .pontos2;


                        if (
                            p1 < 2 &&
                            p2 < 2
                        ) {

                            estadoCompeticao
                                .torneio
                                .vencedor =
                                null;

                        }

                    }


                    transmitirEstado();

                    break;


                // =========================================
                // CANCELAR TORNEIO
                // =========================================

                case 'CANCELAR_TORNEIO':

                    pararTimer();

                    estadoCompeticao.status =
                        'cancelado';

                    estadoCompeticao
                        .torneio
                        .pontos1 = 0;

                    estadoCompeticao
                        .torneio
                        .pontos2 = 0;

                    estadoCompeticao
                        .torneio
                        .vencedor = null;

                    estadoCompeticao
                        .torneio
                        .tempoRestante =
                        dadosApp
                            .configuracoes
                            .tempoTorneio ||
                        180;


                    transmitirEstado();

                    break;


                // =========================================
                // INICIAR FREESTYLE
                // =========================================

                case 'INICIAR_FREESTYLE':

                    pararTimer();

                    estadoCompeticao.modo =
                        'freestyle';

                    estadoCompeticao.status =
                        'preparado';

                    estadoCompeticao.freestyle = {

                        robo1:
                            acao.robo1 ||
                            'Robô Azul',

                        robo2:
                            acao.robo2 ||
                            'Robô Vermelho',

                        tempoDecorrido: 0,

                        vencedor: null

                    };


                    transmitirEstado();


                    iniciarTimerFreestyle();

                    break;


                // =========================================
                // REGISTRAR FREESTYLE
                // =========================================

                case 'REGISTRAR_FREESTYLE':

                    if (
                        estadoCompeticao.modo !==
                        'freestyle'
                    ) {
                        return;
                    }


                    pararTimer();


                    estadoCompeticao.status =
                        'finalizado';


                    estadoCompeticao
                        .freestyle
                        .vencedor =
                        acao.vencedor;


                    const registro = {

                        nome:
                            acao.vencedor,

                        robo1:
                            estadoCompeticao
                                .freestyle
                                .robo1,

                        robo2:
                            estadoCompeticao
                                .freestyle
                                .robo2,

                        tempoSegundos:
                            estadoCompeticao
                                .freestyle
                                .tempoDecorrido,

                        horario:
                            new Date()
                                .toLocaleTimeString(
                                    'pt-BR',
                                    {
                                        hour:
                                            '2-digit',

                                        minute:
                                            '2-digit'
                                    }
                                )

                    };


                    dadosApp
                        .rankingFreestyle
                        .push(registro);


                    dadosApp
                        .rankingFreestyle
                        .sort(
                            (a, b) =>
                                a.tempoSegundos -
                                b.tempoSegundos
                        );


                    salvarDados();


                    io.emit(
                        'carregar_dados',
                        dadosApp
                    );


                    transmitirEstado();

                    break;


                // =========================================
                // CANCELAR FREESTYLE
                // =========================================

                case 'CANCELAR_FREESTYLE':

                    pararTimer();

                    estadoCompeticao.status =
                        'cancelado';

                    estadoCompeticao
                        .freestyle
                        .tempoDecorrido = 0;

                    estadoCompeticao
                        .freestyle
                        .vencedor = null;


                    transmitirEstado();

                    break;

                // =========================================
                // DESFAZER ÚLTIMA AÇÃO
                // =========================================

                case 'DESFAZER_ULTIMA_ACAO':

                    if (!estadoAnterior) {

                        socket.emit(
                            'erro_desfazer',
                            'Não há nenhuma ação para desfazer.'
                        );

                        return;

                    }


                    pararTimer();


                    estadoCompeticao =
                        JSON.parse(
                            JSON.stringify(
                                estadoAnterior
                            )
                        );


                    const acaoDesfeita =
                        ultimaAcao;


                    limparEstadoAnterior();


                    // =====================================================
                    // RESTAURA O TIMER SE NECESSÁRIO
                    // =====================================================

                    if (
                        estadoCompeticao.status ===
                        'em_andamento'
                    ) {

                        if (
                            estadoCompeticao.modo ===
                            'torneio'
                        ) {

                            iniciarTimerTorneio();

                        }


                        if (
                            estadoCompeticao.modo ===
                            'freestyle'
                        ) {

                            iniciarTimerFreestyle();

                        }

                    } else {

                        transmitirEstado();

                    }


                    io.emit(
                        'acao_desfeita',
                        {
                            acao:
                                acaoDesfeita
                        }
                    );


                    break;

            }

        }
    );


    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    socket.on(
        'salvar_configuracoes',
        (novaConfig) => {

            if (
                socket.id !==
                controleLogadoId
            ) {
                return;
            }


            dadosApp.configuracoes =
                novaConfig;


            salvarDados();


            io.emit(
                'carregar_dados',
                dadosApp
            );

        }
    );


    // =====================================================
    // DESCONEXÃO
    // =====================================================

    socket.on(
        'disconnect',
        () => {

            console.log(
                'Cliente desconectado:',
                socket.id
            );


            if (
                socket.id ===
                controleLogadoId
            ) {

                controleLogadoId = null;

            }

        }
    );

});


// =========================================================
// SERVIDOR
// =========================================================

const PORT = 3000;


server.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `Servidor rodando na porta ${PORT}`
        );

    }
);