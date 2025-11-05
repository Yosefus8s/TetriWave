document.addEventListener("DOMContentLoaded", () => {
    // Constantes e variáveis do jogo
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('mcan');
    const nextCtx = nextCanvas.getContext('2d');
    const ROWS = 20; // linhas horizontal, vigas do jogo
    const COLS = 10; // colunas do jogo
    const BLOCK_SIZE = 30; //tamanho do bloco 30px

    // Definição das peças do jogo
    const Blocos = [[[1, 1, 1], [1, 0, 0], [1, 0, 0]],//0
    [[0, 1, 1], [1, 1, 0], [1, 0, 0]],//1
    [[1, 1, 1], [1, 0, 1]],//2
    [[1, 0, 0], [1, 1, 1], [0, 0, 1]],//3
    [[0, 0, 1], [1, 1, 1], [1, 0, 0]],//4
    [[0, 1, 0], [1, 1, 0], [0, 1, 1]],//5
    [[0, 1, 0], [0, 1, 1], [1, 1, 0]],//6
    [[1, 1, 1], [0, 1, 0], [0, 1, 0]],//7
    [[0, 1, 0], [0, 1, 1], [0, 1, 1]],//8
    [[0, 1, 0], [1, 0, 0], [1, 1, 0]]
    ];

    const BlocoLinhaCompleta = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]; // 10 colunas


    // Variáveis de estado do jogo
    let tabuleiro = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // Cria uma matriz
    let pontuacao = 0;
    let nivel = 0;
    let linhasCompletas = 0;
    let jogoPausado = false;
    let gameOver = false;
    let debugMode = false; // modo debug desligado por padrão
    let pecaAtual = null;
    let proximaPeca = null;
    let ultimoTempo = 0;
    let velocidade = 1000; // tempo em ms
    let jogoIniciado = false;
    const bgMusic = document.getElementById("bgMusic");
    const sndLine = document.getElementById("sndLine");
    const sndLock = document.getElementById("sndLock");
    const sndMove = document.getElementById("sndMove");
    const sndRotate = document.getElementById("sndRotate");
    const sndDrop = document.getElementById("sndDrop");

    bgMusic.volume = 0.3;
    sndLine.volume = 0.5;
    sndLock.volume = 0.5;
    sndMove.volume = 0.4;
    sndRotate.volume = 0.4;
    sndDrop.volume = 0.5;

    let musicaAtiva = false;


    // Inicialização do jogo
    function inicializar() {
        if (jogoIniciado) return; // evita múltiplas inits
        if (!musicaAtiva) {
            bgMusic.play().catch(() => {
                adicionarMensagem("Clique na tela para ativar o som (bloqueio do navegador)");
            });
            musicaAtiva = true;
        }
        jogoIniciado = true;
        proximaPeca = gerarPeca(); //gerador de peça aleatória
        novaPeca(); // coloca  uma nova peça no tabuleiro, move a proximaPeca para ser a pecaAtual, também verifica se já é game over
        atualizarProximaPeca();// mostra a próxima peça, limpa o canvas  e desenha a nova peça no tabuleiro
        ultimoTempo = performance.now();
        requestAnimationFrame(gameLoop);
        adicionarMensagem("Jogo iniciado");
    }

    // Gera uma peça aleatória
    function gerarPeca() {
        // Verifica se o modo debug está ativado
        if (debugMode) {
            const BlocoLinhaCompleta = [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // ocupa todas as 10 colunas
            ];

            return {
                forma: BlocoLinhaCompleta,
                x: 0, // começa no canto esquerdo
                y: 0  // começa no topo
            };
        }

        // Caso contrário, gera uma peça aleatória normal
        const tipo = Math.floor(Math.random() * Blocos.length);


        // Retorna o objeto da peça
        return {
            forma: Blocos[tipo],
            x: Math.floor(COLS / 2) - Math.floor(Blocos[tipo][0].length / 2), // centraliza no meio do tabuleiro
            y: 0 // começa no topo
        };
    }

    // Cria uma nova peça no tabuleiro
    function novaPeca() {
        pecaAtual = proximaPeca; // fila de bloco do jogo, transforma a próxima peça em peça atual
        proximaPeca = gerarPeca(); // gera uma nova peça aleatória para ser a próxima peça
        atualizarProximaPeca(); // atualiza o next que mostra a próxima peça

        // Verifica se a nova peça já colide (game over)
        if (verificarColisao()) { // instrução que retorna true se a peça atual colidir com algo, ela é acionada quando a peça nasce em cia de outro bloco ou ela nasce fora dos limites do tabuleiro
            gameOver = true; // o jogo termina
            adicionarMensagem("Fim de jogo! Sua pontuação: " + pontuacao); // exibe uma mensagem que informa o fim do jogo
        }
    }

    // Atualiza a exibição da próxima peça
    function atualizarProximaPeca() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height); // limpa o canvas do next, essa parte é necessária para remover a peça anterior antes de desenhar a nova


        const forma = proximaPeca.forma; // armazena o formato da peça
        const tamanhoBloco = 20; // define o tamanho de cada bloco do desenho em pixels, nesse caso 20px
        const offsetX = (nextCanvas.width - forma[0].length * tamanhoBloco) / 2; //centraliza horizontalmente a peça no canvas do next
        const offsetY = (nextCanvas.height - forma.length * tamanhoBloco) / 2; // centraliza verticalmente a peça no next
        nextCtx.fillStyle = "#0ff";
        //loop de desenho da peça
        for (let y = 0; y < forma.length; y++) { // repete em cada linha da matriz da peça
            for (let x = 0; x < forma[y].length; x++) { // repete por cada coluna da linha atual
                if (forma[y][x]) {//Verifica se a posição [y][x] da matriz contém 1, só desenha onde houver 1 e ignora 0
                    nextCtx.fillRect(// desenha o retangulo preenchido na posição
                        offsetX + x * tamanhoBloco,// posição horizonal
                        offsetY + y * tamanhoBloco,//posição vertical
                        tamanhoBloco - 1,//  deixa 1px de espaçamento entre os blocos
                        tamanhoBloco - 1//  deixa 1px de espaçamento entre os blocos
                    );
                }
            }
        }
    }

    // Loop principal do jogo
    function gameLoop(timestamp) { //
        if (!jogoPausado && !gameOver) { // verifica se o jogo não está pausado e não terminou. Só atualiza o jogo se estiver ativo e não pausado
            const deltaTime = timestamp - ultimoTempo; // Medir o tempo que passou para controlar a velocidade do jogo

            if (deltaTime > velocidade) { // verifica se passou tempo suficiente desde o último movimento
                moverPecaParaBaixo(); // move a peça atual para baixo
                ultimoTempo = timestamp; // atualiza o tempo do último movimento
            }
        }

        desenhar(); // renderiza o jogo na tela
        requestAnimationFrame(gameLoop); // O requestAnimationFrame é uma API moderna dos navegadores para criar animações suaves e eficientes. cria um loop de animação suave e eficiente
    }

    // Desenha o tabuleiro e a peça atual
    function desenhar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);//Limpa o canvas inteiro, apagando o frame anterior

        // Desenha o tabuleiro
        for (let y = 0; y < ROWS; y++) {// Desenha o tabuleiro com todas as peças já fixadas, repete por todas as LINHAS do tabuleiro (de 0 a ROWS-1)
            for (let x = 0; x < COLS; x++) { // repete por todas as COLUNAS de cada linha (de 0 a COLS-1)
                if (tabuleiro[y][x]) { // verifica se esta posição do tabuleiro contém um bloco
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1); // desenha o bloco individual na posição correta, calculando os pixels baseado nas cordenadas
                }
            }
        }

        // Desenha a peça atual
        if (pecaAtual) {// Verifica se existe uma peça atual para desenhar
            for (let y = 0; y < pecaAtual.forma.length; y++) { // Loop externo que percorre cada LINHA da matriz de formato da peça
                for (let x = 0; x < pecaAtual.forma[y].length; x++) { // Loop interno que percorre cada coluna da linha da peça atual
                    if (pecaAtual.forma[y][x]) { // Verifica se esta posição específica da matriz contém um bloco
                        ctx.fillRect(// Desenha um bloco individual na posição calculada
                            (pecaAtual.x + x) * BLOCK_SIZE, // calcula posição horizontal em pixels, o BLOCK_SIZE converte coordenadas de célula para pixels
                            (pecaAtual.y + y) * BLOCK_SIZE, // calcula a posição vertical em pixels
                            BLOCK_SIZE - 1, // tamanho menos 1 pixel para espaçamento
                            BLOCK_SIZE - 1 // tamanho menos 1 pixel para espaçamento
                        );
                    }
                }
            }
            if (debugMode) {
                ctx.fillStyle = "rgba(255,255,0,0.15)";
                ctx.fillRect(0, 0, canvas.width, 20);
                ctx.fillStyle = "#000";
                ctx.font = "10px 'Press Start 2P'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("DEBUG MODE", canvas.width / 2, 10);
            }
        }
        if (debugMode) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Move a peça para baixo
    function moverPecaParaBaixo() {
        if (!pecaAtual) return; // Verifica se existe uma peça atual em movimento, se não houver peça o pecaAtual é null e retorna sem fazer nada

        pecaAtual.y++; // Move a peça uma posição para baixo no tabuleiro incrementando na cordenada Y(vertical)
        if (verificarColisao()) { // Verifica se após o movimento ocorreu uma colisão, retorna true se colidir com o fundo do tabuleiro, com outra peça já fixada ou aiu dos limites do tabuleiro
            pecaAtual.y--; // Se houve colisão, desfaz o movimento, volta a cordenada y a posição anterior para validar a posição
            travarPeca(); // Trava o movimento da peça no tabuleiro, ela fica fixa em vez de móvel
            verificarLinhasCompletas(); // Verifica se alguma linha foi completada percorrendo todas as linhas do tabuleiro
            novaPeca(); // Cria uma nova peça
        }
    }

    // Verifica se há colisão
    function verificarColisao() {
        for (let y = 0; y < pecaAtual.forma.length; y++) { // Percorre cada linha da matriz de formato da peça atual
            for (let x = 0; x < pecaAtual.forma[y].length; x++) {// Percorre cada coluna da linha atual da peça
                if (pecaAtual.forma[y][x]) {// Verifica se esta posição contém um bloco (valor 1)
                    const novX = pecaAtual.x + x; // Calcula a posição real no tabuleiro, posição X no tabuleiro
                    const novY = pecaAtual.y + y;// Posição Y no tabuleiro

                    // Verifica quatro condições de colisão:
                    if (
                        novX < 0 || // Colisão com parede esquerda
                        novX >= COLS || // Colisão com parede direita
                        novY >= ROWS || // Colisão com o fundo do tabuleiro
                        (novY >= 0 && tabuleiro[novY][novX]) // Colisão com bloco existente (e dentro dos limites)
                    ) {
                        return true; // Retorna true se qualquer colisão for detectada
                    }
                }
            }
        }
        return false; // Retorna false se nenhuma colisão foi encontrada
    }

    // Trava a peça no tabuleiro
    function travarPeca() {
        for (let y = 0; y < pecaAtual.forma.length; y++) {
            for (let x = 0; x < pecaAtual.forma[y].length; x++) {
                if (pecaAtual.forma[y][x]) {
                    const novY = pecaAtual.y + y;
                    const novX = pecaAtual.x + x;
                    if (novY >= 0 && novY < ROWS && novX >= 0 && novX < COLS) {
                        tabuleiro[novY][novX] = 1;
                    } else if (novY >= ROWS && novX >= 0 && novX < COLS) {
                        tabuleiro[ROWS - 1][novX] = 1;
                    }
                }
            }
        }
        sndLock.currentTime = 0; // reinicia o som (permite tocar várias vezes seguidas)
        sndLock.play();
    }

    // Verifica e remove linhas completas
    function verificarLinhasCompletas() {
        let linhasRemovidas = 0; // Contador de linhas completas removidas
        for (let y = ROWS - 1; y >= 0; y--) {// Percorre o tabuleiro de baixo para cima (linha 19 até linha 0)
            if (tabuleiro[y].every(cell => cell !== 0)) {// Verifica se TODAS as células desta linha estão preenchidas (diferente de 0)
                tabuleiro.splice(y, 1);// Remove a linha completa do tabuleiro
                tabuleiro.unshift(Array(COLS).fill(0));// Adiciona uma nova linha vazia no TOPO do tabuleiro
                linhasRemovidas++; // Incrementa o contador
                y++; // Ajusta o índice para verificar a mesma posição novamente
            }
        }


        if (linhasRemovidas > 0) {// Se pelo menos uma linha foi removida
            sndLine.currentTime = 0;
            sndLine.play();
            const pontos = [0, 100, 300, 500, 800]; // Sistema de pontuação: mais pontos para mais linhas de uma vez 0, 1, 2, 3, 4 linhas
            pontuacao += pontos[linhasRemovidas] * (nivel + 1);// Calcula a pontuação: pontos[linhas] × (nível + 1)

            document.getElementById('score').textContent = pontuacao.toString().padStart(6, '0');// exibe o score
            linhasCompletas += linhasRemovidas;// Atualiza o total de linhas completadas

            document.getElementById('lines').textContent = linhasCompletas; //Exibe as linhas completas
            nivel = Math.floor(linhasCompletas / 10);// Atualiza o nível: a cada 10 linhas, sobe um nível

            document.getElementById('level').textContent = nivel;// exibe o nível

            velocidade = Math.max(100, 1000 - (nivel * 100)); // Aumenta a dificuldade, reduz 100 ms a cada nível


            adicionarMensagem(linhasRemovidas + " linha(s) completada(s)! +" +
                (pontos[linhasRemovidas] * (nivel + 1)) + " pontos");// Exibe no terminal linhas completadas e os pontos
        }
    }

    // Rotaciona a peça atual
    function rotacionarPeca() {
        const formaAntiga = pecaAtual.forma;    // Guarda a forma original para possível restauração

        // Obtém dimensões da peça atual
        const N = formaAntiga.length;     // Número de linhas
        const M = formaAntiga[0].length;  // Número de colunas


        let novaForma = Array.from({ length: M }, () => Array.from({ length: N }, () => 0));// Cria uma nova matriz vazia para a rotação

        // Preenche a nova matriz com os valores rotacionados a 90 graus
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < M; x++) {

                novaForma[x][N - 1 - y] = formaAntiga[y][x];// Fórmula de rotação 90 graus no sentido horário:
            }
        }


        const formaAntigaBackup = pecaAtual.forma; // Guarda backup e aplica a nova forma
        pecaAtual.forma = novaForma;


        if (verificarColisao()) {// Se a rotação causar colisão, restaura a forma original
            pecaAtual.forma = formaAntigaBackup;
        }
        sndRotate.currentTime = 0;
        sndRotate.play();
    }

    // Move a peça para a esquerda
    function moverEsquerda() {
        if (!pecaAtual) return; // Se não houver peça, retorna nada

        pecaAtual.x--; // Move para esquerda
        if (verificarColisao()) {
            pecaAtual.x++; // Se colidir, desfaz o movimento
        } else {
            if (!sndMove.paused) sndMove.pause();
            sndMove.currentTime = 0;
            sndMove.play();
        }

    }

    function moverDireita() {
        if (!pecaAtual) return; // Se não há peça, sai da função

        pecaAtual.x++; // Move para direita
        if (verificarColisao()) {
            pecaAtual.x--; // Se colidir, desfaz o movimento
        } else {
            if (!sndMove.paused) sndMove.pause();
            sndMove.currentTime = 0;
            sndMove.play();
        }
    }

    // Faz a peça cair até o fundo
    function cairPeca() {
        if (!pecaAtual) return; // Se não há peça, sai da função

        sndDrop.currentTime = 0;
        sndDrop.play();
        while (!verificarColisao()) {// Move a peça para baixo até detectar colisão, while é uma forma de loop quando não se sabe precisamente quantas interações, diferente do for que sim
            pecaAtual.y++;
        }
        pecaAtual.y--; // Volta uma posição (última posição válida)
        travarPeca(); // Fixa a peça no tabuleiro
        verificarLinhasCompletas(); // Verifica linhas completas
        novaPeca(); // Gera nova peça
    }

    // Manipula pressionamento de teclas
    document.addEventListener('keydown', (ev) => {
        // allow F2, arrows, space, enter, p, r
        const key = ev.key;
        // Não previnir todos os defaults; apenas prevenir para as teclas de jogo que causam scroll.
        const keysToPrevent = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
        if (keysToPrevent.includes(key)) ev.preventDefault();

        // Se ainda não iniciou, Enter inicia quando popup já foi fechado (handled separately)
        if (!jogoIniciado) {
            // F2 toggles debug even before start
            if (key === 'F2') {
                debugMode = !debugMode;
                adicionarMensagem(`Modo Debug: ${debugMode ? "Ativado" : "Desativado"}`);
            }
            return;
        }

        if (gameOver) return;

        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                moverEsquerda();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                moverDireita();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                moverPecaParaBaixo();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                rotacionarPeca();
                break;
            case ' ':
                cairPeca();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
            case 'r':
            case 'R':
                reiniciarJogo();
                break;
            case 'm':
            case 'M':
                bgMusic.muted = !bgMusic.muted;
                sndLine.muted = sndLock.muted = sndMove.muted = sndRotate.muted = sndDrop.muted = bgMusic.muted;
                adicionarMensagem(bgMusic.muted ? "Som desativado" : "Som ativado");
                break;

            case 'F2':
                debugMode = !debugMode;
                adicionarMensagem(`Modo Debug: ${debugMode ? "Ativado" : "Desativado"}`);
                break;
        }
    });

    // Pausa/continua o jogo
    function togglePause() {
        jogoPausado = !jogoPausado; // Pausa ou despausa
        adicionarMensagem(jogoPausado ? "Jogo pausado" : "Jogo continuado");
        if (jogoPausado) {
            bgMusic.pause();
        } else {
            bgMusic.play();
        }
    }

    // Reinicia o jogo
    function reiniciarJogo() {
        tabuleiro = Array.from({ length: ROWS }, () => Array(COLS).fill(0));// Reseta o tabuleiro para vazio
        // Reseta todas as variáveis de estado
        pontuacao = 0;
        nivel = 0;
        linhasCompletas = 0;
        jogoPausado = false;
        gameOver = false;

        //Reseta a interface
        document.getElementById('score').textContent = '000000';
        document.getElementById('level').textContent = '0';
        document.getElementById('lines').textContent = '0';
        // Limpa o terminal
        document.getElementById('out1').innerHTML = '';

        // Prepara a primeira peça
        proximaPeca = gerarPeca();
        novaPeca();
        atualizarProximaPeca();

        adicionarMensagem("Jogo reiniciado!"); // adciona mensagem ao terminal
    }

    // Adiciona mensagem ao terminal
    function adicionarMensagem(mensagem) {
        const terminal = document.getElementById('out1');
        const now = new Date(); // Coloca a data e a hora atual na mensagem
        const hora = now.getHours().toString().padStart(2, '0'); // Formatação da hora
        const minuto = now.getMinutes().toString().padStart(2, '0');// Formatação dos minutos
        const segundo = now.getSeconds().toString().padStart(2, '0'); // Formatação dos segundos

        terminal.innerHTML = `[${hora}:${minuto}:${segundo}] ${mensagem}<br>` + terminal.innerHTML; // exibição da hora mais a mensagem no terminal, usado uma forma diferente de concatenação
    }

    // Função para enviar mensagem do input
    function enviar() {
        const input = document.getElementById('in01');
        const mensagem = input.value.trim(); // remove espaços em branco

        if (mensagem) {
            adicionarMensagem("Jogador: " + mensagem);
            input.value = ''; // Limpa o input
        }
    }
    // Mostra o popup inicial quando a página carrega
    const popup = document.getElementById("popup");
    const startButton = document.getElementById("startButton");

    // Exibe o popup assim que o DOM estiver pronto
    popup.style.display = "flex";

    // Quando o jogador clicar em “Iniciar Jogo”
    startButton.addEventListener("click", () => {
        popup.style.display = "none"; // esconde o popup
        desenharMensagemInicial(); // mostra o texto no canvas
        const onEnterToStart = (e) => {
            if (e.key === "Enter") {
                document.removeEventListener("keydown", onEnterToStart);
                inicializar();
            }
        };
        document.addEventListener("keydown", onEnterToStart);
    });

    // --- CONFIGURAÇÕES DE SOM ---
    const configButton = document.getElementById("configButton");
    const configPopup = document.getElementById("configPopup");
    const closeConfig = document.getElementById("closeConfig");
    const muteButton = document.getElementById("muteButton");
    const volumeRange = document.getElementById("volumeRange");

    // Abre a tela de configurações
    configButton.addEventListener("click", () => {
        jogoPausado = true;
        configPopup.style.display = "flex";
        adicionarMensagem("Configurações abertas");
    });

    // Fecha a tela de configurações
    closeConfig.addEventListener("click", () => {
        configPopup.style.display = "none";
        jogoPausado = false;
        adicionarMensagem("Configurações fechadas");
    });

    // Alternar mute
    muteButton.addEventListener("click", () => {
        const muted = !bgMusic.muted;
        bgMusic.muted = sndLine.muted = sndLock.muted = sndMove.muted = sndRotate.muted = sndDrop.muted = muted;
        muteButton.textContent = muted ? "🔊 Som Ligado" : "🔇 Som Desligado";
        adicionarMensagem(muted ? "Som desativado" : "Som ativado");
    });

    // Ajustar volume global
    volumeRange.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value);
        bgMusic.volume = vol * 0.3; // música um pouco mais baixa
        sndLine.volume = sndLock.volume = sndMove.volume = sndRotate.volume = sndDrop.volume = vol;
    });

    // Mostra mensagem “Pressione Enter para iniciar” no canvas
    function desenharMensagemInicial() {
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFD700";
        ctx.font = "16px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("PRESSIONE ENTER", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText("PARA INICIAR", canvas.width / 2, canvas.height / 2 + 20);
    }

    desenharMensagemInicial();
});