const socket = io();

// 1. Solicita a senha ao abrir a página
const senhaDigitada = prompt("Digite a senha para acessar o controle:");

if (!senhaDigitada) {
    // Se o usuário cancelar, avisa e corta a conexão
    document.getElementById('tela-bloqueio').innerHTML = "<h2 style='color: var(--vermelho);'>Acesso Cancelado.</h2>";
    socket.disconnect();
} else {
    // Envia a senha para o servidor validar
    socket.emit('autenticar_controle', senhaDigitada);
}

// 2. Tratamento das respostas do Servidor
socket.on('erro_autenticacao', (mensagem) => {
    alert(mensagem);
    document.getElementById('tela-bloqueio').innerHTML = `<h2 style='color: var(--vermelho);'>Acesso Negado:<br>${mensagem}</h2>`;
});

socket.on('controle_autorizado', () => {
    // Se a senha estiver correta, esconde a trava e revela o painel
    document.getElementById('tela-bloqueio').classList.add('oculto');
    document.getElementById('conteudo-controle').classList.remove('oculto');
});





// Controle de Interface do Smartphone
document.getElementById('btn-modo-torneio').addEventListener('click', () => {
    document.getElementById('controles-torneio').classList.remove('oculto');
    document.getElementById('controles-freestyle').classList.add('oculto');
    socket.emit('comando_controle', { tipo: 'MUDAR_MODO', modo: 'torneio' });
});

document.getElementById('btn-modo-freestyle').addEventListener('click', () => {
    document.getElementById('controles-freestyle').classList.remove('oculto');
    document.getElementById('controles-torneio').classList.add('oculto');
    socket.emit('comando_controle', { tipo: 'MUDAR_MODO', modo: 'freestyle' });
});

// Ações do Torneio
let pontosR1 = 0;
let pontosR2 = 0;

document.getElementById('btn-iniciar-torneio').addEventListener('click', () => {
    const robo1 = document.getElementById('input-robo1').value || 'Robô Azul';
    const robo2 = document.getElementById('input-robo2').value || 'Robô Vermelho';
    pontosR1 = 0;
    pontosR2 = 0;
    socket.emit('comando_controle', { tipo: 'INICIAR_TORNEIO', robo1, robo2 });
});

document.getElementById('btn-ponto-robo1').addEventListener('click', () => {
    if (pontosR1 < 2) pontosR1++;
    socket.emit('comando_controle', { tipo: 'PONTUAR_TORNEIO', robo: 1, pontos: pontosR1 });
});

document.getElementById('btn-ponto-robo2').addEventListener('click', () => {
    if (pontosR2 < 2) pontosR2++;
    socket.emit('comando_controle', { tipo: 'PONTUAR_TORNEIO', robo: 2, pontos: pontosR2 });
});

// --- Ações do Freestyle (1v1) ---
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

    // Trava os inputs
    inputFreeRobo1.disabled = true;
    inputFreeRobo2.disabled = true;
    btnIniciarFree.classList.add('oculto');
    
    // Personaliza os botões com os nomes
    btnVenceuRobo1.innerText = `💥 Vitória de ${freeRobo1}`;
    btnVenceuRobo2.innerText = `💥 Vitória de ${freeRobo2}`;
    
    acoesVencedorFree.classList.remove('oculto');

    // Avisa a TV quem vai lutar
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