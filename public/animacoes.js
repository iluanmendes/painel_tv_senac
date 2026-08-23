/*
 * animacoes.js
 * -------------------------------------------------------
 * Camada de animação 100% independente do painel da TV.
 * Não importa nem depende de tela.js/server.js — apenas
 * observa mudanças no DOM (via MutationObserver) e aplica
 * classes CSS temporárias definidas em animacoes.css.
 *
 * Pode ser removido (junto com animacoes.css e as duas
 * linhas no index.html) sem afetar o funcionamento do placar.
 * -------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', () => {

    observarPontuacao('bexigas-robo1');
    observarPontuacao('bexigas-robo2');

    observarCronometro('cronometro-torneio', 10);

    observarVencedor('vencedor-torneio');
    observarVencedor('vencedor-freestyle');
});


// =========================================================
// PONTUAÇÃO — efeito "pop" a cada ponto marcado
// =========================================================

function observarPontuacao(id) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    let valorAnterior = elemento.innerText;

    const observer = new MutationObserver(() => {

        if (elemento.innerText === valorAnterior) return;

        valorAnterior = elemento.innerText;

        elemento.classList.remove('anim-pop');
        void elemento.offsetWidth; // força reflow para reiniciar a animação
        elemento.classList.add('anim-pop');
    });

    observer.observe(elemento, {
        childList: true,
        characterData: true,
        subtree: true
    });
}


// =========================================================
// CRONÔMETRO — pulso vermelho nos últimos segundos
// =========================================================

function observarCronometro(id, segundosCriticos) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    const observer = new MutationObserver(() => {

        const partes = elemento.innerText.split(':');
        const totalSegundos =
            (Number(partes[0]) || 0) * 60 + (Number(partes[1]) || 0);

        elemento.classList.toggle(
            'tempo-critico',
            totalSegundos > 0 && totalSegundos <= segundosCriticos
        );
    });

    observer.observe(elemento, {
        childList: true,
        characterData: true,
        subtree: true
    });
}


// =========================================================
// VENCEDOR — comemoração ao anunciar o resultado
// =========================================================

function observarVencedor(id) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    let tinhaTexto = false;

    const observer = new MutationObserver(() => {

        const temTextoAgora = elemento.innerText.trim().length > 0;

        if (temTextoAgora && !tinhaTexto) {
            elemento.classList.remove('comemorar');
            void elemento.offsetWidth;
            elemento.classList.add('comemorar');
        }

        tinhaTexto = temTextoAgora;
    });

    observer.observe(elemento, {
        childList: true,
        characterData: true,
        subtree: true
    });
}