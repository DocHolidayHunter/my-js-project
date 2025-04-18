let player, bullets, enemies;
let activePower = 'white';
let score = 0;
let lives = 3;
let scoreText, livesText, powerText, gameOverText, restartButton;
let keyQ, keyE;
let gameOver = false;

function preload() {
  this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
}

function create() {
  this.input.setDefaultCursor('crosshair');

  bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 20 });
  enemies = this.physics.add.group();

  player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'player');
  player.setCollideWorldBounds(true);

  keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  this.input.on('pointerdown', () => {
    if (gameOver) return;
    const bulletKey = activePower === 'white' ? 'bullet-white' : 'bullet-dark';
    const bullet = bullets.get(player.x, player.y, bulletKey);
    if (bullet) {
      bullet.setTexture(bulletKey);
      bullet.setActive(true).setVisible(true);

      const pointer = this.input.activePointer;
      const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
      this.physics.velocityFromRotation(angle, 400, bullet.body.velocity);
      bullet.setRotation(angle);
    }
  });

  this.physics.add.overlap(bullets, enemies, handleBulletEnemyCollision, null, this);
  this.physics.add.overlap(player, enemies, (player, enemy) => {
    if (!gameOver) {
      loseLife(this);
      enemy.destroy();
    }
  });

  scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '18px', fill: '#fff' });
  livesText = this.add.text(10, 30, 'Lives: 3', { fontSize: '18px', fill: '#fff' });
  powerText = this.add.text(10, 50, 'Power: white', { fontSize: '18px', fill: '#fff' });

  gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, '', {
    fontSize: '32px',
    fill: '#ff0000'
  }).setOrigin(0.5);

  restartButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, '', {
    fontSize: '24px',
    fill: '#00ffff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 },
    borderRadius: 5
  }).setOrigin(0.5).setInteractive().on('pointerdown', () => restartGame(this));

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
  player.setRotation(angle);

  // Smooth follow with a trailing effect
  const moveSpeed = 0.15;
  const distance = Phaser.Math.Distance.Between(player.x, player.y, pointer.worldX, pointer.worldY);
  const followDistance = Math.min(distance - 20, 100);
  const dx = Math.cos(angle) * followDistance * moveSpeed;
  const dy = Math.sin(angle) * followDistance * moveSpeed;

  player.x += dx;
  player.y += dy;

  if (Phaser.Input.Keyboard.JustDown(keyQ)) {
    activePower = 'white';
    updatePowerText();
  }

  if (Phaser.Input.Keyboard.JustDown(keyE)) {
    activePower = 'dark';
    updatePowerText();
  }

  bullets.children.each(bullet => {
    if (bullet.active && (bullet.y < 0 || bullet.y > this.scale.height || bullet.x < 0 || bullet.x > this.scale.width)) {
      bullet.setActive(false).setVisible(false);
    }
  });

  enemies.children.each(enemy => {
    if (!enemy.active) return;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const speed = 60;
    this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
    enemy.rotation = angle;
  });
}

function spawnRandomEnemy(scene) {
  const type = Phaser.Math.Between(0, 1) === 0 ? 'white' : 'dark';
  const textureKey = `enemy-${type}`;
  const x = Phaser.Math.Between(0, scene.scale.width);
  const y = Phaser.Math.Between(0, scene.scale.height);
  const enemy = scene.physics.add.image(x, y, textureKey);
  enemy.setData('type', type);
  enemy.setCircle(20);
  enemies.add(enemy);

  scene.tweens.add({
    targets: enemy,
    scaleX: { from: 1, to: 1.1 },
    scaleY: { from: 1, to: 0.9 },
    duration: 400,
    yoyo: true,
    repeat: -1
  });
}

function handleBulletEnemyCollision(bullet, enemy) {
  if (enemy.getData('type') === activePower) {
    bullet.setActive(false).setVisible(false);
    enemy.destroy();
    score += 10;
    scoreText.setText('Score: ' + score);
  }
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
  }
}

function restartGame(scene) {
  gameOver = false;
  score = 0;
  lives = 3;

  scoreText.setText('Score: 0');
  livesText.setText('Lives: 3');
  powerText.setText('Power: white');

  gameOverText.setText('');
  restartButton.setText('');

  bullets.clear(true, true);
  enemies.clear(true, true);

  player.setPosition(scene.scale.width / 2, scene.scale.height / 2);
}

function generateCircleTexture(scene, key, radius, color) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(color, 1);
  graphics.fillCircle(radius, radius, radius);
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1d1d1d',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
