const socket = io();

// Variáveis Globais de Configuração
let rankingFreestyle = [];
let configuracoesApp = { tempoTorneio: 180 };
let timerInterval;
let tempoAtualSegundos = 0;

// Recebe os dados e configurações do JSON assim que conecta
socket.on('carregar_dados', (dados) => {
    rankingFreestyle = dados.rankingFreestyle || [];
    configuracoesApp = dados.configuracoes;
    atualizarListaFreestyle();
});

function formatarTempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
}

socket.on('atualiza_tela', (acao) => {
    switch(acao.tipo) {
        
        // --- GERENCIAMENTO DE MODO ---
        case 'MUDAR_MODO':
            clearInterval(timerInterval);
            document.getElementById('vencedor-torneio').innerText = ""; // Limpa lixo da tela
            if(acao.modo === 'torneio') {
                document.getElementById('modo-torneio').classList.remove('oculto');
                document.getElementById('modo-freestyle').classList.add('oculto');
                document.getElementById('titulo-modo').innerText = "Modo Torneio";
            } else {
                document.getElementById('modo-torneio').classList.add('oculto');
                document.getElementById('modo-freestyle').classList.remove('oculto');
                document.getElementById('titulo-modo').innerText = "Modo Freestyle";
            }
            break;

        // --- MODO TORNEIO ---
        case 'PREPARAR_TORNEIO':
            clearInterval(timerInterval);
            document.getElementById('nome-robo1').innerText = acao.robo1;
            document.getElementById('nome-robo2').innerText = acao.robo2;
            document.getElementById('bexigas-robo1').innerText = "0";
            document.getElementById('bexigas-robo2').innerText = "0";
            document.getElementById('vencedor-torneio').innerText = ""; // Prepara área do vencedor
            
            // Pega o tempo do arquivo JSON
            tempoAtualSegundos = configuracoesApp.tempoTorneio;
            document.getElementById('cronometro-torneio').innerText = formatarTempo(tempoAtualSegundos);
            break;

        case 'RETOMAR_TORNEIO':
            clearInterval(timerInterval); // Garante que não duplique intervalos
            timerInterval = setInterval(() => {
                if(tempoAtualSegundos > 0) {
                    tempoAtualSegundos--;
                    document.getElementById('cronometro-torneio').innerText = formatarTempo(tempoAtualSegundos);
                } else {
                    clearInterval(timerInterval);
                    document.getElementById('vencedor-torneio').innerText = "Tempo Esgotado!";
                }
            }, 1000);
            break;

        case 'PAUSAR_TORNEIO':
            clearInterval(timerInterval);
            break;

        case 'PONTUAR_TORNEIO':
            const bexigas1 = document.getElementById('bexigas-robo1');
            const bexigas2 = document.getElementById('bexigas-robo2');
            
            if(acao.robo === 1) bexigas1.innerText = acao.pontos;
            if(acao.robo === 2) bexigas2.innerText = acao.pontos;
            
            // A Lógica do Botão "Desfazer" 
            // Se as bexigas caírem pra menos de 2, ele apaga a faixa de "Vitória"
            if (acao.pontos < 2 && (parseInt(bexigas1.innerText) < 2 && parseInt(bexigas2.innerText) < 2)) {
                document.getElementById('vencedor-torneio').innerText = "";
            }

            // Condição de Vitória (Estourar 2 Bexigas)
            if(acao.pontos === 2) {
                clearInterval(timerInterval);
                const nomeVencedor = acao.robo === 1 ? document.getElementById('nome-robo1').innerText : document.getElementById('nome-robo2').innerText;
                document.getElementById('vencedor-torneio').innerText = `Vitória de ${nomeVencedor}!`;
            }
            break;
            
        case 'CANCELAR_TORNEIO':
            clearInterval(timerInterval);
            document.getElementById('nome-robo1').innerText = "Robô 1";
            document.getElementById('nome-robo2').innerText = "Robô 2";
            document.getElementById('bexigas-robo1').innerText = "0";
            document.getElementById('bexigas-robo2').innerText = "0";
            document.getElementById('cronometro-torneio').innerText = formatarTempo(configuracoesApp.tempoTorneio);
            document.getElementById('vencedor-torneio').innerText = "Partida Cancelada";
            break;

        case 'INICIAR_FREESTYLE':
            // Monta o "Robô Azul VS Robô Vermelho" com as cores do CSS
            document.getElementById('confronto-atual-tv').innerHTML = 
                `<span style="color: var(--azul)">${acao.robo1}</span> 
                 <strong style="color: white">VS</strong> 
                 <span style="color: var(--vermelho)">${acao.robo2}</span>`;
            
            tempoAtualSegundos = 0;
            cronometroFreestyle.innerText = formatarTempo(tempoAtualSegundos);
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                tempoAtualSegundos++;
                cronometroFreestyle.innerText = formatarTempo(tempoAtualSegundos);
            }, 1000);
            break;

        case 'REGISTRAR_FREESTYLE':
            clearInterval(timerInterval);
            const registro = {
                nome: acao.vencedor,
                tempoSegundos: tempoAtualSegundos,
                horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            
            // --- NOVO: Envia para o servidor salvar no arquivo JSON ---
            socket.emit('salvar_novo_registro', registro);



            rankingFreestyle.push(registro);
            rankingFreestyle.sort((a, b) => a.tempoSegundos - b.tempoSegundos);
            
            atualizarListaFreestyle();
            
            // Anuncia quem ganhou no topo da tela
            document.getElementById('confronto-atual-tv').innerHTML = 
                `<span style="color: var(--verde)">🏆 Vitória de ${acao.vencedor}!</span>`;
            break;

        case 'CANCELAR_FREESTYLE':
            clearInterval(timerInterval);
            tempoAtualSegundos = 0;
            cronometroFreestyle.innerText = "00:00";
            document.getElementById('confronto-atual-tv').innerHTML = 
                `<span style="color: var(--alerta)">Partida Cancelada</span>`;
            break;
    }
});

function atualizarListaFreestyle() {
    listaFreestyle.innerHTML = '';
    rankingFreestyle.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span><b>${index + 1}º</b> ${item.nome}</span> 
                        <span>⏰ ${formatarTempo(item.tempoSegundos)} (às ${item.horario})</span>`;
        listaFreestyle.appendChild(li);
    });
}