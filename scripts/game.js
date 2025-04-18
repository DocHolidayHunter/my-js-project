let player, bullets, enemies;
let activePower = 'white';
let score = 0;
let lives = 3;
let whiteKills = 0;
let darkKills = 0;
let boss = null;
let bossHealth = 10;
let bossSpawned = false;
let miniBosses = [];
let bossToggleTimer = null;

let scoreText, livesText, powerText, bossHealthText, gameOverText, restartButton;
let whiteBar, darkBar;
let keyQ, keyE;
let gameOver = false;

function preload() {
  this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
  this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
}

function create() {
  this.input.setDefaultCursor('crosshair');
  bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 20 });
  enemies = this.physics.add.group();
  this.bulletParticles = this.add.particles('flares');

  player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'player');
  player.setCollideWorldBounds(true);

  keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  this.input.on('pointerdown', () => {
    if (gameOver) return;
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    const noseX = player.x + Math.cos(angle) * 20;
    const noseY = player.y + Math.sin(angle) * 20;
    const bulletKey = activePower === 'white' ? 'bullet-white' : 'bullet-dark';
    const bullet = bullets.get(noseX, noseY, bulletKey);
    if (bullet) {
      bullet.setTexture(bulletKey);
      bullet.setActive(true).setVisible(true);
      this.physics.velocityFromRotation(angle, 400, bullet.body.velocity);
      bullet.setRotation(angle);
      this.bulletParticles.createEmitter({
        frame: activePower === 'white' ? 'blue' : 'red',
        scale: { start: 0.3, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 400,
        speed: 0,
        follow: bullet
      });
    }
  });

  this.physics.add.overlap(bullets, enemies, handleBulletEnemyCollision, null, this);
  this.physics.add.overlap(player, enemies, (player, enemy) => {
    if (!gameOver && enemy.active) {
      enemy.body.enable = false;
      enemy.destroy();
      loseLife(this);
    }
  });

  scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '18px', fill: '#fff' });
  livesText = this.add.text(10, 30, 'Lives: 3', { fontSize: '18px', fill: '#fff' });
  powerText = this.add.text(10, 50, 'Power: white', { fontSize: '18px', fill: '#fff' });
  bossHealthText = this.add.text(this.scale.width / 2, 80, '', { fontSize: '20px', fill: '#ff0000' }).setOrigin(0.5);

  gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, '', {
    fontSize: '32px', fill: '#ff0000'
  }).setOrigin(0.5);

  restartButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, '', {
    fontSize: '24px', fill: '#00ffff', backgroundColor: '#000000', padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setInteractive().on('pointerdown', () => restartGame(this));
  restartButton.setVisible(false);

  whiteBar = this.add.rectangle(this.scale.width / 2 - 60, 10, 0, 10, 0xffffff).setOrigin(0, 0);
  darkBar = this.add.rectangle(this.scale.width / 2 - 60, 25, 0, 10, 0x000000).setOrigin(0, 0);

  generateCircleTexture(this, 'bullet-white', 6, 0xffffff);
  generateCircleTexture(this, 'bullet-dark', 6, 0x000000);
  generateCircleTexture(this, 'enemy-white', 20, 0xffffff);
  generateCircleTexture(this, 'enemy-dark', 20, 0x000000);

  this.time.addEvent({ delay: 1000, callback: () => spawnRandomEnemy(this), loop: true });
}

function update() {
  if (gameOver) return;

  const pointer = this.input.activePointer;
  const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
  player.setRotation(angle + Math.PI / 2);
  const moveSpeed = 0.08;
  player.x += (pointer.worldX - player.x) * moveSpeed;
  player.y += (pointer.worldY - player.y) * moveSpeed;

  enemies.getChildren().forEach(enemy => {
    if (!enemy.active || !enemy.body) return;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    enemy.body.velocity = this.physics.velocityFromRotation(angle, 60);
    enemy.rotation = angle;
  });

  bullets.children.each(bullet => {
    if (bullet.active && (bullet.x < 0 || bullet.x > this.scale.width || bullet.y < 0 || bullet.y > this.scale.height)) {
      bullet.setActive(false).setVisible(false);
    }
  });

  if (Phaser.Input.Keyboard.JustDown(keyQ)) {
    activePower = 'white';
    updatePowerText();
  }
  if (Phaser.Input.Keyboard.JustDown(keyE)) {
    activePower = 'dark';
    updatePowerText();
  }

  if (miniBosses.length > 0 && miniBosses.every(mb => !mb.active)) {
    score += 50;
    bossSpawned = false;
    whiteKills = 0;
    darkKills = 0;
    miniBosses = [];
    updateKillBars();
  }
}

function handleBulletEnemyCollision(bullet, enemy) {
  const type = enemy.getData('type');
  bullet.setActive(false).setVisible(false);

  if (enemy === boss) {
    if (type === activePower) {
      bossHealth--;
      bossHealthText.setText('Boss HP: ' + bossHealth);
      if (bossHealth <= 0) {
        if (bossToggleTimer) bossToggleTimer.remove(false);
        boss.destroy();
        boss = null;
        bossHealthText.setText('');
        spawnMiniBoss(this, enemy.x - 40, enemy.y);
        spawnMiniBoss(this, enemy.x + 40, enemy.y);
      }
    }
    return;
  }

  if (miniBosses.includes(enemy)) {
    if (type === activePower) {
      let hp = enemy.getData('health') - 1;
      enemy.setData('health', hp);
      if (hp <= 0) enemy.destroy();
    }
    return;
  }

  const scene = enemy.scene;
  const half1 = scene.add.image(enemy.x, enemy.y, `enemy-${type}`).setScale(0.5).setTint(0xffffff);
  const half2 = scene.add.image(enemy.x, enemy.y, `enemy-${type}`).setScale(0.5).setTint(0xffffff);
  scene.physics.add.existing(half1);
  scene.physics.add.existing(half2);
  half1.body.velocity.set(-100, -100);
  half2.body.velocity.set(100, -100);
  scene.time.delayedCall(800, () => { half1.destroy(); half2.destroy(); });

  enemy.destroy();
  score += 10;
  scoreText.setText('Score: ' + score);
  if (type === 'white') whiteKills++;
  else darkKills++;
  updateKillBars();
  if (whiteKills >= 5 && darkKills >= 5 && !bossSpawned) {
    spawnBoss(scene);
    bossSpawned = true;
  }
}

function spawnBoss(scene) {
  const x = Phaser.Math.Between(100, scene.scale.width - 100);
  const y = Phaser.Math.Between(100, scene.scale.height - 100);
  boss = scene.physics.add.image(x, y, 'enemy-white');
  boss.setData('type', 'white');
  boss.setScale(3);
  boss.setCircle(30);
  bossHealth = 10;
  bossHealthText.setText('Boss HP: ' + bossHealth);
  enemies.add(boss);
  bossToggleTimer = scene.time.addEvent({
    delay: 2000,
    loop: true,
    callback: () => {
      if (!boss || !boss.active) return;
      const newType = boss.getData('type') === 'white' ? 'dark' : 'white';
      boss.setTexture(`enemy-${newType}`);
      boss.setData('type', newType);
    }
  });
}

function spawnMiniBoss(scene, x, y) {
  const mini = scene.physics.add.image(x, y, 'enemy-white');
  mini.setData('type', 'white');
  mini.setData('health', 5);
  mini.setScale(1.5);
  mini.setTint(0xff4444);
  mini.setCircle(20);
  enemies.add(mini);
  miniBosses.push(mini);
  scene.time.addEvent({
    delay: 2000,
    loop: true,
    callback: () => {
      if (!mini || !mini.active) return;
      const newType = mini.getData('type') === 'white' ? 'dark' : 'white';
      mini.setTexture(`enemy-${newType}`);
      mini.setData('type', newType);
    }
  });
}

function updateKillBars() {
  whiteBar.width = Math.min(whiteKills, 5) * 20;
  darkBar.width = Math.min(darkKills, 5) * 20;
}

function spawnRandomEnemy(scene) {
  const type = Phaser.Math.Between(0, 1) === 0 ? 'white' : 'dark';
  const textureKey = `enemy-${type}`;
  const x = Phaser.Math.Between(50, scene.scale.width - 50);
  const y = Phaser.Math.Between(50, scene.scale.height - 50);
  const enemy = scene.physics.add.image(x, y, textureKey);
  enemy.setData('type', type);
  enemy.setCircle(20);
  enemies.add(enemy);
}

function updatePowerText() {
  powerText.setText('Power: ' + (activePower || 'none'));
}

function loseLife(scene) {
  lives--;
  livesText.setText('Lives: ' + lives);
  if (lives <= 0) {
    gameOver = true;
    gameOverText.setText('GAME OVER');
    restartButton.setText('Restart');
    restartButton.setVisible(true);
  }
}

function restartGame(scene) {
  gameOver = false;
  score = 0;
  lives = 3;
  whiteKills = 0;
  darkKills = 0;
  bossSpawned = false;
  boss = null;
  miniBosses = [];

  if (bossToggleTimer) {
    bossToggleTimer.remove(false);
    bossToggleTimer = null;
  }

  scoreText.setText('Score: 0');
  livesText.setText('Lives: 3');
  powerText.setText('Power: white');
  bossHealthText.setText('');
  gameOverText.setText('');
  restartButton.setText('');
  restartButton.setVisible(false);

  updateKillBars();
  bullets.clear(true, true);
  enemies.clear(true, true);
  player.setPosition(scene.scale.width / 2, scene.scale.height / 2);
}

function generateCircleTexture(scene, key, radius, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 1);
  g.fillCircle(radius, radius, radius);
  g.generateTexture(key, radius * 2, radius * 2);
  g.destroy();
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1d1d1d',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.resize(window.innerWidth, window.innerHeight));
