import { Phaser } from '/build/lib/phaser.js';
import { getAssets } from '/node_modules/aucguy-ludum-dare-base/lib/common/bootstrap.js';

/**
 * gives Phaser classes names for extending them
 */
function init() {
  var names = Object.getOwnPropertyNames(Phaser);
  for(var i=0; i<names.length; i++) {
    var name = names[i];
    var value = Phaser[name];
    if(value instanceof Function && value.prototype)
      value.prototype.__name__ = name;
  }
}

/**
 * extends a class. Super methods are called method$Parent
 * @param parents the constructors of the parent classes
 * @param className the name of the class to create
 * @param sub the properties of the extended classes prototype
 */
function extend(parents, className, sub) {
  if(!(parents instanceof Array)) {
    parents = [parents];
  }
  var proto = Object.create(parents[0].prototype);
  var names, name, value, i;
  // copying parent attributes
  for (i = parents.length-1; i >= 0; i--) {
    var parent = parents[i];
    names = Object.getOwnPropertyNames(parent.prototype);
    for (var k = 0; k<names.length; k++) {
        name = names[k];
        if(name == "__proto__") continue;
        value = Object.getOwnPropertyDescriptor(parent.prototype, name);
        Object.defineProperty(proto, name, value);
        if (parent.prototype.__name__ && name.indexOf("$") == -1) {
          var extName = name + "$" + parent.prototype.__name__;
          Object.defineProperty(proto, extName, value);
        }
     }
  }

  proto.__name__ = className; // needed for child classes
  proto["is$" + className] = true;

  names = Object.getOwnPropertyNames(sub);
  for (i=0; i<names.length; i++) { // copying new attributes
    name = names[i];
    value = sub[name];
    if(value === null || value === undefined) {
      proto[name] = value;
    } else if(value.__factoryAttr__) {
      value(proto, name);
    } else {
      proto[name] = value;
    }
  }

  if(!proto.hasOwnProperty('constructor')) {
    proto.constructor = function() {
      for(var i=0; i<parents.length; i++) {
        parents[i].apply(this, arguments);
      }
    };
  }

  if(proto.constructor.create === undefined) {
    proto.constructor.create = function() {
      return create(proto.constructor, undefined, arguments);
    };
  }

  proto.constructor.prototype = proto; // setting constructor prototype
  return proto.constructor;
}

/**
 * creates a canvas with the specified width and height
 */
function createCanvas(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

var xmlParser = new DOMParser();

function peek(x) {
  return x[x.length - 1];
}

/**
 * intial state used to inject assets
 */
var BootScene = extend(Phaser.Scene, 'BootScene', {
  constructor: function BootScene() {
    Phaser.Scene.call(this);
    this.preloaded = false;
  },
  preload: function preload() {
    if(!this.preloaded) {
      injectIntoPhaser(this);
      this.preloaded = true;
    }
  },
  create: function create() {
    this.cameras.main.backgroundColor = Phaser.Display.Color.GetColor(0, 0, 0);
    var arrowKeys = [
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN
    ];
    window.addEventListener('keydown', function(event) {
      if(arrowKeys.indexOf(event.keyCode) != -1) {
        event.preventDefault();
      }
    });
  }
});

function getAsset(name) {
  return getAssets()[name].data;
}

function injectIntoPhaser(scene) {
  var assets = getAssets();
  var name;
  
  if('$imageAtlasTexture' in assets && '$imageAtlasLayout' in assets) {
    var texture = assets['$imageAtlasTexture'];
    var layout = assets['$imageAtlasLayout'];
    
    for(var item of layout.data.items) {
      var canvas = createCanvas(item.width, item.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(texture.data, -item.x, -item.y);
      scene.textures.addImage(item.name, canvas);
      assets[item.name] = canvas;
    }
  }
  
  for(name in assets) {
    if(!['$imageAtlasTexture', '$imageAtlasLayout'].includes(name)) {
      var asset = assets[name];
      if(asset.type === 'image') { //TODO add all other asset types
        scene.textures.addImage(name, asset.data);
      } else if(asset.type === 'json') {
        scene.game.cache.json.add(name, asset.data);
      }
    }
  }
}

init();

export {
  extend,
  createCanvas,
  xmlParser,
  BootScene,
  getAsset
};
