const socket = io();

// Elementos Torneio
const secTorneio = document.getElementById('modo-torneio');
const robo1Nome = document.getElementById('nome-robo1');
const robo2Nome = document.getElementById('nome-robo2');
const bexigas1 = document.getElementById('bexigas-robo1');
const bexigas2 = document.getElementById('bexigas-robo2');
const cronometroTorneio = document.getElementById('cronometro-torneio');
const vencedorTorneio = document.getElementById('vencedor-torneio');
const tituloModo = document.getElementById('titulo-modo');

// Elementos Freestyle
const secFreestyle = document.getElementById('modo-freestyle');
const cronometroFreestyle = document.getElementById('cronometro-freestyle');
const listaFreestyle = document.getElementById('lista-freestyle');

let timerInterval;
let rankingFreestyle = [];
let tempoAtualSegundos = 0;

function formatarTempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
}

socket.on('atualiza_tela', (acao) => {
    switch(acao.tipo) {
        case 'MUDAR_MODO':
            clearInterval(timerInterval);
            if(acao.modo === 'torneio') {
                secTorneio.classList.remove('oculto');
                secFreestyle.classList.add('oculto');
                tituloModo.innerText = "Modo Torneio";
            } else {
                secTorneio.classList.add('oculto');
                secFreestyle.classList.remove('oculto');
                tituloModo.innerText = "Modo Freestyle";
            }
            break;

        case 'INICIAR_TORNEIO':
            robo1Nome.innerText = acao.robo1;
            robo2Nome.innerText = acao.robo2;
            bexigas1.innerText = "0";
            bexigas2.innerText = "0";
            vencedorTorneio.innerText = "";
            tempoAtualSegundos = 180; // 3 Minutos
            cronometroTorneio.innerText = formatarTempo(tempoAtualSegundos);
            
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if(tempoAtualSegundos > 0) {
                    tempoAtualSegundos--;
                    cronometroTorneio.innerText = formatarTempo(tempoAtualSegundos);
                } else {
                    clearInterval(timerInterval);
                    vencedorTorneio.innerText = "Tempo Esgotado!";
                }
            }, 1000);
            break;

        case 'PONTUAR_TORNEIO':
            if(acao.robo === 1) bexigas1.innerText = acao.pontos;
            if(acao.robo === 2) bexigas2.innerText = acao.pontos;
            
            if(acao.pontos === 2) {
                clearInterval(timerInterval);
                const nomeVencedor = acao.robo === 1 ? robo1Nome.innerText : robo2Nome.innerText;
                vencedorTorneio.innerText = `Vitória de ${nomeVencedor}!`;
            }
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