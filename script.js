document.addEventListener("DOMContentLoaded", () => {
    // Constantes e variáveis do jogo
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('mcan');
    const nextCtx = nextCanvas.getContext('2d');
    const pausePopup = document.getElementById("pausePopup");
    const resumeButton = document.getElementById("resumeButton");
    const restartButton = document.getElementById("restartButton");
    const exitButton = document.getElementById("exitButton");
    const recordPopup = document.getElementById("recordPopup");
    const finalScoreEl = document.getElementById("finalScore");
    const playerNameInput = document.getElementById("playerName");
    const saveRecordBtn = document.getElementById("saveRecord");
    const skipRecordBtn = document.getElementById("skipRecord");
    const pausePanelBtn = document.getElementById('pausePanelBtn');
    const restartPanelBtn = document.getElementById('restartPanelBtn');

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
    let tempoInicio = null;
    let tempoJogado = 0;
    // MODO INSANO
    let modoInsano = false;
    let insanoTimeout = null;
    let cliquesInsano = 0;
    let ultimoCliqueInsano = 0;
    let insanoTimerInterval = null;
    let tempoRestanteInsano = 0;
    const bgMusic = document.getElementById("bgMusic");
    const sndLine = document.getElementById("sndLine");
    const sndLock = document.getElementById("sndLock");
    const sndMove = document.getElementById("sndMove");
    const sndRotate = document.getElementById("sndRotate");
    const sndDrop = document.getElementById("sndDrop");
    const aviaoSom = document.getElementById("aviaoSom");
    let aviaoPressionado = false;
    let aviaoTimeout = null;
    let faseAviao = 0;

    bgMusic.volume = 0.3;
    sndLine.volume = 0.5;
    sndLock.volume = 0.5;
    sndMove.volume = 0.4;
    sndRotate.volume = 0.4;
    sndDrop.volume = 0.5;

    let musicaAtiva = false;

    function atualizarRecordeUI() {
        let rec = null;

        try {
            rec = JSON.parse(localStorage.getItem("recorde"));
        } catch (e) {
            rec = null;
        }

        // Se não existir ou estiver malformado, recria com padrão
        if (!rec || typeof rec.pontuacao !== "number" || typeof rec.nome !== "string") {
            rec = { nome: "Anônimo", pontuacao: 0 };
            localStorage.setItem("recorde", JSON.stringify(rec));
        }

        const elPontuacao = document.getElementById("recorde");
        const elNome = document.getElementById("recordeNome");

        // se ainda não existir na tela (ex: o jogo ainda está carregando)
        if (!elPontuacao || !elNome) return;

        elPontuacao.textContent = rec.pontuacao.toString().padStart(6, "0");
        elNome.textContent = rec.nome;
    }


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
        tempoInicio = performance.now();
        tempoJogado = 0;
        requestAnimationFrame(gameLoop);
        adicionarMensagem("Jogo iniciado");
    }
    // Detecta 3 cliques rápidos do mouse para ativar o Modo Insano
    document.addEventListener("click", () => {
        const agora = Date.now();

        // Se o clique for dentro de 500ms do anterior
        if (agora - ultimoCliqueInsano < 500) {
            cliquesInsano++;
        } else {
            cliquesInsano = 1; // reinicia contagem se demorou demais
        }

        ultimoCliqueInsano = agora;

        // Se clicou 3 vezes em menos de 1.5 segundos e o jogo ainda não começou
        if (cliquesInsano >= 3 && !modoInsano && !jogoIniciado) {
            ativarModoInsano();
        }
    });

    // Easter EGG (José Otávio), quando o jogador clicar 3 vezes com o mouse na tela antes de começar o jogo, ativa o MODO INSANO, dura 60s.
    function ativarModoInsano() {
        console.log("🔥 MODO INSANO ATIVADO!");
        modoInsano = true;
        tempoRestanteInsano = 60;

        // Guarda velocidade original
        velocidadeOriginal = velocidade;
        velocidade = Math.max(100, velocidadeOriginal / 3); // peças 3x mais rápidas

        adicionarMensagem("🔥 MODO INSANO ATIVADO! Aguente firme por 60s!");

        // Acelera a música
        try {
            bgMusic.playbackRate = 1.5;
            bgMusic.play();
        } catch (e) { }

        // Efeito visual
        document.body.classList.add("modo-insano");

        // Mostra o contador na tela
        const timerEl = document.getElementById("insanoTimer");
        if (timerEl) {
            timerEl.style.display = "block";
            timerEl.textContent = `INSANO: ${tempoRestanteInsano}s`;
        }

        // Atualiza o contador a cada segundo
        clearInterval(insanoTimerInterval);
        insanoTimerInterval = setInterval(() => {
            tempoRestanteInsano--;
            if (timerEl) timerEl.textContent = `INSANO: ${tempoRestanteInsano}s`;

            if (tempoRestanteInsano <= 0) {
                desativarModoInsano();
            }
        }, 1000);

        // Duração total: 60 segundos (segurança extra)
        clearTimeout(insanoTimeout);
        insanoTimeout = setTimeout(desativarModoInsano, 60000);
    }

    function desativarModoInsano() {
        if (!modoInsano) return; // evita repetir se já saiu

        console.log("😮‍💨 MODO INSANO DESATIVADO!");
        modoInsano = false;
        velocidade = velocidadeOriginal;
        adicionarMensagem("😮‍💨 Ufa... Voltando ao normal!");

        // Restaura a música
        try {
            if (bgMusic) {
                bgMusic.playbackRate = 1.0;
            }
        } catch (e) { }

        // Remove o efeito visual
        document.body.classList.remove("modo-insano");

        // Esconde o contador
        const timerEl = document.getElementById("insanoTimer");
        if (timerEl) timerEl.style.display = "none";

        // Limpa timers
        clearInterval(insanoTimerInterval);
        clearTimeout(insanoTimeout);
    }
    if (pausePanelBtn) {
        pausePanelBtn.addEventListener('click', () => {
            // usa a mesma função de pausar/continuar já existente
            togglePause();
        });
    } else {
        console.warn('pausePanelBtn não encontrado no DOM');
    }

    if (restartPanelBtn) {
        restartPanelBtn.addEventListener('click', () => {
            // fecha qualquer popup e reinicia
            try { pausePopup.style.display = 'none'; } catch (e) { }
            reiniciarJogo();
        });
    } else {
        console.warn('restartPanelBtn não encontrado no DOM');
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
            if (modoInsano) {
                desativarModoInsano();
            }
            if (aviaoAtivo || aviaoPressionado) {
                pararAviaoSom(); // garante que som e timeouts parem imediatamente
            }            
            mostrarTelaRecord(); // ← chama a tela de record

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
    function gameLoop(timestamp) {
        if (gameOver) {
            // 🔹 Quando o jogo termina, pausa a música e interrompe o loop
            try { bgMusic.pause(); } catch (e) { }
            adicionarMensagem("Jogo finalizado!");
            return; // <── Para o loop completamente
        }

        if (!jogoPausado) {
            const deltaTime = timestamp - ultimoTempo;
            tempoJogado = timestamp - tempoInicio;
            atualizarTempo();

            if (deltaTime > velocidade) {
                moverPecaParaBaixo();
                ultimoTempo = timestamp;
            }
        }

        desenhar();
        requestAnimationFrame(gameLoop);
    }


    function atualizarTempo() {
        const totalSegundos = Math.floor(tempoJogado / 1000);
        const minutos = Math.floor(totalSegundos / 60);
        const segundos = totalSegundos % 60;

        document.getElementById("timerDisplay").textContent =
            `⏱ ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
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

    function flutuarPeca() {
        if (!pecaAtual) return;
    
        adicionarMensagem("🛫 A peça começou a flutuar!");
        let passos = 0;
        const copia = JSON.parse(JSON.stringify(pecaAtual)); // cópia da peça
    
        const anim = setInterval(() => {
            if (passos < 40) { // sobe por 2s
                copia.y -= 0.2;
                desenhar(); // redesenha o tabuleiro
                desenharPecaTemp(copia); // desenha a cópia subindo
                passos++;
    
                // se sair do topo do canvas
                if (copia.y + copia.forma.length < 0) {
                    clearInterval(anim);
                    desaparecerPeca(copia);
                }
            } else {
                clearInterval(anim);
                desaparecerPeca(copia);
            }
        }, 50);
    }
    
    // desenha uma peça temporária (usada no efeito)
    function desenharPecaTemp(peca, cor = "rgba(255,255,255,1)") {
        ctx.fillStyle = cor;
        for (let y = 0; y < peca.forma.length; y++) {
            for (let x = 0; x < peca.forma[y].length; x++) {
                if (peca.forma[y][x]) {
                    ctx.fillRect(
                        (peca.x + x) * BLOCK_SIZE,
                        (peca.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            }
        }
    }
    
    function desaparecerPeca(pecaBackup) {
        let brilho = 0;
        const fade = setInterval(() => {
            brilho += 0.1;
            desenhar();
            desenharPecaTemp(pecaBackup, `rgba(255,255,255,${1 - brilho})`);
            if (brilho >= 1) {
                clearInterval(fade);
                pecaAtual = null;
                adicionarMensagem("💨 A peça sumiu no céu!");
                novaPeca(); // gera uma nova peça automaticamente
            }
        }, 100);
    }
    
    
    
    
    function pararAviaoSom() {
        // para o som e limpa estado
        try { aviaoSom.pause(); aviaoSom.currentTime = 0; } catch (e) {}
        aviaoAtivo = false;
        aviaoPressionado = false;
        // limpa timeouts só por garantia
        aviaoPhaseTimeouts.forEach(t => clearTimeout(t));
        aviaoPhaseTimeouts = [];
        adicionarMensagem("🛬 Voo concluído!");
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
        if (!pecaAtual) return; // proteção: evita erro se peça sumir (ex: aviã-som)
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

    // EASTER EGG (Eduardo Reis): Avião (pressionar ArrowUp por 2s) ativa a turbina em turnos de 2 segundos, e volta o bloco sumindo do mapa ---
    let aviaoAtivo = false;      // evita reentrância
    let aviaoPhaseTimeouts = []; // guarda timeouts pra limpar depois

    document.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowUp") return;
        // só inicia se o jogo estiver rodando e não estivermos no game over e se ainda não estiver ativo
        if (!jogoIniciado || gameOver || aviaoAtivo) return;
        if (aviaoPressionado) return; // já contando

        aviaoPressionado = true;

        // fase 1: após 2s -> inicia som (fase inicial)
        const t1 = setTimeout(() => {
            if (!aviaoPressionado || aviaoAtivo) return;
            aviaoAtivo = true;
            // início do som
            try { aviaoSom.currentTime = 0; aviaoSom.volume = 0.35; aviaoSom.play(); } catch (e) { }
            adicionarMensagem("✈️ Avião: fase 1 (potência baixa)");
        }, 2000);

        // fase 2: 4s totais -> aumenta volume
        const t2 = setTimeout(() => {
            if (!aviaoPressionado || !aviaoAtivo) return;
            try { aviaoSom.volume = 0.6; } catch (e) { }
            adicionarMensagem("✈️ Avião: fase 2 (potência média)");
        }, 4000);

        // fase 3: 6s totais -> máxima potência + flutuar
        const t3 = setTimeout(() => {
            if (!aviaoPressionado || !aviaoAtivo) return;
            try { aviaoSom.volume = 1.0; } catch (e) { }
            adicionarMensagem("🔥 Avião: TURBO!");
            // executa a animação da peça decolando
            flutuarPeca(); // função segura (ver abaixo)
            // encerra o avião automaticamente 2s depois
            const tEnd = setTimeout(() => {
                pararAviaoSom();
            }, 2000);
            aviaoPhaseTimeouts.push(tEnd);
        }, 6000);

        aviaoPhaseTimeouts.push(t1, t2, t3);
    });

    document.addEventListener("keyup", (e) => {
        if (e.key !== "ArrowUp") return;
        aviaoPressionado = false;
        // limpa timeouts pendentes (se o jogador soltou antes de ativar)
        aviaoPhaseTimeouts.forEach(t => clearTimeout(t));
        aviaoPhaseTimeouts = [];
        // se o som já estiver tocando, para
        if (aviaoAtivo) pararAviaoSom();
    }); 


    // Pausa/continua o jogo
    function togglePause() {
        jogoPausado = !jogoPausado;

        if (jogoPausado) {
            pausePopup.style.display = "flex";
            bgMusic.pause();
            adicionarMensagem("Jogo pausado");
        } else {
            pausePopup.style.display = "none";
            bgMusic.play();
            adicionarMensagem("Jogo continuado");
        }
    }

    // Botões da tela de pausa
    resumeButton.addEventListener("click", () => {
        togglePause();
    });

    restartButton.addEventListener("click", () => {
        pausePopup.style.display = "none";
        reiniciarJogo();
    });

    exitButton.addEventListener("click", () => {
        pausePopup.style.display = "none";
        jogoPausado = true;
        adicionarMensagem("Saindo para menu...");
        // Aqui você pode voltar para o popup inicial:
        document.getElementById("popup").style.display = "flex";
        jogoIniciado = false;
    });

    // Reinicia o jogo
    function reiniciarJogo() {
        // Fecha popups
        try { recordPopup.style.display = "none"; } catch (e) { }
        try { pausePopup.style.display = "none"; } catch (e) { }
        try { document.getElementById("popup").style.display = "none"; } catch (e) { }

        // Limpa canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

        // Reseta o tabuleiro e variáveis
        tabuleiro = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        pontuacao = 0;
        nivel = 0;
        linhasCompletas = 0;
        jogoPausado = false;
        gameOver = false;
        jogoIniciado = true;

        // Reset peça atual e próxima peça
        pecaAtual = null;
        proximaPeca = gerarPeca();

        // Reinicia timers
        tempoInicio = performance.now();
        tempoJogado = 0;
        document.getElementById("timerDisplay").textContent = "⏱ 00:00";

        // Atualiza UI
        document.getElementById('score').textContent = '000000';
        document.getElementById('level').textContent = '0';
        document.getElementById('lines').textContent = '0';
        document.getElementById('out1').innerHTML = '';

        // 🔹 Garante que o jogo tenha uma peça visível
        proximaPeca = gerarPeca();
        novaPeca(); // <── ESSA LINHA FALTAVA!

        // Atualiza visual da próxima peça e recorde
        atualizarProximaPeca();
        atualizarRecordeUI();

        // Desenha frame inicial
        desenhar();

        // Reinicia loop e música
        ultimoTempo = performance.now();
        requestAnimationFrame(gameLoop);

        try {
            bgMusic.currentTime = 0;
            bgMusic.play();
        } catch (e) { }

        adicionarMensagem("Jogo reiniciado!");
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

    function mostrarTelaRecord() {
        console.log("mostrarTelaRecord() chamada");

        // Garante que há um recorde salvo ou cria um padrão
        let recordeAtual;
        try {
            recordeAtual = JSON.parse(localStorage.getItem("recorde"));
        } catch {
            recordeAtual = { nome: "Anônimo", pontuacao: 0 };
        }

        if (!recordeAtual || typeof recordeAtual.pontuacao !== "number") {
            recordeAtual = { nome: "Anônimo", pontuacao: 0 };
            localStorage.setItem("recorde", JSON.stringify(recordeAtual));
        }

        console.log("Pontuação atual:", pontuacao, "| Recorde salvo:", recordeAtual.pontuacao);

        // 🔹 CASO 1 — Novo recorde
        if (pontuacao > recordeAtual.pontuacao) {
            console.log(">> Novo recorde detectado! <<");

            finalScoreEl.textContent = pontuacao;
            recordPopup.style.display = "flex"; // mostra tela de novo recorde
            try { bgMusic.pause(); } catch (e) { }

            adicionarMensagem("🎉 Novo recorde!");
        }

        // 🔹 CASO 2 — Não bateu recorde → mostra tela de Fim de Jogo
        else {
            console.log("Pontuação menor, mostrando Fim de Jogo");
            document.getElementById("finalScoreGameOver").textContent = pontuacao;
            document.getElementById("gameOverPopup").style.display = "flex";
            try { bgMusic.pause(); } catch (e) { }

            adicionarMensagem(
                `Você fez ${pontuacao} pontos. Recorde atual: ${recordeAtual.pontuacao} (${recordeAtual.nome})`
            );
        }
    }

    saveRecordBtn.addEventListener("click", () => {
        const nome = playerNameInput.value.trim() || "Anônimo";
        const novoRecorde = { nome, pontuacao };
        localStorage.setItem("recorde", JSON.stringify(novoRecorde));
        recordPopup.style.display = "none";
        adicionarMensagem(`Recorde salvo! ${nome} - ${pontuacao}`);
        atualizarRecordeUI();
    });

    skipRecordBtn.addEventListener("click", () => {
        recordPopup.style.display = "none";
        adicionarMensagem("Recorde ignorado");
    });

    const restartGameOverBtn = document.getElementById("restartGameOver");
    const exitGameOverBtn = document.getElementById("exitGameOver");

    restartGameOverBtn.addEventListener("click", () => {
        document.getElementById("gameOverPopup").style.display = "none";
        reiniciarJogo();
    });

    exitGameOverBtn.addEventListener("click", () => {
        document.getElementById("gameOverPopup").style.display = "none";
        adicionarMensagem("Jogo encerrado.");
    });

    const restartAfterRecordBtn = document.getElementById("restartAfterRecord");
    if (restartAfterRecordBtn) {
        restartAfterRecordBtn.addEventListener("click", () => {
            console.log("restartAfterRecord clicado");

            // Fecha o popup
            recordPopup.style.display = "none";

            // Limpa canvases (extra)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

            // Garante reinício limpo
            reiniciarJogo();
        });
    } else {
        console.warn("Botão restartAfterRecord não encontrado no DOM.");
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
    atualizarRecordeUI();

    desenharMensagemInicial();
});
