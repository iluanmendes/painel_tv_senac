const socket = io();

// =========================================
// VARIÁVEIS GLOBAIS
// =========================================
let rankingFreestyle = [];
let configuracoesApp = { tempoTorneio: 180 };
let timerInterval;
let tempoAtualSegundos = 0;


// =========================================
// SINCRONIZAÇÃO INICIAL (JSON)
// =========================================
socket.on('carregar_dados', (dados) => {
    if (!dados) return;
    rankingFreestyle = dados.rankingFreestyle || [];
    if(dados.configuracoes) {
        configuracoesApp = dados.configuracoes;
    }
    atualizarListaFreestyle();
});

function formatarTempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
}


// =========================================
// TRAVA DE SEGURANÇA CONTRA ERROS DE NULL
// =========================================
function setTexto(id, texto, isHTML = false) {
    const elemento = document.getElementById(id);
    if (elemento) {
        if (isHTML) {
            elemento.innerHTML = texto;
        } else {
            elemento.innerText = texto;
        }
    } else {
        console.warn(`Aviso: O elemento com ID '${id}' não foi encontrado no HTML da TV.`);
    }
}


// =========================================
// MONTAGEM DO RANKING FREESTYLE (DOM)
// =========================================
function atualizarListaFreestyle() {
    const listaFreestyle = document.getElementById('lista-freestyle');
    if(!listaFreestyle) return; // Se a lista não existir, aborta em vez de dar erro
    
    listaFreestyle.innerHTML = '';
    
    rankingFreestyle.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span><b>${index + 1}º</b> ${item.nome}</span> 
                        <span>⏰ ${formatarTempo(item.tempoSegundos)} (às ${item.horario})</span>`;
        listaFreestyle.appendChild(li);
    });
}


// =========================================
// REAÇÕES DA TV AOS COMANDOS DO CONTROLE
// =========================================
socket.on('atualiza_tela', (acao) => {
    switch(acao.tipo) {
        
        // --- GERENCIAMENTO DE MODO ---
        case 'MUDAR_MODO':
            clearInterval(timerInterval);
            setTexto('vencedor-torneio', ""); 
            
            const secTorneio = document.getElementById('modo-torneio');
            const secFreestyle = document.getElementById('modo-freestyle');
            
            if(acao.modo === 'torneio') {
                if (secTorneio) secTorneio.classList.remove('oculto');
                if (secFreestyle) secFreestyle.classList.add('oculto');
                setTexto('titulo-modo', "Modo Torneio");
            } else {
                if (secTorneio) secTorneio.classList.add('oculto');
                if (secFreestyle) secFreestyle.classList.remove('oculto');
                setTexto('titulo-modo', "Modo Freestyle");
            }
            break;

        // --- MODO TORNEIO ---
        case 'PREPARAR_TORNEIO':
            clearInterval(timerInterval);
            setTexto('nome-robo1', acao.robo1);
            setTexto('nome-robo2', acao.robo2);
            setTexto('bexigas-robo1', "0");
            setTexto('bexigas-robo2', "0");
            setTexto('vencedor-torneio', ""); 
            
            tempoAtualSegundos = configuracoesApp.tempoTorneio || 180;
            setTexto('cronometro-torneio', formatarTempo(tempoAtualSegundos));
            break;

        case 'RETOMAR_TORNEIO':
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if(tempoAtualSegundos > 0) {
                    tempoAtualSegundos--;
                    setTexto('cronometro-torneio', formatarTempo(tempoAtualSegundos));
                } else {
                    clearInterval(timerInterval);
                    setTexto('vencedor-torneio', "Tempo Esgotado!");
                }
            }, 1000);
            break;

        case 'PAUSAR_TORNEIO':
            clearInterval(timerInterval);
            break;

        case 'PONTUAR_TORNEIO':
            setTexto(`bexigas-robo${acao.robo}`, acao.pontos);
            
            const bexigas1 = document.getElementById('bexigas-robo1')?.innerText || "0";
            const bexigas2 = document.getElementById('bexigas-robo2')?.innerText || "0";
            
            if (acao.pontos < 2 && (parseInt(bexigas1) < 2 && parseInt(bexigas2) < 2)) {
                setTexto('vencedor-torneio', "");
            }

            if(acao.pontos === 2) {
                clearInterval(timerInterval);
                const nomeVencedor = acao.robo === 1 ? 
                    (document.getElementById('nome-robo1')?.innerText || "Robô 1") : 
                    (document.getElementById('nome-robo2')?.innerText || "Robô 2");
                setTexto('vencedor-torneio', `Vitória de ${nomeVencedor}!`);
            }
            break;
            
        case 'CANCELAR_TORNEIO':
            clearInterval(timerInterval);
            setTexto('nome-robo1', "Robô 1");
            setTexto('nome-robo2', "Robô 2");
            setTexto('bexigas-robo1', "0");
            setTexto('bexigas-robo2', "0");
            setTexto('cronometro-torneio', formatarTempo(configuracoesApp.tempoTorneio || 180));
            setTexto('vencedor-torneio', "Partida Cancelada");
            break;

        // --- MODO FREESTYLE --- 
        // --- MODO FREESTYLE --- 
        case 'INICIAR_FREESTYLE':
            // Injeta os nomes nos cards da arena
            setTexto('nome-free-robo1', acao.robo1);
            setTexto('nome-free-robo2', acao.robo2);
            setTexto('vencedor-freestyle', ""); 
            
            tempoAtualSegundos = 0;
            setTexto('cronometro-freestyle', formatarTempo(tempoAtualSegundos));
            
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                tempoAtualSegundos++;
                setTexto('cronometro-freestyle', formatarTempo(tempoAtualSegundos));
            }, 1000);
            break;

        case 'REGISTRAR_FREESTYLE':
            clearInterval(timerInterval);
            const registro = {
                nome: acao.vencedor,
                tempoSegundos: tempoAtualSegundos,
                horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            
            // Envia para o servidor salvar no JSON
            socket.emit('salvar_novo_registro', registro);
            
            // Atualiza a tela localmente
            rankingFreestyle.push(registro);
            rankingFreestyle.sort((a, b) => a.tempoSegundos - b.tempoSegundos);
            atualizarListaFreestyle();
            
            // Anuncia o vencedor no centro da arena
            setTexto('vencedor-freestyle', `Vitória de ${acao.vencedor}!`);
            break;

        case 'CANCELAR_FREESTYLE':
            clearInterval(timerInterval);
            tempoAtualSegundos = 0;
            setTexto('cronometro-freestyle', "00:00");
            setTexto('nome-free-robo1', "Robô 1");
            setTexto('nome-free-robo2', "Robô 2");
            setTexto('vencedor-freestyle', "Partida Cancelada");
            break;
    }
});