const socket = io();

// =========================================
// 1. AUTENTICAÇÃO
// =========================================
const senhaDigitada = prompt("Digite a senha para acessar o controle:");

if (!senhaDigitada) {
    document.getElementById('tela-bloqueio').innerHTML = "<h2 style='color: var(--vermelho);'>Acesso Cancelado.</h2>";
    socket.disconnect();
} else {
    socket.emit('autenticar_controle', senhaDigitada);
}

socket.on('erro_autenticacao', (mensagem) => {
    alert(mensagem);
    document.getElementById('tela-bloqueio').innerHTML = `<h2 style='color: var(--vermelho);'>Acesso Negado:<br>${mensagem}</h2>`;
});

socket.on('controle_autorizado', () => {
    document.getElementById('tela-bloqueio').classList.add('oculto');
    document.getElementById('conteudo-controle').classList.remove('oculto');
});

socket.on('carregar_dados', (dados) => {
    document.getElementById('input-tempo-torneio').value = dados.configuracoes.tempoTorneio;
});


// =========================================
// 2. NAVEGAÇÃO DO MENU
// =========================================
function alternarModo(idModo, comandoSocket) {
    document.getElementById('controles-torneio').classList.add('oculto');
    document.getElementById('controles-freestyle').classList.add('oculto');
    document.getElementById('controles-config').classList.add('oculto');
    document.getElementById(idModo).classList.remove('oculto');
    if (comandoSocket) socket.emit('comando_controle', { tipo: 'MUDAR_MODO', modo: comandoSocket });
}

document.getElementById('btn-modo-torneio').addEventListener('click', () => alternarModo('controles-torneio', 'torneio'));
document.getElementById('btn-modo-freestyle').addEventListener('click', () => alternarModo('controles-freestyle', 'freestyle'));
document.getElementById('btn-modo-config').addEventListener('click', () => alternarModo('controles-config', null));


// =========================================
// 3. CONFIGURAÇÕES
// =========================================
document.getElementById('btn-salvar-config').addEventListener('click', () => {
    const tempo = parseInt(document.getElementById('input-tempo-torneio').value);
    if(tempo > 0) {
        socket.emit('salvar_configuracoes', { tempoTorneio: tempo });
        alert("Configuração salva com sucesso!");
    } else {
        alert("Digite um tempo válido maior que 0.");
    }
});


// =========================================
// 4. LÓGICA DO MODO TORNEIO
// =========================================
let pontosR1 = 0;
let pontosR2 = 0;

const inputR1 = document.getElementById('input-robo1');
const inputR2 = document.getElementById('input-robo2');
const acoesPreparo = document.getElementById('acoes-preparo-torneio');
const acoesJogo = document.getElementById('acoes-jogo-torneio');
const btnIniciarTempo = document.getElementById('btn-iniciar-tempo-torneio');
const btnPausarTempo = document.getElementById('btn-pausar-tempo-torneio');

document.getElementById('btn-preparar-torneio').addEventListener('click', () => {
    const robo1 = inputR1.value || 'Robô Azul';
    const robo2 = inputR2.value || 'Robô Vermelho';
    pontosR1 = 0;
    pontosR2 = 0;
    
    inputR1.disabled = true;
    inputR2.disabled = true;
    acoesPreparo.classList.add('oculto');
    acoesJogo.classList.remove('oculto');
    
    socket.emit('comando_controle', { tipo: 'PREPARAR_TORNEIO', robo1, robo2 });
});

btnIniciarTempo.addEventListener('click', () => {
    btnIniciarTempo.classList.add('oculto');
    btnPausarTempo.classList.remove('oculto');
    socket.emit('comando_controle', { tipo: 'RETOMAR_TORNEIO' });
});

btnPausarTempo.addEventListener('click', () => {
    btnPausarTempo.classList.add('oculto');
    btnIniciarTempo.classList.remove('oculto');
    btnIniciarTempo.innerText = "▶️ Retomar Relógio";
    socket.emit('comando_controle', { tipo: 'PAUSAR_TORNEIO' });
});

function enviarPontoTorneio(robo, pontos) {
    socket.emit('comando_controle', { tipo: 'PONTUAR_TORNEIO', robo, pontos });
}

document.getElementById('btn-ponto-robo1').addEventListener('click', () => {
    if(pontosR1 < 2) { pontosR1++; enviarPontoTorneio(1, pontosR1); }
});
document.getElementById('btn-desfazer-robo1').addEventListener('click', () => {
    if(pontosR1 > 0) { pontosR1--; enviarPontoTorneio(1, pontosR1); }
});

document.getElementById('btn-ponto-robo2').addEventListener('click', () => {
    if(pontosR2 < 2) { pontosR2++; enviarPontoTorneio(2, pontosR2); }
});
document.getElementById('btn-desfazer-robo2').addEventListener('click', () => {
    if(pontosR2 > 0) { pontosR2--; enviarPontoTorneio(2, pontosR2); }
});

document.getElementById('btn-cancelar-torneio').addEventListener('click', () => {
    inputR1.disabled = false; inputR1.value = "";
    inputR2.disabled = false; inputR2.value = "";
    acoesJogo.classList.add('oculto');
    acoesPreparo.classList.remove('oculto');
    
    btnIniciarTempo.classList.remove('oculto');
    btnIniciarTempo.innerText = "▶️ Iniciar Relógio";
    btnPausarTempo.classList.add('oculto');
    
    socket.emit('comando_controle', { tipo: 'CANCELAR_TORNEIO' });
});


// =========================================
// 5. LÓGICA DO MODO FREESTYLE
// =========================================
const inputFreeRobo1 = document.getElementById('input-free-robo1');
const inputFreeRobo2 = document.getElementById('input-free-robo2');
const btnIniciarFree = document.getElementById('btn-iniciar-freestyle');
const acoesVencedorFree = document.getElementById('acoes-vencedor-freestyle');
const btnVenceuRobo1 = document.getElementById('btn-venceu-robo1');
const btnVenceuRobo2 = document.getElementById('btn-venceu-robo2');
const btnCancelarFree = document.getElementById('btn-cancelar-freestyle');

let freeRobo1 = "";
let freeRobo2 = "";

btnIniciarFree.addEventListener('click', () => {
    freeRobo1 = inputFreeRobo1.value.trim() || 'Robô Azul';
    freeRobo2 = inputFreeRobo2.value.trim() || 'Robô Vermelho';

    inputFreeRobo1.disabled = true;
    inputFreeRobo2.disabled = true;
    btnIniciarFree.classList.add('oculto');
    
    btnVenceuRobo1.innerText = `💥 Vitória de ${freeRobo1}`;
    btnVenceuRobo2.innerText = `💥 Vitória de ${freeRobo2}`;
    
    acoesVencedorFree.classList.remove('oculto');

    socket.emit('comando_controle', { tipo: 'INICIAR_FREESTYLE', robo1: freeRobo1, robo2: freeRobo2 });
});

btnVenceuRobo1.addEventListener('click', () => registrarVitoriaFreestyle(freeRobo1));
btnVenceuRobo2.addEventListener('click', () => registrarVitoriaFreestyle(freeRobo2));

function registrarVitoriaFreestyle(nomeVencedor) {
    socket.emit('comando_controle', { tipo: 'REGISTRAR_FREESTYLE', vencedor: nomeVencedor });
    resetarInterfaceFreestyle();
}

btnCancelarFree.addEventListener('click', () => {
    socket.emit('comando_controle', { tipo: 'CANCELAR_FREESTYLE' });
    resetarInterfaceFreestyle();
});

function resetarInterfaceFreestyle() {
    inputFreeRobo1.disabled = false;
    inputFreeRobo2.disabled = false;
    inputFreeRobo1.value = "";
    inputFreeRobo2.value = "";
    
    btnIniciarFree.classList.remove('oculto');
    acoesVencedorFree.classList.add('oculto');
}