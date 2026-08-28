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
        tempoTorneio: 180,
        tempoFreestyle: 60
    },

    rankingFreestyle: [],
    filaEspera: []
};


// =========================================================
// ESTADO OFICIAL DA COMPETIÇÃO
// =========================================================

let estadoCompeticao = {

    modo: null,

    status: 'aguardando',
    exibicaoFreestyle: 'ambos',   // 'ambos' | 'placar' | 'ranking'


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

            dadosApp.rankingFreestyle = dadosLidos;

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


function salvarDados() {

    try {
        fs.writeFileSync(
            ARQUIVO_JSON,
            JSON.stringify(dadosApp, null, 2)
        );
    } catch (erro) {
        console.error('Erro ao salvar ranking.json:', erro);
    }

}


salvarDados();


// =========================================================
// TIMER CENTRAL
// =========================================================

let timerServidor = null;


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

    estadoCompeticao.status = 'em_andamento';

    transmitirEstado();


    timerServidor = setInterval(() => {

        estadoCompeticao.freestyle.tempoDecorrido++;

        const limite = dadosApp.configuracoes.tempoFreestyle || 60;

        if (estadoCompeticao.freestyle.tempoDecorrido >= limite) {

            pararTimer();

            estadoCompeticao.status = 'finalizado';
            // vencedor permanece null — o operador ainda decide
            // manualmente (ou marca "Sem Vencedor")

            transmitirEstado();

            return;
        }

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


    // =====================================================
    // SINCRONIZAÇÃO INICIAL
    // =====================================================

    socket.emit(
        'carregar_dados',
        dadosApp
    );

    socket.emit(
        'estado_competicao',
        estadoCompeticao
    );


    // =====================================================
    // AUTENTICAÇÃO
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


            controleLogadoId =
                socket.id;


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


            switch (acao.tipo) {

                // =========================================
                // MUDAR MODO
                // =========================================

                case 'MUDAR_MODO':

                    // Não reseta se já estamos no mesmo modo com uma partida rodando
                    // (evita apagar uma partida em andamento por clique acidental na aba)
                    if (
                        estadoCompeticao.modo === acao.modo &&
                        estadoCompeticao.status === 'em_andamento'
                    ) {
                        return;
                    }

                    pararTimer();

                    estadoCompeticao.modo = acao.modo;
                    estadoCompeticao.status = 'aguardando';

                    if (acao.modo === 'torneio') {

                        estadoCompeticao.torneio = {
                            robo1: 'Robô 1',
                            robo2: 'Robô 2',
                            pontos1: 0,
                            pontos2: 0,
                            tempoRestante: dadosApp.configuracoes.tempoTorneio || 180,
                            vencedor: null
                        };
                    }

                    if (acao.modo === 'freestyle') {

                        estadoCompeticao.freestyle = {
                            robo1: 'Robô 1',
                            robo2: 'Robô 2',
                            tempoDecorrido: 0,
                            vencedor: null
                        };
                    }

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

                        pontos1:
                            0,

                        pontos2:
                            0,

                        tempoRestante:
                            dadosApp
                                .configuracoes
                                .tempoTorneio ||
                            180,

                        vencedor:
                            null

                    };


                    transmitirEstado();

                    break;


                // =========================================
                // RETOMAR TORNEIO
                // =========================================

                case 'RETOMAR_TORNEIO':

                    if (
                        estadoCompeticao.modo !==
                        'torneio'
                    ) {
                        return;
                    }


                    if (
                        estadoCompeticao.status ===
                        'finalizado'
                    ) {

                        return;

                    }


                    if (
                        estadoCompeticao
                            .torneio
                            .tempoRestante <= 0
                    ) {

                        return;

                    }


                    iniciarTimerTorneio();

                    break;


                // =========================================
                // PAUSAR TORNEIO
                // =========================================

                case 'PAUSAR_TORNEIO':

                    if (
                        estadoCompeticao.modo !==
                        'torneio'
                    ) {
                        return;
                    }


                    if (
                        estadoCompeticao.status !==
                        'em_andamento'
                    ) {

                        return;

                    }


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


                    // Só permite pontuar durante a partida

                    if (
                        estadoCompeticao.status !==
                        'em_andamento'
                    ) {

                        socket.emit(
                            'erro_comando',
                            'A partida precisa estar em andamento para pontuar.'
                        );

                        return;

                    }


                    // Normaliza o número do robô

                    const robo =
                        Number(acao.robo);


                    // Normaliza a pontuação

                    const pontos =
                        Number(acao.pontos);


                    // Aceita somente robôs 1 e 2

                    if (
                        ![1, 2].includes(robo)
                    ) {

                        return;

                    }


                    // Aceita somente 0, 1 ou 2 pontos

                    if (
                        ![0, 1, 2].includes(pontos)
                    ) {

                        return;

                    }


                    // ==============================
                    // ROBÔ AZUL
                    // ==============================

                    if (robo === 1) {

                        estadoCompeticao
                            .torneio
                            .pontos1 =
                            pontos;

                    }


                    // ==============================
                    // ROBÔ VERMELHO
                    // ==============================

                    if (robo === 2) {

                        estadoCompeticao
                            .torneio
                            .pontos2 =
                            pontos;

                    }


                    // ==============================
                    // VITÓRIA
                    // ==============================

                    if (pontos >= 2) {

                        pararTimer();

                        estadoCompeticao.status =
                            'finalizado';


                        estadoCompeticao
                            .torneio
                            .vencedor =
                            robo === 1
                                ? estadoCompeticao
                                    .torneio
                                    .robo1

                                : estadoCompeticao
                                    .torneio
                                    .robo2;

                    }


                    transmitirEstado();

                    break;


                // =========================================
                // DESFAZER PONTO
                // =========================================

                case 'DESFAZER_PONTO_TORNEIO':

                    if (
                        estadoCompeticao.modo !==
                        'torneio'
                    ) {
                        return;
                    }


                    if (
                        ![1, 2].includes(
                            Number(acao.robo)
                        )
                    ) {
                        return;
                    }


                    /*
                     * O tempo NÃO é alterado.
                     * Apenas a pontuação volta um ponto.
                     */

                    if (
                        acao.robo === 1
                    ) {

                        estadoCompeticao
                            .torneio
                            .pontos1 =
                            Math.max(
                                0,
                                estadoCompeticao
                                    .torneio
                                    .pontos1 - 1
                            );

                    }


                    if (
                        acao.robo === 2
                    ) {

                        estadoCompeticao
                            .torneio
                            .pontos2 =
                            Math.max(
                                0,
                                estadoCompeticao
                                    .torneio
                                    .pontos2 - 1
                            );

                    }


                    /*
                     * Ao desfazer uma vitória,
                     * a partida fica pausada.
                     * O operador decide se quer retomar.
                     */

                    if (
                        estadoCompeticao
                            .torneio
                            .pontos1 < 2 &&
                        estadoCompeticao
                            .torneio
                            .pontos2 < 2
                    ) {

                        estadoCompeticao
                            .torneio
                            .vencedor =
                            null;


                        estadoCompeticao.status =
                            'pausado';

                    }


                    transmitirEstado();

                    break;


                // =========================================
                // CANCELAR TORNEIO
                // =========================================

                case 'CANCELAR_TORNEIO':

                    pararTimer();

                    estadoCompeticao.torneio = {
                        robo1: 'Robô 1',
                        robo2: 'Robô 2',
                        pontos1: 0,
                        pontos2: 0,
                        tempoRestante: dadosApp.configuracoes.tempoTorneio || 180,
                        vencedor: null
                    };

                    estadoCompeticao.status = 'aguardando';

                    transmitirEstado();

                    break;

                    pararTimer();

                    estadoCompeticao.status =
                        'cancelado';


                    estadoCompeticao
                        .torneio
                        .pontos1 =
                        0;


                    estadoCompeticao
                        .torneio
                        .pontos2 =
                        0;


                    estadoCompeticao
                        .torneio
                        .vencedor =
                        null;


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

                    if (
                        estadoCompeticao.modo !==
                        'freestyle'
                    ) {

                        return;

                    }


                    if (
                        estadoCompeticao.status !==
                        'preparado'
                    ) {

                        return;

                    }


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


                    if (
                        estadoCompeticao.status !==
                        'em_andamento'
                    ) {

                        socket.emit(
                            'erro_comando',
                            'A partida freestyle não está em andamento.'
                        );

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

                    estadoCompeticao.freestyle = {
                        robo1: 'Robô 1',
                        robo2: 'Robô 2',
                        tempoDecorrido: 0,
                        vencedor: null
                    };

                    estadoCompeticao.status = 'aguardando';

                    transmitirEstado();

                    break;
                    pararTimer();

                    estadoCompeticao.status =
                        'cancelado';


                    estadoCompeticao
                        .freestyle
                        .tempoDecorrido =
                        0;


                    estadoCompeticao
                        .freestyle
                        .vencedor =
                        null;


                    transmitirEstado();

                    break;

                // =========================================
                // PREPARAR FREESTYLE
                // =========================================

                case 'PREPARAR_FREESTYLE':

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

                        tempoDecorrido:
                            0,

                        vencedor:
                            null

                    };


                    transmitirEstado();

                    break;

                // =========================================
                // RESETAR COMPETIÇÃO
                // =========================================

                case 'RESETAR_COMPETICAO':

                    pararTimer();

                    const exibicaoAtual = estadoCompeticao.exibicaoFreestyle || 'ambos';

                    estadoCompeticao = {
                        modo: null,
                        status: 'aguardando',
                        exibicaoFreestyle: exibicaoAtual,

                        torneio: {
                            robo1: 'Robô 1',
                            robo2: 'Robô 2',
                            pontos1: 0,
                            pontos2: 0,
                            tempoRestante: dadosApp.configuracoes.tempoTorneio || 180,
                            vencedor: null
                        },

                        freestyle: {
                            robo1: 'Robô 1',
                            robo2: 'Robô 2',
                            tempoDecorrido: 0,
                            vencedor: null
                        }
                    };

                    transmitirEstado();

                    break;
                case 'DEFINIR_EXIBICAO_FREESTYLE':

                    if (!['ambos', 'placar', 'ranking'].includes(acao.exibicao)) {
                        return;
                    }

                    estadoCompeticao.exibicaoFreestyle = acao.exibicao;

                    transmitirEstado();

                    break;

                // =========================================
                // FILA DE PARTICIPANTES
                // =========================================

                case 'FILA_ADICIONAR': {

                    const nome = (acao.nome || '').toString().trim().slice(0, 30);

                    if (!nome) return;
                    if (dadosApp.filaEspera.length >= 50) return; // limite de segurança

                    dadosApp.filaEspera.push(nome);

                    salvarDados();
                    io.emit('carregar_dados', dadosApp);

                    break;
                }

                case 'FILA_REMOVER': {

                    const indice = Number(acao.indice);
                    if (!Number.isInteger(indice)) return;

                    dadosApp.filaEspera.splice(indice, 1);

                    salvarDados();
                    io.emit('carregar_dados', dadosApp);

                    break;
                }

                case 'FILA_MOVER_TOPO': {

                    const indice = Number(acao.indice);
                    if (!Number.isInteger(indice) || indice <= 0 || indice >= dadosApp.filaEspera.length) return;

                    const [item] = dadosApp.filaEspera.splice(indice, 1);
                    dadosApp.filaEspera.unshift(item);

                    salvarDados();
                    io.emit('carregar_dados', dadosApp);

                    break;
                }

                case 'FILA_SUBIR': {

                    const indice = Number(acao.indice);
                    if (!Number.isInteger(indice) || indice <= 0 || indice >= dadosApp.filaEspera.length) return;

                    const anterior = dadosApp.filaEspera[indice - 1];
                    dadosApp.filaEspera[indice - 1] = dadosApp.filaEspera[indice];
                    dadosApp.filaEspera[indice] = anterior;

                    salvarDados();
                    io.emit('carregar_dados', dadosApp);

                    break;
                }

            }

        }
    );


    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    socket.on(
        'salvar_configuracoes',
        (novaConfig) => {

            if (socket.id !== controleLogadoId) {
                return;
            }

            const novoTempoTorneio = Number(novaConfig.tempoTorneio);
            const novoTempoFreestyle = Number(novaConfig.tempoFreestyle);

            if (!Number.isFinite(novoTempoTorneio) || novoTempoTorneio <= 0) {
                socket.emit('erro_comando', 'Tempo do Torneio inválido.');
                return;
            }

            if (!Number.isFinite(novoTempoFreestyle) || novoTempoFreestyle <= 0) {
                socket.emit('erro_comando', 'Tempo do Freestyle inválido.');
                return;
            }

            dadosApp.configuracoes = {
                tempoTorneio: novoTempoTorneio,
                tempoFreestyle: novoTempoFreestyle
            };

            /*
             * Se não existe uma partida de Torneio em andamento,
             * o novo tempo já passa a aparecer no painel.
             */
            if (
                estadoCompeticao.modo === 'torneio' &&
                estadoCompeticao.status !== 'em_andamento'
            ) {
                estadoCompeticao.torneio.tempoRestante = novoTempoTorneio;
            }

            salvarDados();

            io.emit('carregar_dados', dadosApp);

            transmitirEstado();
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

                controleLogadoId =
                    null;

            }

        }
    );

});


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