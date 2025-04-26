// Configuração do jogo
const DIFFICULTY = {
  EASY: { label: 'Fácil', value: 0.05, aiSpeed: 3 },
  MEDIUM: { label: 'Médio', value: 0.1, aiSpeed: 5 },
  HARD: { label: 'Difícil', value: 0.2, aiSpeed: 7 }
};

// Classe do jogo
class PingPongGame {
  constructor() {
    // Elementos DOM
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Estado do jogo
    this.isGameActive = false;
    this.isPaused = false;
    this.gameStartTime = 0;
    this.elapsedTime = 0;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    
    // Estatísticas
    this.stats = {
      rallies: 0,       // Número de rebatidas contínuas
      currentRally: 0,  // Rebatidas na partida atual
      maxRally: 0,      // Recorde de rebatidas
      hitPrecision: 0,  // Precisão dos hits (centro da raquete = melhor)
      avgBallSpeed: 0,  // Velocidade média da bola
      speedSamples: []  // Amostras de velocidade para cálculo de média
    };
    
    // Configurações
    this.difficulty = DIFFICULTY.MEDIUM;
    this.gapX = 15;
    this.lineWidth = 15;
    this.maxBallSpeed = 12;
    
    // Mouse
    this.mouse = { x: 0, y: 0 };
    
    // Carregar sons
    this.sounds = {
      hit: new Audio('./assets/hit.mp3'),
      wall: new Audio('./assets/wall.mp3'),
      score: new Audio('./assets/score.mp3')
    };
    
    // Objetos do jogo
    this.initializeObjects();
    
    // Configurar eventos
    this.setupEvents();
  }
  
  initializeObjects() {
    // Campo de jogo
    this.field = {
      w: window.innerWidth,
      h: window.innerHeight,
      draw: () => {
        // Fundo gradiente
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.field.h);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.field.w, this.field.h);
        
        // Linhas externas
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, this.field.w - 20, this.field.h - 20);
      }
    };
    
    // Linha central
    this.line = {
      w: this.lineWidth,
      h: this.field.h,
      draw: () => {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(this.field.w / 2 - this.line.w / 2, 0, this.line.w, this.line.h);
      }
    };
    
    // Raquete do jogador (esquerda)
    this.leftPaddle = {
      x: this.gapX,
      y: 100,
      w: this.lineWidth,
      h: 200,
      color: '#4ade80',
      _move: () => {
        this.leftPaddle.y = this.mouse.y - this.leftPaddle.h / 2;
        
        // Evitar que a raquete saia da tela
        if (this.leftPaddle.y < 0) this.leftPaddle.y = 0;
        if (this.leftPaddle.y + this.leftPaddle.h > this.field.h) {
          this.leftPaddle.y = this.field.h - this.leftPaddle.h;
        }
      },
      draw: () => {
        // Desenhar sombra
        this.ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
        this.ctx.fillRect(this.leftPaddle.x - 3, this.leftPaddle.y + 3, this.leftPaddle.w, this.leftPaddle.h);
        
        // Desenhar raquete
        this.ctx.fillStyle = this.leftPaddle.color;
        this.ctx.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.w, this.leftPaddle.h);
        
        this.leftPaddle._move();
      }
    };
    
    // Raquete do computador (direita)
    this.rightPaddle = {
      x: this.field.w - this.lineWidth - this.gapX,
      y: 300,
      w: this.lineWidth,
      h: 200,
      color: '#f43f5e',
      speed: this.difficulty.aiSpeed,
      _move: () => {
        if (!this.isGameActive || this.isPaused) return;
        
        // IA mais inteligente com antecipação da trajetória
        // Calcula o ponto onde a bola atingirá o lado direito
        let targetY = this.ball.y;
        
        // Se a bola está vindo na direção da raquete do computador
        if (this.ball.directionX > 0) {
          // Calcular a distância que a bola precisa percorrer no eixo X
          const distX = this.rightPaddle.x - this.ball.x;
          // Calcular quantos passos a bola levará para chegar na posição X da raquete
          const steps = distX / (this.ball.speed * this.ball.directionX);
          // Calcular onde a bola estará no eixo Y quando chegar na raquete
          targetY = this.ball.y + (this.ball.speed * this.ball.directionY * steps);
          
          // Ajustar se o ponto calculado estiver fora da tela
          if (targetY < 0) {
            targetY = Math.abs(targetY);
          } else if (targetY > this.field.h) {
            targetY = 2 * this.field.h - targetY;
          }
          
          // Adicionar dificuldade (imprecisão) com base no nível selecionado
          targetY += (Math.random() * 100 - 50) * this.difficulty.value;
        }
        
        // Mover em direção ao ponto alvo com velocidade proporcional à velocidade da bola
        const paddleCenter = this.rightPaddle.y + this.rightPaddle.h / 2;
        
        if (paddleCenter < targetY) {
          this.rightPaddle.y += this.rightPaddle.speed;
        } else {
          this.rightPaddle.y -= this.rightPaddle.speed;
        }
        
        // Evitar que a raquete saia da tela
        if (this.rightPaddle.y < 0) this.rightPaddle.y = 0;
        if (this.rightPaddle.y + this.rightPaddle.h > this.field.h) {
          this.rightPaddle.y = this.field.h - this.rightPaddle.h;
        }
      },
      draw: () => {
        // Desenhar sombra
        this.ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
        this.ctx.fillRect(this.rightPaddle.x + 3, this.rightPaddle.y + 3, this.rightPaddle.w, this.rightPaddle.h);
        
        // Desenhar raquete
        this.ctx.fillStyle = this.rightPaddle.color;
        this.ctx.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.w, this.rightPaddle.h);
        
        this.rightPaddle._move();
      }
    };
    
    // Placar
    this.score = {
      human: 0,
      computer: 0,
      increaseHuman: () => {
        this.score.human++;
        this.sounds.score.play();
        this.updateStatsDisplay();
        // Resetar o rally atual
        this.stats.currentRally = 0;
      },
      increaseComputer: () => {
        this.score.computer++;
        this.sounds.score.play();
        this.updateStatsDisplay();
        // Resetar o rally atual
        this.stats.currentRally = 0;
      },
      draw: () => {
        this.ctx.font = 'bold 72px Roboto, Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // Placar do jogador com destaque
        this.ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
        this.ctx.fillText(this.score.human, this.field.w / 4, 50);
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fillText(this.score.human, this.field.w / 4 - 3, 47);
        
        // Placar do computador
        this.ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        this.ctx.fillText(this.score.computer, this.field.w / 4 + this.field.w / 2, 50);
        this.ctx.fillStyle = '#f43f5e';
        this.ctx.fillText(this.score.computer, this.field.w / 4 + this.field.w / 2 - 3, 47);
      }
    };
    
    // Bola
    this.ball = {
      x: this.field.w / 2,
      y: this.field.h / 2,
      r: 15,
      speed: 7,
      directionX: 1,
      directionY: 1,
      _calcPosition: () => {
        if (!this.isGameActive || this.isPaused) return;
        
        // Registrar a velocidade da bola para estatísticas
        this.stats.speedSamples.push(this.ball.speed);
        if (this.stats.speedSamples.length > 30) {
          this.stats.speedSamples.shift();
        }
        this.stats.avgBallSpeed = this.stats.speedSamples.reduce((a, b) => a + b, 0) / this.stats.speedSamples.length;
        
        // Colisão com a raquete direita (computador)
        if (this.ball.x > this.field.w - this.ball.r - this.rightPaddle.w - this.gapX) {
          if (
            this.ball.y + this.ball.r > this.rightPaddle.y &&
            this.ball.y - this.ball.r < this.rightPaddle.y + this.rightPaddle.h
          ) {
            // Calcular a posição relativa do impacto na raquete
            const impactPosition = (this.ball.y - (this.rightPaddle.y + this.rightPaddle.h / 2)) / (this.rightPaddle.h / 2);
            
            // Inverter direção X
            this.ball._reverseX();
            
            // Ajustar ângulo com base na posição do impacto
            this.ball.directionY = impactPosition * 1.5;
            
            this.sounds.hit.play();
            
            // Incrementar o rally
            this.stats.currentRally++;
            this.stats.rallies++;
            
            // Atualizar máximo rally se necessário
            if (this.stats.currentRally > this.stats.maxRally) {
              this.stats.maxRally = this.stats.currentRally;
            }
            
            // Atualizar estatísticas na interface
            this.updateStatsDisplay();
          } else {
            this.score.increaseHuman();
            this.ball._pointUp();
          }
        }
        
        // Colisão com a raquete esquerda (jogador)
        if (this.ball.x < this.ball.r + this.leftPaddle.w + this.gapX) {
          if (
            this.ball.y + this.ball.r > this.leftPaddle.y &&
            this.ball.y - this.ball.r < this.leftPaddle.y + this.leftPaddle.h
          ) {
            // Calcular a posição relativa do impacto na raquete
            const impactPosition = (this.ball.y - (this.leftPaddle.y + this.leftPaddle.h / 2)) / (this.leftPaddle.h / 2);
            
            // Calcular precisão do hit para estatísticas (0 = centro da raquete = perfeito)
            const precision = 1 - Math.abs(impactPosition);
            this.stats.hitPrecision = precision * 100;
            
            // Inverter direção X
            this.ball._reverseX();
            
            // Ajustar ângulo com base na posição do impacto
            this.ball.directionY = impactPosition * 1.5;
            
            this.sounds.hit.play();
            
            // Incrementar o rally
            this.stats.currentRally++;
            this.stats.rallies++;
            
            // Atualizar máximo rally se necessário
            if (this.stats.currentRally > this.stats.maxRally) {
              this.stats.maxRally = this.stats.currentRally;
            }
            
            // Atualizar estatísticas na interface
            this.updateStatsDisplay();
          } else {
            this.score.increaseComputer();
            this.ball._pointUp();
          }
        }
        
        // Colisão com o teto ou o chão
        if (
          (this.ball.y - this.ball.r < 0 && this.ball.directionY < 0) ||
          (this.ball.y > this.field.h - this.ball.r && this.ball.directionY > 0)
        ) {
          this.ball._reverseY();
          this.sounds.wall.play();
        }
      },
      _reverseX: () => {
        this.ball.directionX *= -1;
      },
      _reverseY: () => {
        this.ball.directionY *= -1;
      },
      _pointUp: () => {
        // Aumentar velocidade da bola até o máximo
        this.ball.speed = Math.min(this.ball.speed + 0.5, this.maxBallSpeed);
        
        // Resetar posição
        this.ball.x = this.field.w / 2;
        this.ball.y = this.field.h / 2;
        
        // Randomizar a direção Y
        this.ball.directionY = (Math.random() * 2 - 1) * 0.5;
      },
      _move: () => {
        if (!this.isGameActive || this.isPaused) return;
        
        this.ball.x += this.ball.directionX * this.ball.speed;
        this.ball.y += this.ball.directionY * this.ball.speed;
      },
      draw: () => {
        // Sombra da bola
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x + 3, this.ball.y + 3, this.ball.r, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fill();
        
        // Bola principal com gradiente
        const gradient = this.ctx.createRadialGradient(
          this.ball.x - this.ball.r / 3, 
          this.ball.y - this.ball.r / 3, 
          0, 
          this.ball.x, 
          this.ball.y, 
          this.ball.r
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#e2e8f0');
        
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Brilho na bola
        this.ctx.beginPath();
        this.ctx.arc(
          this.ball.x - this.ball.r / 2.5, 
          this.ball.y - this.ball.r / 2.5, 
          this.ball.r / 4, 
          0, 
          2 * Math.PI, 
          false
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        
        this.ball._calcPosition();
        this.ball._move();
      }
    };
  }
  
  setupEvents() {
    // Mouse move para controlar a raquete do jogador
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.pageX;
      this.mouse.y = e.pageY;
    });
    
    // Resize da janela
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Tecla Esc para pausar/continuar o jogo
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isGameActive) {
        this.togglePause();
      }
    });
  }
  
  resizeCanvas() {
    // Ajustar as dimensões do canvas
    this.field.w = window.innerWidth;
    this.field.h = window.innerHeight;
    this.canvas.width = this.field.w;
    this.canvas.height = this.field.h;
    
    // Reposicionar a raquete direita
    this.rightPaddle.x = this.field.w - this.lineWidth - this.gapX;
    
    // Centralizar a bola se o jogo não estiver ativo
    if (!this.isGameActive) {
      this.ball.x = this.field.w / 2;
      this.ball.y = this.field.h / 2;
    }
  }
  
  draw() {
    // Desenhar todos os elementos do jogo
    this.field.draw();
    this.line.draw();
    this.leftPaddle.draw();
    this.rightPaddle.draw();
    this.score.draw();
    this.ball.draw();
    
    // Desenhar o tempo decorrido se o jogo estiver ativo
    if (this.isGameActive) {
      this.drawElapsedTime();
    }
  }
  
  drawElapsedTime() {
    if (this.isPaused) {
      // Tempo congelado durante a pausa
      this.elapsedTime = this.pauseStartTime - this.gameStartTime - this.totalPausedTime;
    } else {
      // Tempo continua correndo
      this.elapsedTime = Date.now() - this.gameStartTime - this.totalPausedTime;
    }
    
    const seconds = Math.floor(this.elapsedTime / 1000) % 60;
    const minutes = Math.floor(this.elapsedTime / 60000);
    
    this.ctx.font = '16px Roboto, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      this.field.w / 2,
      20
    );
  }
  
  startGame() {
    // Esconder o menu
    document.getElementById('menuContainer').classList.add('hidden');
    
    // Resetar o jogo
    this.resetGame();
    
    // Ativar o jogo
    this.isGameActive = true;
    this.isPaused = false;
    this.gameStartTime = Date.now();
    this.totalPausedTime = 0;
    
    // Configurar dificuldade
    this.rightPaddle.speed = this.difficulty.aiSpeed;
    
    // Exibir HUD
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('gameControls').classList.remove('hidden');
    
    // Atualizar estatísticas na interface
    this.updateStatsDisplay();
  }
  
  resetGame() {
    // Resetar placar
    this.score.human = 0;
    this.score.computer = 0;
    
    // Resetar bola
    this.ball.x = this.field.w / 2;
    this.ball.y = this.field.h / 2;
    this.ball.speed = 7;
    this.ball.directionX = Math.random() > 0.5 ? 1 : -1;
    this.ball.directionY = (Math.random() * 2 - 1) * 0.5;
    
    // Resetar estatísticas
    this.stats.rallies = 0;
    this.stats.currentRally = 0;
    this.stats.maxRally = 0;
    this.stats.hitPrecision = 0;
    this.stats.avgBallSpeed = this.ball.speed;
    this.stats.speedSamples = [this.ball.speed];
    
    // Atualizar estatísticas
    this.updateStatsDisplay();
  }
  
  togglePause() {
    if (!this.isGameActive) return;
    
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      // Iniciar a pausa
      this.pauseStartTime = Date.now();
      document.getElementById('pauseOverlay').classList.add('visible');
    } else {
      // Terminar a pausa
      this.totalPausedTime += (Date.now() - this.pauseStartTime);
      document.getElementById('pauseOverlay').classList.remove('visible');
    }
    
    // Atualizar o ícone do botão de pausa
    const pauseBtn = document.getElementById('pauseBtn');
    if (this.isPaused) {
      pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }
  
  updateStatsDisplay() {
    // Atualizar estatísticas na interface
    document.getElementById('statsRallies').textContent = this.stats.rallies;
    document.getElementById('statsMaxRally').textContent = this.stats.maxRally;
    document.getElementById('statsCurrentRally').textContent = this.stats.currentRally;
    document.getElementById('statsPrecision').textContent = Math.round(this.stats.hitPrecision) + '%';
    document.getElementById('statsAvgSpeed').textContent = this.stats.avgBallSpeed.toFixed(1);
  }
  
  backToMenu() {
    // Pausar o jogo se estiver ativo
    this.isGameActive = false;
    this.isPaused = true;
    
    // Mostrar menu
    document.getElementById('menuContainer').classList.remove('hidden');
    
    // Esconder HUD e controles
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.remove('visible');
  }
  
  setDifficulty(difficultyKey) {
    this.difficulty = DIFFICULTY[difficultyKey];
    
    // Atualizar os botões de dificuldade
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`${difficultyKey.toLowerCase()}Btn`).classList.add('active');
  }
  
  gameLoop() {
    // Limpar o canvas
    this.ctx.clearRect(0, 0, this.field.w, this.field.h);
    
    // Desenhar elementos do jogo
    this.draw();
    
    // Continuar o loop
    requestAnimationFrame(() => this.gameLoop());
  }
  
  init() {
    // Configurar canvas
    this.resizeCanvas();
    
    // Iniciar o loop do jogo
    this.gameLoop();
  }
}

// Inicializar o jogo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  const game = new PingPongGame();
  game.init();
  
  // Configurar eventos de UI
  document.getElementById('startBtn').addEventListener('click', () => {
    game.startGame();
  });
  
  document.getElementById('easyBtn').addEventListener('click', () => {
    game.setDifficulty('EASY');
  });
  
  document.getElementById('mediumBtn').addEventListener('click', () => {
    game.setDifficulty('MEDIUM');
  });
  
  document.getElementById('hardBtn').addEventListener('click', () => {
    game.setDifficulty('HARD');
  });
  
  document.getElementById('pauseBtn').addEventListener('click', () => {
    game.togglePause();
  });
  
  document.getElementById('menuBtn').addEventListener('click', () => {
    game.backToMenu();
  });
  
  document.getElementById('resumeBtn').addEventListener('click', () => {
    game.togglePause();
  });
});
