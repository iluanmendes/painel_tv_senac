const socket = io();


// =========================================================
// DADOS LOCAIS
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


    /*
     * Não gera warning no console.
     *
     * Alguns elementos pertencem somente
     * a determinados modos da aplicação.
     */

    if (!elemento) {
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

        if (!dados) {
            return;
        }


        rankingFreestyle =
            dados.rankingFreestyle || [];


        if (dados.configuracoes) {

            configuracoesApp =
                dados.configuracoes;

        }


        atualizarListaFreestyle();

    }
);


// =========================================================
// RANKING FREESTYLE
// =========================================================

function atualizarListaFreestyle() {

    const lista = document.getElementById('lista-freestyle');
    if (!lista) return;

    lista.innerHTML = '';

    if (rankingFreestyle.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'historico-vazio';
        vazio.innerText = 'Nenhum registro ainda';
        lista.appendChild(vazio);
        return;
    }

    rankingFreestyle.forEach((item, index) => {

        const li = document.createElement('li');

        const spanNome = document.createElement('span');
        const b = document.createElement('b');
        b.innerText = `${index + 1}º`;
        spanNome.appendChild(b);
        spanNome.appendChild(
            document.createTextNode(' ' + (item.nome || 'Participante'))
        );

        const spanTempo = document.createElement('span');
        let textoTempo = `⏱ ${formatarTempo(item.tempoSegundos)}`;
        if (item.horario) textoTempo += ` • ${item.horario}`;
        spanTempo.innerText = textoTempo;

        li.appendChild(spanNome);
        li.appendChild(spanTempo);
        lista.appendChild(li);
    });
}


// =========================================================
// ESTADO OFICIAL
// =========================================================

socket.on(
    'estado_competicao',
    (estado) => {

        if (!estado) {
            return;
        }


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

    const torneio = document.getElementById('modo-torneio');
    const freestyle = document.getElementById('modo-freestyle');

    /*
     * Nenhum modo selecionado: a animação de espera
     * assume o #titulo-modo.
     */

    if (!estado.modo) {

        if (torneio) torneio.classList.add('oculto');
        if (freestyle) freestyle.classList.add('oculto');

        if (!pararAnimacaoEspera && typeof iniciarAnimacaoEspera === 'function') {
            pararAnimacaoEspera = iniciarAnimacaoEspera();
        }

        return;
    }

    /*
     * Um modo foi selecionado: para a animação e libera
     * o #titulo-modo para o texto estático do modo.
     */

    if (pararAnimacaoEspera) {
        pararAnimacaoEspera();
        pararAnimacaoEspera = null;
    }

    if (estado.modo === 'torneio') {

        if (torneio) torneio.classList.remove('oculto');
        if (freestyle) freestyle.classList.add('oculto');

        setTexto(
            'titulo-modo',
            'MODO <span class="cor-destaque cor-vermelho">TORNEIO</span>',
            true
        );
    }

    if (estado.modo === 'freestyle') {

        if (torneio) torneio.classList.add('oculto');
        if (freestyle) freestyle.classList.remove('oculto');

        setTexto(
            'titulo-modo',
            'MODO <span class="cor-destaque cor-azul">FREESTYLE</span>',
            true
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


    if (!dados) {
        return;
    }


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


    /*
     * Partida cancelada
     */

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


    /*
     * Vitória por pontuação
     */

    if (dados.vencedor) {

        setTexto(
            'vencedor-torneio',
            `Vitória de ${dados.vencedor}!`
        );

        return;

    }


    /*
     * Tempo esgotado
     */

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


    if (!dados) {
        return;
    }



    const nomeRobo1 =
        document.getElementById(
            'nome-free-robo1'
        );


    const nomeRobo2 =
        document.getElementById(
            'nome-free-robo2'
        );


    /*
 * Selo de status (equilibra visualmente
 * com o número grande do modo Torneio)
 */

    const seloRobo1 =
        document.getElementById(
            'selo-free-robo1'
        );


    const seloRobo2 =
        document.getElementById(
            'selo-free-robo2'
        );


    if (seloRobo1 && seloRobo2) {

        const venceuRobo1 =
            dados.vencedor &&
            dados.vencedor === dados.robo1;


        const venceuRobo2 =
            dados.vencedor &&
            dados.vencedor === dados.robo2;


        seloRobo1.innerText =
            venceuRobo1
                ? '🏆 Campeão'
                : '';

        seloRobo1.classList.toggle(
            'vencedor',
            venceuRobo1
        );


        seloRobo2.innerText =
            venceuRobo2
                ? '🏆 Campeão'
                : '';

        seloRobo2.classList.toggle(
            'vencedor',
            venceuRobo2
        );

    }

    if (nomeRobo1) {

        nomeRobo1.innerText =
            dados.robo1 || 'Robô 1';

    }


    if (nomeRobo2) {

        nomeRobo2.innerText =
            dados.robo2 || 'Robô 2';

    }


    /*
     * Cronômetro
     */

    const cronometro =
        document.getElementById(
            'cronometro-freestyle'
        );


    if (cronometro) {

        cronometro.innerText =
            formatarTempo(
                dados.tempoDecorrido
            );

    }


    /*
     * Resultado
     */

    const vencedor =
        document.getElementById(
            'vencedor-freestyle'
        );


    if (!vencedor) {
        return;
    }


    if (
        estado.status ===
        'cancelado'
    ) {

        vencedor.innerText =
            'Partida Cancelada';

        return;

    }


    if (dados.vencedor) {

        vencedor.innerText =
            `Vitória de ${dados.vencedor}!`;

        return;

    }


    vencedor.innerText = '';

}