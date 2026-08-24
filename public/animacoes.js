let pararAnimacaoEspera = null;


document.addEventListener('DOMContentLoaded', () => {



    // =====================================================
    // TORNEIO
    // =====================================================

    observarPontuacao(
        'bexigas-robo1',
        'card-azul'
    );

    observarPontuacao(
        'bexigas-robo2',
        'card-vermelho'
    );


    observarCronometro(
        'cronometro-torneio',
        10
    );


    observarVencedor(
        'vencedor-torneio'
    );


    observarVencedor(
        'vencedor-freestyle'
    );


    observarVencedorCards();


    // =====================================================
    // FREESTYLE
    // =====================================================

    observarRankingFreestyle();


    // =====================================================
    // TRANSIÇÃO DE PARTIDA
    // =====================================================

    observarMudancaDePartida();

});


// =========================================================
// PONTUAÇÃO
// =========================================================

function observarPontuacao(
    id,
    classeCard
) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }


    let valorAnterior =
        elemento.innerText;


    const observer =
        new MutationObserver(() => {

            const valorAtual =
                elemento.innerText;


            if (
                valorAtual ===
                valorAnterior
            ) {
                return;
            }


            const numeroAnterior =
                Number(valorAnterior);


            const numeroAtual =
                Number(valorAtual);


            valorAnterior =
                valorAtual;


            // Só anima quando a pontuação aumenta

            if (
                !Number.isNaN(numeroAnterior) &&
                !Number.isNaN(numeroAtual) &&
                numeroAtual <= numeroAnterior
            ) {
                return;
            }


            // Anima o número

            elemento.classList.remove(
                'anim-pop'
            );

            void elemento.offsetWidth;

            elemento.classList.add(
                'anim-pop'
            );


            // Anima o card correspondente

            if (classeCard) {

                const card =
                    elemento.closest(
                        '.competidor'
                    );

                if (card) {

                    card.classList.remove(
                        'ponto-marcado'
                    );

                    void card.offsetWidth;

                    card.classList.add(
                        'ponto-marcado'
                    );

                }

            }

        });


    observer.observe(
        elemento,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


// =========================================================
// CRONÔMETRO
// =========================================================

function observarCronometro(
    id,
    segundosCriticos
) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }


    const observer =
        new MutationObserver(() => {

            const partes =
                elemento.innerText.split(':');


            const totalSegundos =
                (Number(partes[0]) || 0) * 60 +
                (Number(partes[1]) || 0);


            elemento.classList.toggle(
                'tempo-critico',
                totalSegundos > 0 &&
                totalSegundos <= segundosCriticos
            );

        });


    observer.observe(
        elemento,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


// =========================================================
// VENCEDOR
// =========================================================

function observarVencedor(id) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }


    let tinhaTexto = false;


    const observer =
        new MutationObserver(() => {

            const temTextoAgora =
                elemento.innerText
                    .trim()
                    .length > 0;


            if (
                temTextoAgora &&
                !tinhaTexto
            ) {

                elemento.classList.remove(
                    'comemorar'
                );

                void elemento.offsetWidth;

                elemento.classList.add(
                    'comemorar'
                );

            }


            tinhaTexto =
                temTextoAgora;

        });


    observer.observe(
        elemento,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


// =========================================================
// DESTAQUE DOS CARDS VENCEDORES
// =========================================================

function observarVencedorCards() {

    const vencedor =
        document.getElementById(
            'vencedor-torneio'
        );

    if (!vencedor) {
        return;
    }


    const observer =
        new MutationObserver(() => {

            const texto =
                vencedor.innerText
                    .trim();


            const cardAzul =
                document.querySelector(
                    '#modo-torneio .card-azul'
                );


            const cardVermelho =
                document.querySelector(
                    '#modo-torneio .card-vermelho'
                );


            if (
                !cardAzul ||
                !cardVermelho
            ) {
                return;
            }


            cardAzul.classList.remove(
                'card-vencedor',
                'card-derrotado'
            );

            cardVermelho.classList.remove(
                'card-vencedor',
                'card-derrotado'
            );


            if (!texto) {
                return;
            }


            if (
                texto.includes(
                    'Vitória'
                )
            ) {

                const nomeAzul =
                    document.getElementById(
                        'nome-robo1'
                    )?.innerText || '';


                const nomeVermelho =
                    document.getElementById(
                        'nome-robo2'
                    )?.innerText || '';


                if (
                    nomeAzul &&
                    texto.includes(nomeAzul)
                ) {

                    cardAzul.classList.add(
                        'card-vencedor'
                    );

                    cardVermelho.classList.add(
                        'card-derrotado'
                    );

                }


                if (
                    nomeVermelho &&
                    texto.includes(nomeVermelho)
                ) {

                    cardVermelho.classList.add(
                        'card-vencedor'
                    );

                    cardAzul.classList.add(
                        'card-derrotado'
                    );

                }

            }

        });


    observer.observe(
        vencedor,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


// =========================================================
// TRANSIÇÃO ENTRE PARTIDAS
// =========================================================

function observarMudancaDePartida() {

    const torneio =
        document.getElementById(
            'modo-torneio'
        );

    if (!torneio) {
        return;
    }


    const nomes = [
        document.getElementById(
            'nome-robo1'
        ),
        document.getElementById(
            'nome-robo2'
        )
    ];


    let nomesAnteriores =
        nomes.map(
            elemento =>
                elemento?.innerText || ''
        );


    const observer =
        new MutationObserver(() => {

            const nomesAtuais =
                nomes.map(
                    elemento =>
                        elemento?.innerText || ''
                );


            const mudou =
                nomesAtuais.some(
                    (nome, index) =>
                        nome !==
                        nomesAnteriores[index]
                );


            if (!mudou) {
                return;
            }


            nomesAnteriores =
                nomesAtuais;


            torneio.classList.remove(
                'nova-partida'
            );

            void torneio.offsetWidth;

            torneio.classList.add(
                'nova-partida'
            );

        });


    nomes.forEach(elemento => {

        if (!elemento) {
            return;
        }


        observer.observe(
            elemento,
            {
                childList: true,
                characterData: true,
                subtree: true
            }
        );

    });

}


// =========================================================
// RANKING FREESTYLE
// =========================================================

function observarRankingFreestyle() {

    const lista =
        document.getElementById(
            'lista-freestyle'
        );

    if (!lista) {
        return;
    }


    const observer =
        new MutationObserver(() => {

            const itens =
                lista.querySelectorAll(
                    'li'
                );


            itens.forEach(
                (item, index) => {

                    item.style.setProperty(
                        '--ordem-ranking',
                        index
                    );

                }
            );


            lista.classList.remove(
                'ranking-atualizado'
            );

            void lista.offsetWidth;

            lista.classList.add(
                'ranking-atualizado'
            );

        });


    observer.observe(
        lista,
        {
            childList: true,
            subtree: true
        }
    );

}


// =========================================================
// ANIMAÇÃO DE ESPERA — DIGITAÇÃO
// =========================================================

function iniciarAnimacaoEspera() {

    const container = document.getElementById('titulo-modo');
    if (!container) return null;

    let span = container.querySelector('.texto-espera-interno');
    if (!span) {
        container.textContent = '';
        span = document.createElement('span');
        span.className = 'texto-espera-interno';
        container.appendChild(span);
    }

    /*
     * Mensagens simples: string, sem cor nenhuma.
     * Mensagem em partes: só a parte com "cor" definida
     * ganha cor (usado só para destacar "SENAC!").
     */
    const mensagens = [
        'AGUARDANDO INÍCIO...',
        {
            partes: [
                { texto: 'QUER FAZER? ', pausaDepois: 700 },
                { texto: 'SENAC!', cor: 'cor-laranja' }
            ],
            pausaExtra: 1400
        },        
        
    ];

    let cancelada = false;

    container.classList.add('titulo-espera');

    function esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ---- Mensagem simples: digita/apaga direto no span, sem cor ----

    async function escreverSimples(texto) {
        for (let i = 0; i <= texto.length; i++) {
            if (cancelada) return;
            span.textContent = texto.substring(0, i);
            await esperar(80);
        }
    }

    async function apagarSimples(texto) {
        for (let i = texto.length; i >= 0; i--) {
            if (cancelada) return;
            span.textContent = texto.substring(0, i);
            await esperar(50);
        }
    }

    // ---- Mensagem em partes ----
    // Escrever: respeita a pausa entre partes (pausaDepois).
    // Apagar: corrido, sem pausa nenhuma entre as partes.

    async function escreverPartes(partes) {

        span.innerHTML = '';

        for (const parte of partes) {

            const spanParte = document.createElement('span');
            if (parte.cor) spanParte.className = parte.cor;
            span.appendChild(spanParte);

            for (let i = 0; i <= parte.texto.length; i++) {
                if (cancelada) return;
                spanParte.textContent = parte.texto.substring(0, i);
                await esperar(80);
            }

            if (parte.pausaDepois) {
                await esperar(parte.pausaDepois);
                if (cancelada) return;
            }
        }
    }

    async function apagarPartes(partes) {

        for (let p = partes.length - 1; p >= 0; p--) {

            const parte = partes[p];
            const spanParte = span.children[p];
            if (!spanParte) continue;

            for (let i = parte.texto.length; i >= 0; i--) {
                if (cancelada) return;
                spanParte.textContent = parte.texto.substring(0, i);
                await esperar(50);
            }
            // sem pausa aqui — segue direto pra próxima parte
        }
    }

    async function executar() {

        let indice = 0;

        while (!cancelada && mensagens.length > 0) {

            const item = mensagens[indice % mensagens.length];

            if (typeof item === 'string') {
                await escreverSimples(item);
            } else {
                await escreverPartes(item.partes);
            }

            if (cancelada) return;

            const pausa = 1600 + (typeof item === 'string' ? 0 : (item.pausaExtra || 0));
            await esperar(pausa);
            if (cancelada) return;

            if (typeof item === 'string') {
                await apagarSimples(item);
            } else {
                await apagarPartes(item.partes);
            }

            if (cancelada) return;

            indice++;
        }
    }

    executar();

    return () => {
        cancelada = true;
        container.classList.remove('titulo-espera');
    };
}