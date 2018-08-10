base.registerModule('gui', function() {
  var util = base.importModule('util');
  
  var Menu = util.extend(Object, 'Menu', {
    constructor: function Menu(assetName, game, x, y, onUpdate, callbacks) {
      this.game = game;
      this.callbacks = callbacks;
      this.sprite = this.game.add.sprite(x, y, null);
      this.sprite.inputEnabled = true;
      
      onUpdate.add(function() {
        this.fabricCanvas.renderAll();
        this.sprite.setTexture(PIXI.Texture.fromCanvas(this.targetCanvas));
      }, this);
      this.game.input.onDown.add(function(pointer) {
        var local = this.sprite.input.globalToLocal(pointer.position);
        //fabric's coordinate system's origin is in the center
        var x = local.x - this.fabricCanvas.getWidth() / 2;
        var y = local.y - this.fabricCanvas.getHeight() / 2;
        this.handleClick(this.fabricCanvas, new fabric.Point(x, y), local);
      }, this);
      
      var svg = util.xmlParser.parseFromString(base.getAsset(assetName), 'text/xml').getElementsByTagName('svg')[0];
      var width = parseInt(svg.getAttribute('width'));
      var height = parseInt(svg.getAttribute('height'));
      this.targetCanvas = util.createCanvas(width, height);
      
      this.fabricCanvas = new fabric.Canvas(this.targetCanvas);
      fabric.loadSVGFromString(base.getAsset(assetName), function(objects, options) {
        this.fabricCanvas.add(fabric.util.groupSVGElements(objects, options)).renderAll();
      }.bind(this));
    },
    handleClick: function handleClick(obj, fabricPoint, phaserPoint) {
      if(!(obj instanceof fabric.StaticCanvas) && obj.containsPoint && obj.containsPoint(fabricPoint)) {
        var id = obj.getSvgId();
        id = id.substring(4, id.length - 2);
        var callback = this.callbacks[id];
        if(callback) {
          callback(obj, phaserPoint);
        }
      }
      if(obj.getObjects) {
        var children = obj.getObjects();
        for(var i=0; i<children.length; i++) {
          this.handleClick(children[i], fabricPoint, phaserPoint);
        }
      }
    }
  });

  return {
    Menu: Menu
  };
});
