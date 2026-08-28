/*
 * sons.js
 * -------------------------------------------------------
 * Camada de áudio 100% independente do painel da TV.
 *
 * Pra cada evento, tenta tocar um arquivo externo (mp3/wav).
 * Se o arquivo não existir, não carregar, ou não tiver sido
 * configurado, usa automaticamente um som sintetizado como
 * substituto — sem precisar editar mais nada.
 * -------------------------------------------------------
 */


// =========================================================
// CONFIGURAÇÃO — edite os caminhos abaixo pra usar seus
// próprios áudios. Deixe '' (vazio) pra usar sempre o som
// sintetizado nesse evento.
// =========================================================

const CAMINHOS_SONS = {
    inicio: 'sons/inicio.mp3',
    tique: 'sons/tique.mp3',
    tiqueFinal: 'sons/tique-final.mp3',
    tempoEsgotado: 'sons/tempo-esgotado.mp3',
    vitoria: 'sons/vitoria.mp3',
    empate: 'sons/empate.mp3'
};

const VOLUME_ARQUIVOS = 0.7; // 0 a 1


// =========================================================
// PRÉ-CARREGAMENTO E DETECÇÃO DE DISPONIBILIDADE
// =========================================================

const audiosCarregados = {};   // nomeEvento -> HTMLAudioElement (pronto pra tocar)
const audiosIndisponiveis = new Set(); // nomeEvento -> não existe / deu erro

function prepararAudiosExternos() {

    Object.entries(CAMINHOS_SONS).forEach(([nomeEvento, caminho]) => {

        if (!caminho) {
            audiosIndisponiveis.add(nomeEvento);
            return;
        }

        const audio = new Audio(caminho);
        audio.preload = 'auto';
        audio.volume = VOLUME_ARQUIVOS;

        audio.addEventListener('canplaythrough', () => {
            audiosCarregados[nomeEvento] = audio;
        }, { once: true });

        audio.addEventListener('error', () => {
            audiosIndisponiveis.add(nomeEvento);
            console.warn(`[sons.js] Áudio não encontrado para "${nomeEvento}": ${caminho} — usando som sintetizado.`);
        }, { once: true });

        // Dispara o carregamento
        audio.load();
    });
}


// =========================================================
// REPRODUÇÃO — arquivo externo se disponível, senão sintetizado
// =========================================================

function tocarEvento(nomeEvento, funcaoSintetizada) {

    const audioPronto = audiosCarregados[nomeEvento];

    if (audioPronto) {

        // clona pra permitir sons sobrepostos (ex: tiques rápidos
        // um atrás do outro sem cortar o anterior)
        const instancia = audioPronto.cloneNode();
        instancia.volume = VOLUME_ARQUIVOS;

        instancia.play().catch(() => {
            // Autoplay bloqueado ou outro erro pontual — cai pro sintetizado
            funcaoSintetizada();
        });

        return;
    }

    if (audiosIndisponiveis.has(nomeEvento) || !audioPronto) {
        funcaoSintetizada();
    }
}


// =========================================================
// SINTETIZADOR (fallback — Web Audio API, sem arquivos)
// =========================================================

let audioCtx = null;

function obterAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function tocarNota(freq, duracaoMs, tipoOnda = 'sine', atrasoMs = 0, volume = 0.25) {

    const ctx = obterAudioCtx();

    const inicio = ctx.currentTime + (atrasoMs / 1000);
    const duracao = duracaoMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tipoOnda;
    osc.frequency.setValueAtTime(freq, inicio);

    gain.gain.setValueAtTime(0, inicio);
    gain.gain.linearRampToValueAtTime(volume, inicio + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(inicio);
    osc.stop(inicio + duracao + 0.05);
}

function sintetizarInicio() {
    tocarNota(392.00, 110, 'triangle', 0);
    tocarNota(587.33, 160, 'triangle', 110);
}

function sintetizarTique(grave = false) {
    tocarNota(grave ? 220 : 880, 90, 'square', 0, 0.18);
}

function sintetizarTempoEsgotado() {
    tocarNota(146.83, 550, 'sawtooth', 0, 0.22);
}

function sintetizarVitoria() {
    tocarNota(523.25, 120, 'triangle', 0);
    tocarNota(659.25, 120, 'triangle', 120);
    tocarNota(783.99, 120, 'triangle', 240);
    tocarNota(1046.50, 260, 'triangle', 360);
}

function sintetizarEmpate() {
    tocarNota(440, 90, 'sine', 0, 0.2);
    tocarNota(440, 90, 'sine', 130, 0.2);
}


// =========================================================
// FUNÇÕES PÚBLICAS — usadas pelos observers abaixo
// =========================================================

function tocarSomInicio() {
    tocarEvento('inicio', sintetizarInicio);
}

function tocarSomTique(grave = false) {
    tocarEvento(grave ? 'tiqueFinal' : 'tique', () => sintetizarTique(grave));
}

function tocarSomTempoEsgotado() {
    tocarEvento('tempoEsgotado', sintetizarTempoEsgotado);
}

function tocarSomVitoria() {
    tocarEvento('vitoria', sintetizarVitoria);
}

function tocarSomEmpate() {
    tocarEvento('empate', sintetizarEmpate);
}


// =========================================================
// DESBLOQUEIO DE ÁUDIO
// =========================================================

function criarAvisoDeSom() {

    const aviso = document.createElement('button');
    aviso.id = 'aviso-ativar-som';
    aviso.innerText = '🔊 Toque para ativar o som';

    Object.assign(aviso.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999',
        padding: '.8rem 1.2rem',
        background: '#111111',
        color: '#f2b900',
        border: 'none',
        borderRadius: '999px',
        fontFamily: 'sans-serif',
        fontWeight: '700',
        fontSize: '.9rem',
        boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        cursor: 'pointer'
    });

    aviso.addEventListener('click', () => {
        obterAudioCtx();
        aviso.remove();
    });

    document.body.appendChild(aviso);

    return aviso;
}

document.addEventListener('DOMContentLoaded', () => {

    prepararAudiosExternos();

    const aviso = criarAvisoDeSom();

    const desbloquear = () => {
        obterAudioCtx();
        aviso.remove();
        document.removeEventListener('click', desbloquear);
        document.removeEventListener('touchstart', desbloquear);
        document.removeEventListener('keydown', desbloquear);
    };

    document.addEventListener('click', desbloquear);
    document.addEventListener('touchstart', desbloquear);
    document.addEventListener('keydown', desbloquear);


    // =====================================================
    // INÍCIO DE PARTIDA
    // =====================================================

    let statusAtual = document.body.dataset.status || '';

    const observerStatus = new MutationObserver(() => {

        const novoStatus = document.body.dataset.status || '';
        const statusAnterior = statusAtual;
        statusAtual = novoStatus;

        if (novoStatus === 'em_andamento' && statusAnterior !== 'em_andamento') {
            tocarSomInicio();
        }
    });

    observerStatus.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-status']
    });


    // =====================================================
    // CONTAGENS REGRESSIVAS
    // =====================================================

    observarContagemTorneio('cronometro-torneio', 10);
    observarContagemFreestyle('cronometro-freestyle', 10);


    // =====================================================
    // RESULTADO
    // =====================================================

    observarResultado('vencedor-torneio');
    observarResultado('vencedor-freestyle');
});


// =========================================================
// CONTAGEM REGRESSIVA — TORNEIO
// =========================================================

function observarContagemTorneio(id, segundosCriticos) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    let ultimoValor = null;

    const observer = new MutationObserver(() => {

        const texto = elemento.innerText;
        if (texto === ultimoValor) return;
        ultimoValor = texto;

        if (document.body.dataset.status !== 'em_andamento') return;

        const partes = texto.split(':');
        const totalSegundos = (Number(partes[0]) || 0) * 60 + (Number(partes[1]) || 0);

        if (totalSegundos === 0) {
            tocarSomTempoEsgotado();
        } else if (totalSegundos > 0 && totalSegundos <= segundosCriticos) {
            tocarSomTique(totalSegundos <= 3);
        }
    });

    observer.observe(elemento, { childList: true, characterData: true, subtree: true });
}


// =========================================================
// CONTAGEM REGRESSIVA — FREESTYLE
// =========================================================

function observarContagemFreestyle(id, segundosCriticos) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    let ultimoValor = null;

    const observer = new MutationObserver(() => {

        const texto = elemento.innerText;
        if (texto === ultimoValor) return;
        ultimoValor = texto;

        if (document.body.dataset.status !== 'em_andamento') return;

        const partes = texto.split(':');
        const decorridos = (Number(partes[0]) || 0) * 60 + (Number(partes[1]) || 0);

        const limite = (typeof configuracoesApp !== 'undefined' && configuracoesApp.tempoFreestyle)
            ? configuracoesApp.tempoFreestyle
            : null;

        if (!limite) return;

        const restante = limite - decorridos;

        if (restante === 0) {
            tocarSomTempoEsgotado();
        } else if (restante > 0 && restante <= segundosCriticos) {
            tocarSomTique(restante <= 3);
        }
    });

    observer.observe(elemento, { childList: true, characterData: true, subtree: true });
}


// =========================================================
// RESULTADO
// =========================================================

function observarResultado(id) {

    const elemento = document.getElementById(id);
    if (!elemento) return;

    let tinhaTexto = false;

    const observer = new MutationObserver(() => {

        const texto = elemento.innerText.trim();
        const temTextoAgora = texto.length > 0;

        if (temTextoAgora && !tinhaTexto) {

            if (texto.startsWith('Vitória')) {
                tocarSomVitoria();
            } else if (texto === 'Tempo Esgotado!') {
                tocarSomTempoEsgotado();
            } else if (texto.includes('Empate')) {
                tocarSomEmpate();
            }
        }

        tinhaTexto = temTextoAgora;
    });

    observer.observe(elemento, { childList: true, characterData: true, subtree: true });
}