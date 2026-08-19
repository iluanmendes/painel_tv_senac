const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- CAMADA DE SEGURANÇA ---
const SENHA_MESTRE = "sumo2026"; // Mude para a senha que preferir
let controleLogadoId = null; // Armazena quem é o "Dono" do controle atual

io.on('connection', (socket) => {
    
    // Escuta a tentativa de login do smartphone
    socket.on('autenticar_controle', (senha) => {
        if (senha !== SENHA_MESTRE) {
            socket.emit('erro_autenticacao', 'Senha incorreta!');
            return socket.disconnect(); // Derruba o invasor
        }

        if (controleLogadoId !== null) {
            socket.emit('erro_autenticacao', 'O controle já está em uso por outro dispositivo!');
            return socket.disconnect(); // Anula conexões extras
        }

        // Sucesso: registra este socket como o controle oficial
        controleLogadoId = socket.id;
        socket.emit('controle_autorizado');
        console.log('Controle autenticado. ID:', socket.id);
    });

    // Recebe comandos e repassa para a tela (somente se for o controle oficial)
    socket.on('comando_controle', (dados) => {
        if (socket.id === controleLogadoId) {
            io.emit('atualiza_tela', dados);
        }
    });

    // Se o dispositivo desconectar
    socket.on('disconnect', () => {
        // Se o controle oficial cair/fechar a aba, libera a vaga para conectar novamente
        if (socket.id === controleLogadoId) {
            controleLogadoId = null;
            console.log('Controle principal desconectado. Vaga liberada.');
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});