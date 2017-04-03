var base = base || {};
(function() {
  var logo;
  var logoLoaded = false;

  base.indexFunc = function indexFunc(state) {
    var assets = [];
    /*
    example:
      var assets = [
        ['image/tiles',         'assets/image/tiles.png',       'spritesheet', {
          frameWidth: 32,
          frameHeight: 32,
          pixelated: true
        }],
        ['program/level1',      'assets/program/level1.sbl',    'text'],
        ['level/level1',        'assets/level/level1.json',     'tilemap'],
      ];
    */
    var ldBaseDir = '/* @echo ldBaseDir *//';
    /* *@if dev */
    base.loadAssets(assets.concat([
      ['scripts/phaser', ldBaseDir + 'lib/phaser/v2/build/phaser.js', 'script'],
      ['scripts/canvg', ldBaseDir + 'lib/canvg/canvg.js', 'script'],
      ['scripts/rgbcolor', ldBaseDir + 'lib/canvg/rgbcolor.js', 'script'],
      ['scripts/stackblur', ldBaseDir + 'lib/canvg/StackBlur.js', 'script'],
      ['scripts/phaserInjector', ldBaseDir + 'lib/basejs/src/injectors/phaserInjector.js', 'script'],
      ['scripts/statemachine', ldBaseDir + 'lib/javascript-state-machine/state-machine.js', 'script'],

      ['scripts/main', ldBaseDir + 'src/main.js', 'script'],
      ['scripts/gui', ldBaseDir + 'src/gui.js', 'script'],
      ['scripts/util', ldBaseDir + 'src/util.js', 'script'],

      ['scripts/index', 'src/index.js', 'script'],
      ['scripts/app', 'src/app.js', 'script']
    ]), '/* @echo base */');
    if(false) {
      /* *@endif */
      /* *@if rel */
      base.loadAssets(assets.concat([
        ['scripts/app', 'app.min.js', 'script']
      ]));
      /* *@endif */
      /* *@if dev */
    }
    /* *@endif */

    logo = new Image();
    logo.onload = base.external(function() {
      logoLoaded = true;
    });
    logo.src = 'assets/image/logo.png';
  };

  //configurable render loading screen code
  base.renderLoadingScreen = function(canvasID, loading, loaded) {
    var display = document.getElementById(canvasID);
    if(display === null) return;
    var context = display.getContext('2d');
    if(context === null) return;
    var width = context.canvas.width;
    var height = context.canvas.height;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    if(logoLoaded) {
      context.drawImage(logo, (width - logo.width) / 2, (height - logo.height) / 2);
    }
    context.fillStyle = '#000000';
    context.beginPath();
    context.rect(20, height - 40, width - 40, 20);
    context.stroke();
    context.beginPath();
    context.rect(20, height - 40, (loaded / (loaded + loading)) * (width - 40), 20);
    context.fill();
  };
})();