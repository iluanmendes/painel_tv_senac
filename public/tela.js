const socket = io();


// =========================================================
// DADOS LOCAIS SOMENTE PARA EXIBIÇÃO
// =========================================================

let rankingFreestyle = [];

let configuracoesApp = {
    tempoTorneio: 180
};


// =========================================================
// UTILIDADES
// =========================================================

function formatarTempo(segundos) {

    segundos =
        Number(segundos) || 0;

    const min =
        String(
            Math.floor(
                segundos / 60
            )
        ).padStart(2, '0');


    const seg =
        String(
            segundos % 60
        ).padStart(2, '0');


    return `${min}:${seg}`;
}


function setTexto(
    id,
    texto,
    isHTML = false
) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {

        console.warn(
            `Elemento '${id}' não encontrado.`
        );

        return;

    }


    if (isHTML) {

        elemento.innerHTML =
            texto;

    } else {

        elemento.innerText =
            texto;

    }

}


// =========================================================
// DADOS PERSISTENTES
// =========================================================

socket.on(
    'carregar_dados',
    (dados) => {

        if (!dados) return;


        rankingFreestyle =
            dados.rankingFreestyle ||
            [];


        if (dados.configuracoes) {

            configuracoesApp =
                dados.configuracoes;

        }


        atualizarListaFreestyle();

    }
);


// =========================================================
// RANKING
// =========================================================

function atualizarListaFreestyle() {

    const lista =
        document.getElementById(
            'lista-freestyle'
        );


    if (!lista) return;


    lista.innerHTML = '';


    rankingFreestyle.forEach(
        (item, index) => {

            const li =
                document.createElement(
                    'li'
                );


            const nome =
                item.nome ||
                'Participante';


            const tempo =
                formatarTempo(
                    item.tempoSegundos
                );


            li.innerHTML = `
                <span>
                    <b>${index + 1}º</b>
                    ${nome}
                </span>

                <span>
                    ⏱ ${tempo}
                    ${item.horario
                        ? ` • ${item.horario}`
                        : ''}
                </span>
            `;


            lista.appendChild(li);

        }
    );

}


// =========================================================
// ESTADO OFICIAL RECEBIDO DO SERVIDOR
// =========================================================

socket.on(
    'estado_competicao',
    (estado) => {

        if (!estado) return;


        atualizarModo(estado);


        if (
            estado.modo ===
            'torneio'
        ) {

            renderizarTorneio(
                estado
            );

        }


        if (
            estado.modo ===
            'freestyle'
        ) {

            renderizarFreestyle(
                estado
            );

        }

    }
);


// =========================================================
// MODO
// =========================================================

function atualizarModo(estado) {

    const torneio =
        document.getElementById(
            'modo-torneio'
        );


    const freestyle =
        document.getElementById(
            'modo-freestyle'
        );


    if (!estado.modo) {

        if (torneio) {
            torneio.classList.add(
                'oculto'
            );
        }

        if (freestyle) {
            freestyle.classList.add(
                'oculto'
            );
        }


        setTexto(
            'titulo-modo',
            'Aguardando Início...'
        );


        return;

    }


    if (
        estado.modo ===
        'torneio'
    ) {

        if (torneio) {
            torneio.classList.remove(
                'oculto'
            );
        }

        if (freestyle) {
            freestyle.classList.add(
                'oculto'
            );
        }


        setTexto(
            'titulo-modo',
            'Modo Torneio'
        );

    }


    if (
        estado.modo ===
        'freestyle'
    ) {

        if (torneio) {
            torneio.classList.add(
                'oculto'
            );
        }

        if (freestyle) {
            freestyle.classList.remove(
                'oculto'
            );
        }


        setTexto(
            'titulo-modo',
            'Modo Freestyle'
        );

    }

}


// =========================================================
// TORNEIO
// =========================================================

function renderizarTorneio(
    estado
) {

    const dados =
        estado.torneio;


    if (!dados) return;


    setTexto(
        'nome-robo1',
        dados.robo1
    );


    setTexto(
        'nome-robo2',
        dados.robo2
    );


    setTexto(
        'bexigas-robo1',
        dados.pontos1
    );


    setTexto(
        'bexigas-robo2',
        dados.pontos2
    );


    setTexto(
        'cronometro-torneio',
        formatarTempo(
            dados.tempoRestante
        )
    );


    if (
        estado.status ===
        'cancelado'
    ) {

        setTexto(
            'vencedor-torneio',
            'Partida Cancelada'
        );

        return;

    }


    if (dados.vencedor) {

        setTexto(
            'vencedor-torneio',
            `Vitória de ${dados.vencedor}!`
        );

        return;

    }


    if (
        estado.status ===
        'finalizado' &&
        dados.tempoRestante === 0
    ) {

        setTexto(
            'vencedor-torneio',
            'Tempo Esgotado!'
        );

        return;

    }


    setTexto(
        'vencedor-torneio',
        ''
    );

}


// =========================================================
// FREESTYLE
// =========================================================

function renderizarFreestyle(
    estado
) {

    const dados =
        estado.freestyle;


    if (!dados) return;


    /*
     * Compatibilidade com os IDs
     * utilizados no HTML atual.
     */

    setTexto(
        'nome-free-robo1',
        dados.robo1
    );


    setTexto(
        'nome-free-robo2',
        dados.robo2
    );


    /*
     * Compatibilidade com o HTML
     * que utilizava os IDs da versão
     * anterior do layout.
     */

    setTexto(
        'nome-freestyle1',
        dados.robo1
    );


    setTexto(
        'nome-freestyle2',
        dados.robo2
    );


    setTexto(
        'cronometro-freestyle',
        formatarTempo(
            dados.tempoDecorrido
        )
    );


    if (
        estado.status ===
        'cancelado'
    ) {

        setTexto(
            'vencedor-freestyle',
            'Partida Cancelada'
        );

        return;

    }


    if (dados.vencedor) {

        setTexto(
            'vencedor-freestyle',
            `Vitória de ${dados.vencedor}!`
        );

        return;

    }


    setTexto(
        'vencedor-freestyle',
        ''
    );

}