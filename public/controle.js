const socket = io();

let estadoCompeticao = null;
let filaEspera = [];


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

socket.on('carregar_dados', (dados) => {

    if (dados && dados.configuracoes) {
        document.getElementById('input-tempo-torneio').value = dados.configuracoes.tempoTorneio;
        document.getElementById('input-tempo-freestyle').value = dados.configuracoes.tempoFreestyle;
    }

    if (dados && Array.isArray(dados.filaEspera)) {
        filaEspera = dados.filaEspera;
        renderizarFila();
    }
});


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

    atualizarAbaAtiva();

    const focoTorneio = estadoCompeticao.modo === 'torneio' &&
        ['preparado', 'em_andamento', 'pausado', 'finalizado'].includes(estadoCompeticao.status);

    const focoFreestyle = estadoCompeticao.modo === 'freestyle' &&
        ['preparado', 'em_andamento', 'finalizado'].includes(estadoCompeticao.status);

    const emFoco = focoTorneio || focoFreestyle;

    document.getElementById('card-menu').classList.toggle('oculto', emFoco);
    document.getElementById('acoes-cabecalho').classList.toggle('oculto', emFoco);
    document.body.classList.toggle('modo-concentracao', emFoco);

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

    if (estadoCompeticao.modo !== 'torneio') return;

    const dados = estadoCompeticao.torneio;
    if (!dados) return;

    pontosR1 = Number(dados.pontos1) || 0;
    pontosR2 = Number(dados.pontos2) || 0;

    const partidaRodando = estadoCompeticao.status === 'em_andamento';
    const emJogo = ['preparado', 'em_andamento', 'pausado', 'finalizado'].includes(estadoCompeticao.status);

    if (emJogo) {
        acoesPreparo.classList.add('oculto');
        acoesJogo.classList.remove('oculto');

        inputR1.disabled = true;
        inputR2.disabled = true;
        if (dados.robo1) inputR1.value = dados.robo1;
        if (dados.robo2) inputR2.value = dados.robo2;

        document.getElementById('nome-resumo-azul').innerText = dados.robo1 || 'Robô 1';
        document.getElementById('nome-resumo-vermelho').innerText = dados.robo2 || 'Robô 2';
    } else {
        acoesJogo.classList.add('oculto');
        acoesPreparo.classList.remove('oculto');

        inputR1.disabled = false;
        inputR2.disabled = false;
    }

    document.getElementById('placar-controle-r1').innerText = pontosR1;
    document.getElementById('placar-controle-r2').innerText = pontosR2;
    document.getElementById('cronometro-controle-torneio').innerText = formatarTempo(dados.tempoRestante);

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

function formatarTempo(segundos) {
    segundos = Number(segundos) || 0;
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
}

// =========================================================
// FREESTYLE
// =========================================================

function sincronizarFreestyle() {

    if (estadoCompeticao.modo !== 'freestyle') return;

    const dados = estadoCompeticao.freestyle;
    if (!dados) return;

    const preparadoOuAndamento = ['preparado', 'em_andamento', 'finalizado'].includes(estadoCompeticao.status);

    if (preparadoOuAndamento) {
        acoesPreparoFree.classList.add('oculto');
        acoesJogoFree.classList.remove('oculto');

        inputFreeRobo1.disabled = true;
        inputFreeRobo2.disabled = true;
        if (dados.robo1) { freeRobo1 = dados.robo1; inputFreeRobo1.value = dados.robo1; }
        if (dados.robo2) { freeRobo2 = dados.robo2; inputFreeRobo2.value = dados.robo2; }

        document.getElementById('nome-resumo-free-azul').innerText = dados.robo1 || 'Robô 1';
        document.getElementById('nome-resumo-free-vermelho').innerText = dados.robo2 || 'Robô 2';
    } else {
        acoesJogoFree.classList.add('oculto');
        acoesPreparoFree.classList.remove('oculto');

        inputFreeRobo1.disabled = false;
        inputFreeRobo2.disabled = false;
    }

    document.getElementById('cronometro-controle-freestyle').innerText = formatarTempo(dados.tempoDecorrido);

    const emAndamento = estadoCompeticao.status === 'em_andamento';
    const aguardandoDecisao = estadoCompeticao.status === 'finalizado' && !dados.vencedor;

    if (emAndamento || aguardandoDecisao) {
        btnIniciarFree.classList.add('oculto');
        acoesVencedorFree.classList.remove('oculto');
    } else if (estadoCompeticao.status === 'preparado') {
        btnIniciarFree.classList.remove('oculto');
        acoesVencedorFree.classList.add('oculto');
    } else {
        btnIniciarFree.classList.add('oculto');
        acoesVencedorFree.classList.add('oculto');
    }

    document.querySelectorAll('.btn-exibicao').forEach(botao => {
        botao.classList.toggle(
            'ativo',
            botao.dataset.exibicao === (estadoCompeticao.exibicaoFreestyle || 'ambos')
        );
    });
}

// =========================================================
// NAVEGAÇÃO
// =========================================================

function alternarModo(idModo, comandoSocket) {

    document.getElementById('controles-torneio').classList.add('oculto');
    document.getElementById('controles-freestyle').classList.add('oculto');

    document.getElementById(idModo).classList.remove('oculto');

    if (comandoSocket) {
        socket.emit('comando_controle', {
            tipo: 'MUDAR_MODO',
            modo: comandoSocket
        });
    }
}


function renderizarFila() {

    const lista = document.getElementById('lista-fila');
    if (!lista) return;

    lista.innerHTML = '';

    if (filaEspera.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'fila-vazia';
        vazio.innerText = 'Fila vazia — adicione os próximos participantes acima';
        lista.appendChild(vazio);
        return;
    }

    filaEspera.forEach((nome, indice) => {

        const li = document.createElement('li');
        li.className = 'item-fila';

        const spanNome = document.createElement('span');
        spanNome.className = 'nome-fila';
        spanNome.innerText = `${indice + 1}. ${nome}`;
        li.appendChild(spanNome);

        const acoes = document.createElement('div');
        acoes.className = 'acoes-fila';

        if (indice > 0) {
            acoes.appendChild(criarBotaoFila('⤒', 'Mover para o topo', () => {
                socket.emit('comando_controle', { tipo: 'FILA_MOVER_TOPO', indice });
            }));
        }

        acoes.appendChild(criarBotaoFila('🔵', 'Usar como Robô Azul', () => usarNomeFila(nome, 'azul', indice), 'btn-fila-azul'));
        acoes.appendChild(criarBotaoFila('🔴', 'Usar como Robô Vermelho', () => usarNomeFila(nome, 'vermelho', indice), 'btn-fila-vermelho'));
        acoes.appendChild(criarBotaoFila('✕', 'Remover da fila', () => {
            if (!confirm(`Remover "${nome}" da fila?`)) return;
            socket.emit('comando_controle', { tipo: 'FILA_REMOVER', indice });
        }, 'btn-fila-remover'));

        li.appendChild(acoes);
        lista.appendChild(li);
    });
}


function criarBotaoFila(icone, titulo, aoClicar, classeExtra) {
    const btn = document.createElement('button');
    btn.className = 'btn-fila-icone' + (classeExtra ? ' ' + classeExtra : '');
    btn.title = titulo;
    btn.setAttribute('aria-label', titulo);
    btn.innerText = icone;
    btn.addEventListener('click', aoClicar);
    return btn;
}


function usarNomeFila(nome, cor, indice) {

    const modo = estadoCompeticao?.modo;
    let input = null;

    if (modo === 'torneio') input = cor === 'azul' ? inputR1 : inputR2;
    else if (modo === 'freestyle') input = cor === 'azul' ? inputFreeRobo1 : inputFreeRobo2;

    if (!input || input.disabled) {
        alert('Vá para a tela de preparação (Torneio ou Freestyle) antes de usar um nome da fila.');
        return;
    }

    input.value = nome;

    socket.emit('comando_controle', { tipo: 'FILA_REMOVER', indice });

    document.getElementById('modal-fila').classList.add('oculto');
}


function reabrirPainelDoModo() {
    if (estadoCompeticao?.modo === 'torneio') {
        document.getElementById('controles-torneio').classList.remove('oculto');
    } else if (estadoCompeticao?.modo === 'freestyle') {
        document.getElementById('controles-freestyle').classList.remove('oculto');
    }
}


document.getElementById('btn-adicionar-fila').addEventListener('click', () => {
    const input = document.getElementById('input-novo-nome-fila');
    const nome = input.value.trim();
    if (!nome) return;

    socket.emit('comando_controle', { tipo: 'FILA_ADICIONAR', nome });
    input.value = '';
    input.focus();
});


document.getElementById('input-novo-nome-fila').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-adicionar-fila').click();
});

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
    document.getElementById('modal-config').classList.remove('oculto');
});


document.getElementById('btn-fechar-config').addEventListener('click', () => {
    document.getElementById('modal-config').classList.add('oculto');
});


document.getElementById('btn-abrir-fila').addEventListener('click', () => {
    document.getElementById('modal-fila').classList.remove('oculto');
    document.getElementById('input-novo-nome-fila').focus();
});


document.getElementById('btn-fechar-fila').addEventListener('click', () => {
    document.getElementById('modal-fila').classList.add('oculto');
});


// Fecha ao tocar fora do conteúdo (no fundo escurecido)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('oculto');
    });
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
    .getElementById('btn-salvar-config')
    .addEventListener('click', () => {

        const tempoTorneio = parseInt(
            document.getElementById('input-tempo-torneio').value
        );

        const tempoFreestyle = parseInt(
            document.getElementById('input-tempo-freestyle').value
        );

        if (tempoTorneio > 0 && tempoFreestyle > 0) {

            socket.emit('salvar_configuracoes', {
                tempoTorneio,
                tempoFreestyle
            });

            alert('Configuração salva com sucesso!');

        } else {

            alert('Preencha os dois tempos com valores válidos.');
        }
    });
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
// RESET FREESTYLE
// =========================================================

// TORNEIO — reiniciar
document.getElementById('btn-reiniciar-torneio').addEventListener('click', () => {

    if (!confirm('Isso vai reiniciar o ciclo da partida (Nome → Preparar → Iniciar), apagando a pontuação e o tempo atuais. Confirma?')) return;

    socket.emit('comando_controle', { tipo: 'CANCELAR_TORNEIO' });
});


// FREESTYLE — reiniciar antes de iniciar
document.getElementById('btn-reiniciar-preparo-freestyle').addEventListener('click', () => {
    socket.emit('comando_controle', { tipo: 'CANCELAR_FREESTYLE' });
});


// FREESTYLE — reiniciar durante a partida
document.getElementById('btn-reiniciar-freestyle').addEventListener('click', () => {

    if (!confirm('Isso vai reiniciar o ciclo da partida (Nome → Preparar → Iniciar), apagando o tempo atual. Confirma?')) return;

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

document.querySelectorAll('.btn-exibicao').forEach(botao => {
    botao.addEventListener('click', () => {
        socket.emit('comando_controle', {
            tipo: 'DEFINIR_EXIBICAO_FREESTYLE',
            exibicao: botao.dataset.exibicao
        });
    });
});