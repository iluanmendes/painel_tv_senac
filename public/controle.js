const socket = io();

let estadoCompeticao = null;

const telaBloqueio = document.getElementById('tela-bloqueio');
const inputSenha = document.getElementById('input-senha');
const btnEntrar = document.getElementById('btn-entrar');
const msgErroLogin = document.getElementById('msg-erro-login');
const statusConexao = document.getElementById('status-conexao');

function tentarEntrar() {
    const senha = inputSenha.value.trim();

    if (!senha) {
        msgErroLogin.innerText = 'Digite a senha.';
        msgErroLogin.classList.remove('oculto');
        return;
    }

    msgErroLogin.classList.add('oculto');
    btnEntrar.disabled = true;
    btnEntrar.innerText = 'Entrando...';

    socket.emit('autenticar_controle', senha);
}

btnEntrar.addEventListener('click', tentarEntrar);

inputSenha.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tentarEntrar();
});

socket.on('erro_autenticacao', (mensagem) => {
    btnEntrar.disabled = false;
    btnEntrar.innerText = 'Entrar';
    msgErroLogin.innerText = mensagem;
    msgErroLogin.classList.remove('oculto');
    inputSenha.value = '';
    inputSenha.focus();
});

socket.on('controle_autorizado', () => {
    telaBloqueio.classList.add('oculto');
    document.getElementById('conteudo-controle').classList.remove('oculto');
});

// =========================================================
// STATUS DE CONEXÃO
// =========================================================

socket.on('connect', () => {
    statusConexao.classList.remove('status-offline');
    statusConexao.classList.add('status-online');
    statusConexao.innerHTML = '<span class="ponto"></span> Conectado';
});

socket.on('disconnect', () => {
    statusConexao.classList.remove('status-online');
    statusConexao.classList.add('status-offline');
    statusConexao.innerHTML = '<span class="ponto"></span> Desconectado — tentando reconectar...';
});



// =========================================================
// CONFIGURAÇÕES
// =========================================================

socket.on(
    'carregar_dados',
    (dados) => {

        if (
            dados &&
            dados.configuracoes
        ) {

            document.getElementById(
                'input-tempo-torneio'
            ).value =
                dados
                    .configuracoes
                    .tempoTorneio;

        }

    }
);


// =========================================================
// ESTADO OFICIAL
// =========================================================

socket.on(
    'estado_competicao',
    (estado) => {

        estadoCompeticao =
            estado;


        sincronizarControle();

    }
);


// =========================================================
// SINCRONIZAR CONTROLE
// =========================================================

function sincronizarControle() {

    if (!estadoCompeticao) return;

    if (!estadoCompeticao.modo) {

        document.getElementById('controles-torneio').classList.add('oculto');
        document.getElementById('controles-freestyle').classList.add('oculto');

        inputR1.disabled = false;
        inputR2.disabled = false;
        inputR1.value = '';
        inputR2.value = '';

        inputFreeRobo1.disabled = false;
        inputFreeRobo2.disabled = false;
        inputFreeRobo1.value = '';
        inputFreeRobo2.value = '';

        acoesPreparo.classList.remove('oculto');
        acoesJogo.classList.add('oculto');
        acoesPreparoFree.classList.remove('oculto');
        acoesJogoFree.classList.add('oculto');
    }

    sincronizarTorneio();
    sincronizarFreestyle();
}



function atualizarAbaAtiva() {
    document.getElementById('btn-modo-torneio')
        .classList.toggle('ativo', estadoCompeticao?.modo === 'torneio');

    document.getElementById('btn-modo-freestyle')
        .classList.toggle('ativo', estadoCompeticao?.modo === 'freestyle');
}




// =========================================================
// TORNEIO
// =========================================================

function sincronizarTorneio() {

    if (estadoCompeticao.modo !== 'torneio') {
        return;
    }

    const dados = estadoCompeticao.torneio;
    if (!dados) return;

    pontosR1 = Number(dados.pontos1) || 0;
    pontosR2 = Number(dados.pontos2) || 0;

    const partidaRodando = estadoCompeticao.status === 'em_andamento';

    // Estados em que a partida já foi preparada/está em curso
    const emJogo = ['preparado', 'em_andamento', 'pausado', 'finalizado']
        .includes(estadoCompeticao.status);

    if (emJogo) {
        acoesPreparo.classList.add('oculto');
        acoesJogo.classList.remove('oculto');

        inputR1.disabled = true;
        inputR2.disabled = true;
        if (dados.robo1) inputR1.value = dados.robo1;
        if (dados.robo2) inputR2.value = dados.robo2;
    } else {
        acoesJogo.classList.add('oculto');
        acoesPreparo.classList.remove('oculto');

        inputR1.disabled = false;
        inputR2.disabled = false;
    }

    const btnPontoR1 = document.getElementById('btn-ponto-robo1');
    const btnPontoR2 = document.getElementById('btn-ponto-robo2');
    const btnDesfazerR1 = document.getElementById('btn-desfazer-robo1');
    const btnDesfazerR2 = document.getElementById('btn-desfazer-robo2');

    if (btnPontoR1) btnPontoR1.disabled = !partidaRodando || pontosR1 >= 2;
    if (btnPontoR2) btnPontoR2.disabled = !partidaRodando || pontosR2 >= 2;
    if (btnDesfazerR1) btnDesfazerR1.disabled = pontosR1 <= 0;
    if (btnDesfazerR2) btnDesfazerR2.disabled = pontosR2 <= 0;

    if (partidaRodando) {
        btnIniciarTempo.classList.add('oculto');
        btnPausarTempo.classList.remove('oculto');
    } else {
        btnPausarTempo.classList.add('oculto');

        const podeIniciar =
            estadoCompeticao.status !== 'cancelado' &&
            estadoCompeticao.status !== 'finalizado' &&
            dados.tempoRestante > 0;

        if (podeIniciar) {
            btnIniciarTempo.classList.remove('oculto');
            btnIniciarTempo.innerText = estadoCompeticao.status === 'pausado'
                ? '▶️ Retomar Partida'
                : '▶️ Iniciar Partida';
        } else {
            btnIniciarTempo.classList.add('oculto');
        }
    }
}


// =========================================================
// FREESTYLE
// =========================================================

function sincronizarFreestyle() {

    if (estadoCompeticao.modo !== 'freestyle') {
        return;
    }

    const dados = estadoCompeticao.freestyle;
    if (!dados) return;

    const preparadoOuAndamento = ['preparado', 'em_andamento', 'finalizado']
        .includes(estadoCompeticao.status);

    if (preparadoOuAndamento) {
        acoesPreparoFree.classList.add('oculto');
        acoesJogoFree.classList.remove('oculto');

        inputFreeRobo1.disabled = true;
        inputFreeRobo2.disabled = true;
        if (dados.robo1) { freeRobo1 = dados.robo1; inputFreeRobo1.value = dados.robo1; }
        if (dados.robo2) { freeRobo2 = dados.robo2; inputFreeRobo2.value = dados.robo2; }
    } else {
        acoesJogoFree.classList.add('oculto');
        acoesPreparoFree.classList.remove('oculto');

        inputFreeRobo1.disabled = false;
        inputFreeRobo2.disabled = false;
    }

    const emAndamento = estadoCompeticao.status === 'em_andamento';

    if (emAndamento) {
        btnIniciarFree.classList.add('oculto');
        acoesVencedorFree.classList.remove('oculto');
    } else if (preparadoOuAndamento) {
        btnIniciarFree.classList.remove('oculto');
        acoesVencedorFree.classList.add('oculto');
    }
}

// =========================================================
// NAVEGAÇÃO
// =========================================================

function alternarModo(
    idModo,
    comandoSocket
) {

    document
        .getElementById(
            'controles-torneio'
        )
        .classList
        .add('oculto');


    document
        .getElementById(
            'controles-freestyle'
        )
        .classList
        .add('oculto');


    document
        .getElementById(
            'controles-config'
        )
        .classList
        .add('oculto');


    document
        .getElementById(
            idModo
        )
        .classList
        .remove('oculto');


    if (comandoSocket) {

        socket.emit(
            'comando_controle',
            {
                tipo:
                    'MUDAR_MODO',

                modo:
                    comandoSocket
            }
        );

    }

}


document
    .getElementById(
        'btn-modo-torneio'
    )
    .addEventListener(
        'click',
        () =>
            alternarModo(
                'controles-torneio',
                'torneio'
            )
    );


document
    .getElementById(
        'btn-modo-freestyle'
    )
    .addEventListener(
        'click',
        () =>
            alternarModo(
                'controles-freestyle',
                'freestyle'
            )
    );


document.getElementById('btn-abrir-config').addEventListener('click', () => {
    document.getElementById('controles-torneio').classList.add('oculto');
    document.getElementById('controles-freestyle').classList.add('oculto');
    document.getElementById('controles-config').classList.remove('oculto');
});

document.getElementById('btn-fechar-config').addEventListener('click', () => {
    document.getElementById('controles-config').classList.add('oculto');

    // Volta para a tela do modo que estava ativo, se houver
    if (estadoCompeticao?.modo === 'torneio') {
        document.getElementById('controles-torneio').classList.remove('oculto');
    } else if (estadoCompeticao?.modo === 'freestyle') {
        document.getElementById('controles-freestyle').classList.remove('oculto');
    }
});


document.getElementById('btn-resetar-competicao').addEventListener('click', () => {

    const confirmado = confirm(
        'Isso vai encerrar a partida/preparação atual e voltar a TV para a tela inicial.\n\n' +
        'O ranking do Freestyle NÃO será apagado.\n\n' +
        'Confirma?'
    );

    if (!confirmado) return;
    console.log("ASNAEB")
    socket.emit('comando_controle', { tipo: 'RESETAR_COMPETICAO' });
});


// =========================================================
// SALVAR CONFIGURAÇÕES
// =========================================================

document
    .getElementById(
        'btn-salvar-config'
    )
    .addEventListener(
        'click',
        () => {

            const tempo =
                parseInt(
                    document
                        .getElementById(
                            'input-tempo-torneio'
                        )
                        .value
                );


            if (tempo > 0) {

                socket.emit(
                    'salvar_configuracoes',
                    {
                        tempoTorneio:
                            tempo
                    }
                );


                alert(
                    'Configuração salva com sucesso!'
                );

            } else {

                alert(
                    'Digite um tempo válido maior que 0.'
                );

            }

        }
    );


// =========================================================
// TORNEIO
// =========================================================

let pontosR1 = 0;
let pontosR2 = 0;


const inputR1 =
    document.getElementById(
        'input-robo1'
    );


const inputR2 =
    document.getElementById(
        'input-robo2'
    );


const acoesPreparo =
    document.getElementById(
        'acoes-preparo-torneio'
    );


const acoesJogo =
    document.getElementById(
        'acoes-jogo-torneio'
    );


const btnIniciarTempo =
    document.getElementById(
        'btn-iniciar-tempo-torneio'
    );


const btnPausarTempo =
    document.getElementById(
        'btn-pausar-tempo-torneio'
    );






// =========================================================
// PREPARAR TORNEIO
// =========================================================

document
    .getElementById(
        'btn-preparar-torneio'
    )
    .addEventListener(
        'click',
        () => {

            const robo1 =
                inputR1.value.trim() ||
                'Robô Azul';


            const robo2 =
                inputR2.value.trim() ||
                'Robô Vermelho';


            pontosR1 = 0;
            pontosR2 = 0;


            inputR1.disabled =
                true;

            inputR2.disabled =
                true;


            acoesPreparo
                .classList
                .add('oculto');


            acoesJogo
                .classList
                .remove('oculto');


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'PREPARAR_TORNEIO',

                    robo1,
                    robo2
                }
            );

        }
    );


// =========================================================
// INICIAR / RETOMAR
// =========================================================

btnIniciarTempo
    .addEventListener(
        'click',
        () => {

            btnIniciarTempo
                .classList
                .add('oculto');


            btnPausarTempo
                .classList
                .remove('oculto');


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'RETOMAR_TORNEIO'
                }
            );

        }
    );


// =========================================================
// PAUSAR
// =========================================================

btnPausarTempo
    .addEventListener(
        'click',
        () => {

            btnPausarTempo
                .classList
                .add('oculto');


            btnIniciarTempo
                .classList
                .remove('oculto');


            btnIniciarTempo.innerText =
                '▶️ Retomar Relógio';


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'PAUSAR_TORNEIO'
                }
            );

        }
    );


// =========================================================
// PONTUAÇÃO
// =========================================================

function enviarPontoTorneio(
    robo,
    pontos
) {
    if (navigator.vibrate) navigator.vibrate(40);
    socket.emit(
        'comando_controle',
        {
            tipo:
                'PONTUAR_TORNEIO',

            robo,
            pontos
        }
    );

}


// ROBÔ 1

document
    .getElementById(
        'btn-ponto-robo1'
    )
    .addEventListener(
        'click',
        () => {

            if (pontosR1 < 2) {

                pontosR1++;

                enviarPontoTorneio(
                    1,
                    pontosR1
                );

            }

        }
    );


// =========================================================
// CORRIGIR PONTUAÇÃO AZUL
// =========================================================

document
    .getElementById(
        'btn-desfazer-robo1'
    )
    .addEventListener(
        'click',
        () => {

            if (pontosR1 > 0) {

                pontosR1--;

                enviarPontoTorneio(
                    1,
                    pontosR1
                );

            }

        }
    );


// =========================================================
// CORRIGIR PONTUAÇÃO VERMELHA
// =========================================================

document
    .getElementById(
        'btn-desfazer-robo2'
    )
    .addEventListener(
        'click',
        () => {

            if (pontosR2 > 0) {

                pontosR2--;

                enviarPontoTorneio(
                    2,
                    pontosR2
                );

            }

        }
    );




// ROBÔ 2

document
    .getElementById(
        'btn-ponto-robo2'
    )
    .addEventListener(
        'click',
        () => {

            if (pontosR2 < 2) {

                pontosR2++;

                enviarPontoTorneio(
                    2,
                    pontosR2
                );

            }

        }
    );



// =========================================================
// CANCELAR TORNEIO
// =========================================================

document
    .getElementById(
        'btn-cancelar-torneio'
    )
    .addEventListener(
        'click',
        () => {

            inputR1.disabled =
                false;

            inputR2.disabled =
                false;


            inputR1.value = '';
            inputR2.value = '';


            acoesJogo
                .classList
                .add('oculto');


            acoesPreparo
                .classList
                .remove('oculto');


            btnIniciarTempo
                .classList
                .remove('oculto');


            btnIniciarTempo.innerText =
                '▶️ Iniciar Relógio';


            btnPausarTempo
                .classList
                .add('oculto');


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'CANCELAR_TORNEIO'
                }
            );

        }
    );


// =========================================================
// FREESTYLE
// =========================================================

const inputFreeRobo1 =
    document.getElementById(
        'input-free-robo1'
    );


const inputFreeRobo2 =
    document.getElementById(
        'input-free-robo2'
    );


const btnPrepararFree =
    document.getElementById(
        'btn-preparar-freestyle'
    );


const acoesPreparoFree =
    document.getElementById(
        'acoes-preparo-freestyle'
    );


const acoesJogoFree =
    document.getElementById(
        'acoes-jogo-freestyle'
    );


const btnIniciarFree =
    document.getElementById(
        'btn-iniciar-freestyle'
    );


const acoesVencedorFree =
    document.getElementById(
        'acoes-vencedor-freestyle'
    );


const btnVenceuRobo1 =
    document.getElementById(
        'btn-venceu-robo1'
    );


const btnVenceuRobo2 =
    document.getElementById(
        'btn-venceu-robo2'
    );


const btnCancelarFree =
    document.getElementById(
        'btn-cancelar-freestyle'
    );


let freeRobo1 = '';
let freeRobo2 = '';


// =========================================================
// PREPARAR FREESTYLE
// =========================================================

btnPrepararFree
    .addEventListener(
        'click',
        () => {

            freeRobo1 =
                inputFreeRobo1
                    .value
                    .trim() ||
                'Robô Azul';


            freeRobo2 =
                inputFreeRobo2
                    .value
                    .trim() ||
                'Robô Vermelho';


            inputFreeRobo1.disabled =
                true;

            inputFreeRobo2.disabled =
                true;


            acoesPreparoFree
                .classList
                .add('oculto');


            acoesJogoFree
                .classList
                .remove('oculto');


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'PREPARAR_FREESTYLE',

                    robo1:
                        freeRobo1,

                    robo2:
                        freeRobo2
                }
            );

        }
    );



// =========================================================
// INICIAR FREESTYLE
// =========================================================

btnIniciarFree
    .addEventListener(
        'click',
        () => {

            btnIniciarFree
                .classList
                .add('oculto');


            acoesVencedorFree
                .classList
                .remove('oculto');


            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'INICIAR_FREESTYLE'
                }
            );

        }
    );

// =========================================================
// VENCEDOR FREESTYLE
// =========================================================

btnVenceuRobo1
    .addEventListener(
        'click',
        () =>
            registrarVitoriaFreestyle(
                freeRobo1
            )
    );


btnVenceuRobo2
    .addEventListener(
        'click',
        () =>
            registrarVitoriaFreestyle(
                freeRobo2
            )
    );


function registrarVitoriaFreestyle(
    nomeVencedor
) {

    if (
        !estadoCompeticao ||
        estadoCompeticao.status !==
        'em_andamento'
    ) {

        return;

    }

    if (navigator.vibrate) navigator.vibrate(40);
    socket.emit(
        'comando_controle',
        {
            tipo:
                'REGISTRAR_FREESTYLE',

            vencedor:
                nomeVencedor
        }
    );

}


// =========================================================
// CANCELAR FREESTYLE
// =========================================================

// =========================================================
// CANCELAR FREESTYLE
// =========================================================

btnCancelarFree
    .addEventListener(
        'click',
        () => {

            socket.emit(
                'comando_controle',
                {
                    tipo:
                        'CANCELAR_FREESTYLE'
                }
            );


            inputFreeRobo1.disabled =
                false;

            inputFreeRobo2.disabled =
                false;


            inputFreeRobo1.value = '';
            inputFreeRobo2.value = '';


            acoesJogoFree
                .classList
                .add('oculto');


            acoesPreparoFree
                .classList
                .remove('oculto');


            btnIniciarFree
                .classList
                .remove('oculto');


            acoesVencedorFree
                .classList
                .add('oculto');

        }
    );

// =========================================================
// RESET FREESTYLE
// =========================================================

// TORNEIO — cancelar
document.getElementById('btn-cancelar-torneio').addEventListener('click', () => {

    if (!confirm('Tem certeza que deseja cancelar esta partida?')) return;

    socket.emit('comando_controle', { tipo: 'CANCELAR_TORNEIO' });
    // A UI é atualizada via sincronizarControle() quando o servidor responder
});

// FREESTYLE — cancelar antes de iniciar
document.getElementById('btn-cancelar-preparo-freestyle').addEventListener('click', () => {
    socket.emit('comando_controle', { tipo: 'CANCELAR_FREESTYLE' });
});

// FREESTYLE — cancelar durante a partida
btnCancelarFree.addEventListener('click', () => {

    if (!confirm('Tem certeza que deseja cancelar esta partida?')) return;

    socket.emit('comando_controle', { tipo: 'CANCELAR_FREESTYLE' });
});

// FREESTYLE — sem vencedor (empate)
document.getElementById('btn-empate-freestyle').addEventListener('click', () => {

    if (!estadoCompeticao || estadoCompeticao.status !== 'em_andamento') return;

    socket.emit('comando_controle', {
        tipo: 'REGISTRAR_FREESTYLE',
        vencedor: 'Empate'
    });
});