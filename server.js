const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- CAMADA DE PERSISTÊNCIA (JSON) ---
const ARQUIVO_JSON = './ranking.json';

// Estrutura padrão de dados
let dadosApp = {
    configuracoes: { tempoTorneio: 180 }, // 3 minutos em segundos por padrão
    rankingFreestyle: []
};

// Tenta carregar o arquivo ao iniciar o servidor.
if (fs.existsSync(ARQUIVO_JSON)) {
    const arquivo = fs.readFileSync(ARQUIVO_JSON, 'utf-8');
    try {
        let dadosLidos = JSON.parse(arquivo);
        // Verifica se é o formato antigo (apenas um array) para não perder os dados já salvos
        if (Array.isArray(dadosLidos)) {
            dadosApp.rankingFreestyle = dadosLidos;
        } else {
            dadosApp = dadosLidos;
        }
        console.log('Dados carregados com sucesso.');
    } catch (e) {
        console.log('Erro ao ler JSON. Utilizando dados padrão.');
    }
}

// Função auxiliar para salvar o arquivo
function salvarDados() {
    fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(dadosApp, null, 2));
}
salvarDados(); // Cria/atualiza o arquivo na largada

// --- CAMADA DE SEGURANÇA ---
const SENHA_MESTRE = "sumo2026";
let controleLogadoId = null;

io.on('connection', (socket) => {
    
    // Assim que a TV conecta, envia os dados e a configuração para ela
    socket.emit('carregar_dados', dadosApp);

    socket.on('autenticar_controle', (senha) => {
        if (senha !== SENHA_MESTRE) {
            socket.emit('erro_autenticacao', 'Senha incorreta!');
            return socket.disconnect();
        }
        if (controleLogadoId !== null) {
            socket.emit('erro_autenticacao', 'O controle já está em uso!');
            return socket.disconnect();
        }
        controleLogadoId = socket.id;
        socket.emit('controle_autorizado');
        // Envia as configurações para o controle recém-conectado
        socket.emit('carregar_dados', dadosApp);
    });

    socket.on('comando_controle', (dados) => {
        if (socket.id === controleLogadoId) {
            io.emit('atualiza_tela', dados);
        }
    });

   // Salva o ranking freestyle
    socket.on('salvar_novo_registro', (registro) => {
        // Trava de segurança: se o array não existir, cria um novo
        if (!dadosApp.rankingFreestyle) dadosApp.rankingFreestyle = [];
        
        dadosApp.rankingFreestyle.push(registro);
        dadosApp.rankingFreestyle.sort((a, b) => a.tempoSegundos - b.tempoSegundos);
        salvarDados();
        
        // Manda os dados atualizados para quem estiver conectado
        io.emit('carregar_dados', dadosApp);
    });

    // Salva as configurações de tempo
    socket.on('salvar_configuracoes', (novaConfig) => {
        if (socket.id === controleLogadoId) {
            dadosApp.configuracoes = novaConfig;
            salvarDados();
            io.emit('carregar_dados', dadosApp); // Atualiza TV e Controle
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === controleLogadoId) {
            controleLogadoId = null;
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});