import { Phaser } from '/build/lib/phaser.js';
import { injectIntoPhaser } from '/node_modules/aucguy-ludum-dare-base/lib/common/indexlib.js';

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

function create(constructor, context, args) {
  var obj = Object.create(constructor.prototype);
  obj.context = context;
  constructor.apply(obj, args);
  return obj;
}
var create_ = create;

function contextAttr(proto, name) {
  Object.defineProperty(proto, name, {
    get: new Function("return this.context." + name + ";"),
    set: new Function("x", "this.context." + name + "=x")
  });
}
contextAttr.__factoryAttr__ = true;

var Contextual = extend(Object, 'Contextual', {
  constructor: function Contextual() {
    if(this.context === undefined) {
      this.context = {};
    }
  },
  create: function create(constructor) {
    var ctx = Object.create(this.context);
    ctx.parent = this;
    return create_(constructor, ctx, Array.prototype.slice.call(arguments, 1));
  },
  parent: contextAttr
});

function contextValue(value) {
  function factory(proto, name) {
    proto[name] = value;
  }
  factory.__factoryAttr__ = true;
  return factory;
}

function instance(factory) {
  return {
    create: factory
  };
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

/**
 * does nothing. useful for placeholders
 */
function NOP() {}

function ret(x) {
  return function() {
    return x;
  };
}

/**
 * sets the texture of a sprite from a canvas
 */
function getTextureFromCache(game, key) {
  return PIXI.Texture.fromCanvas(game.cache.getCanvas(key));
}

function equals(x, y) {
  if(x instanceof Array && y instanceof Array) {
    if(x.length == y.length) {
      for(var i=0; i<x.length; i++) {
        if(!equals(x[i], y[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  } else {
    return x == y;
  }
}

var Map = extend(Object, 'Map', {
  constructor: function Map() {
    this.entries = [];
  },
  entry: function entry(key, make) {
    for(var i=0; i<this.entries.length; i++) {
      if(equals(this.entries[i].key, key)) {
        return this.entries[i];
      }
    }
    if(make) {
      var entry = {
        key: key,
        value: null
      };
      this.entries.push(entry);
      return entry;
    }
    return null;
  },
  get: function get(key) {
    var entry = this.entry(key, false);
    return entry ? entry.value : entry;
  },
  put: function put(key, value) {
    this.entry(key, true).value = value;
  },
  contains: function contains(key) {
    return this.entry(key, false) !== null;
  }
});

//TODO figure out what this does
function addGenImg(cache, key, svg, data) {
  var svg = xmlParser.parseFromString(base.getAsset(svg), 'text/xml');
  var target = createCanvas(svg.width, svg.height);

  var names = Object.getOwnPropertyNames(data);
  for(var i=0; i<names.length; i++) {
    var name = names[i];
    var value = data[name];
    var parts = name.split('.');

    var obj = svg.getElementById(parts[0]);
    if(obj === null) continue;

    for(var k=1; k<parts.length-1; k++) {
      obj = obj[parts[k]];
      if(obj === null) break;
    }
    if(obj === null) continue;
    obj[parts[parts.length-1]] = value;
  }
  canvg(target, svg);
  cache.addCanvas(key, target);
}

var xmlParser = new DOMParser();

var bitmapCache = [];

function createBitmap(game, width, height) {
  var bitmap = game.make.bitmapData(width, height);
  bitmapCache.push(bitmap);
  return bitmap;
}

function clearBitmapCache() {
  for(var i=0; i<bitmapCache.length; i++) {
    bitmapCache[i].destroy();
  }
  bitmapCache = [];
}

function normalWithAngle(angle) {
  return Phaser.Point.rotate(new Phaser.Point(1, 0), 0, 0, angle).normalize();
}

function centerSprite(sprite) {
  sprite.anchor.x = 0.5;
  sprite.anchor.y = 0.5;
}

//the line has one point in common with the circle's center
function lineCircleIntersect(line, center, radius) {
  var vector = Phaser.Point.subtract(line, center).normalize();
  vector = Phaser.Point.multiply(vector, new Phaser.Point(radius, radius));
  vector = Phaser.Point.add(vector, center);
  return vector;
}

function walkSprites(sprite, callback) {
  callback(sprite);
  if(sprite instanceof Phaser.Group) {
    for(var i=0; i<sprite.children.length; i++) {
      walkSprites(sprite.children[i], callback);
    }
  }
}

var clonerMatrix = new Phaser.Matrix();
function cloneMatrix(matrix) {
  return clonerMatrix.clone(matrix);
}

//TODO remove when upgrading to Phaser 3
var Viewport = extend(Object, 'Viewport', {
  constructor: function Viewport(parent, onUpdate, x, y, width, height, camera) {
    this.game = parent.game;
    this.camera = camera;
    this.container = this.game.add.group();
    this.container.visible = false;
    this.group = this.game.add.group(this.container);
    this.texture = this.game.make.renderTexture(width, height);
    this.sprite =  this.game.add.sprite(x, y, this.texture, undefined, parent);
    onUpdate.add(this.update, this);
  },
  update: function update() {
    var point = this.camera.getPoint(this);
    var tilelayerSprites = [];
    walkSprites(this.group, function(sprite) {
      sprite.tmpWorldTransform = cloneMatrix(sprite.worldTransform);
      if(sprite instanceof Phaser.Sprite) {
        sprite.animations.update(); //thinks the sprite is invisible and doesn't update by itself
      }
      if(sprite instanceof Phaser.TilemapLayer) {
        sprite.tmpVisible = sprite.visible;
        sprite.tmpFixedToCamera = sprite.fixedToCamera;
        sprite.fixedToCamera = false;
      
        //for some reason replacing inlining the code for sprite.renderFull works,
        //but calling sprite.renderFull doesn't
        var scrollX = -point.x;
        var scrollY = -point.y;

        var renderW = sprite.canvas.width;
        var renderH = sprite.canvas.height;

        var tw = sprite._mc.tileWidth;
        var th = sprite._mc.tileHeight;

        var left = Math.floor(scrollX / tw);
        var right = Math.floor((renderW - 1 + scrollX) / tw);
        var top = Math.floor(scrollY / th);
        var bottom = Math.floor((renderH - 1 + scrollY) / th);
        
        sprite.context.clearRect(0, 0, renderW, renderH);
        sprite.renderRegion(-point.x, -point.y, left, top, right, bottom);
        sprite.visible = false;
        
        sprite.texture.baseTexture.dirty();
        tilelayerSprites.push({
          tilelayer: sprite,
          sprite: this.game.make.sprite(scrollX, scrollY, sprite.texture),
          parent: sprite.parent
        });
      }
    }.bind(this));
    for(var i=0; i<tilelayerSprites.length; i++) {
      var ts = tilelayerSprites[i];
      ts.parent.add(ts.sprite, undefined, ts.parent.getChildIndex(ts.tilelayer));
    }
    this.texture.renderXY(this.group, point.x, point.y, true);
    for(var i=0; i<tilelayerSprites.length; i++) {
      var ts = tilelayerSprites[i];
      ts.parent.remove(ts.sprite);
    }
    walkSprites(this.group, function(sprite) {
      sprite.worldTransform = sprite.tmpWorldTransform;
      delete sprite.tmpWorldTransform;
      if(sprite instanceof Phaser.Sprite) {
        sprite.fresh = true;
      }
      if(sprite instanceof Phaser.TilemapLayer) {
        sprite.visible = sprite.tmpVisible;
        sprite.fixedToCamera = sprite.tmpFixedToCamera;
        delete sprite.tmpVisible;
        delete sprite.tmpFixedToCamera;
      }
    });
  }
});

var Camera = extend(Object, 'Camera', {
  constructor: function() {
  },
  getPoint: function getPoint() {
    throw(new Error('abstract method'))
  }
});

var FollowCamera = extend(Camera, 'FollowCamera', {
  constructor: function FollowCamera(sprite) {
    this.sprite = sprite === undefined ? null : sprite;
  },
  follow: function follow(sprite) {
    this.sprite = sprite;
  },
  getPoint: function getPoint(viewport) {
    return new Phaser.Point(-this.sprite.position.x + viewport.texture.width / 2,
      -this.sprite.position.y + viewport.texture.height / 2);
  }
});

function peek(x) {
  return x[x.length - 1];
}

var ExtendableUint8Array = extend(Object, ExtendableUint8Array, {
  constructor: function ExtendableUint8Array() {
    this.partSize = 1024;
    this.current = new Uint8Array(this.partSize);
    this.index = 0;
    this.filled = [];
  },
  appendByte: function appendByte(x) {
    if(this.index >= this.current.length) {
      this.filled.push(this.current);
      this.current = new Uint8Array(this.partSize);
    }
    this.current[this.index++] = x;
  },
  appendShort: function appendShort(x) {
    this.appendByte(x >> 8);
    this.appendByte(x & 255);
  },
  setByte: function setByte(i, x) {
    var filledSize = this.filled.length * this.partSize;
    if(i < filledSize){
      this.filled[Math.floor(i / this.partSize)][i % this.partSize] = x;
    } else {
      this.current[i - filledSize] = x;
    }
  },
  setShort: function setShort(i, x) {
    this.setByte(i, x >> 8);
    this.setByte(i + 1, x & 255);
  },
  length: function length() {
    return this.filled.length * this.partSize + this.index;
  },
  compress: function compress() {
    var ret = new Uint8Array(this.length());
    var filledSize = this.filled.length * this.partSize;
    var i;
    for(i=0; i<this.filled.length; i++) {
      ret.set(this.filled[i], i * this.partSize);
    }
    for(i=0; i<this.index; i++) {
      ret[filledSize + i] = this.current[i];
    }
    return ret;
  }
});

function removeLoadingScreen(config) {
  var display = document.getElementById('display');
  display.parentElement.removeChild(display);
}

/**
 * intial state used to inject assets
 */
var BootState = extend(Phaser.State, 'BootState', {
  preload: function preload() {
    injectIntoPhaser(this.game);
  },
  create: function create() {
    //necessary?
    /*var names = Object.getOwnPropertyNames(this.cache._cache.sound);
    for(var i=0; i<names.length; i++) {
      this.main.game.sound.decode(names[i]);
      this.main.sounds[names[i]] = this.main.game.sound.add(names[i]);
    }*/

    this.stage.backgroundColor = '#000000';
    var arrowKeys = [
      Phaser.KeyCode.LEFT,
      Phaser.KeyCode.RIGHT,
      Phaser.KeyCode.UP,
      Phaser.KeyCode.DOWN
    ];
    window.addEventListener('keydown', function(event) {
      if(arrowKeys.indexOf(event.keyCode) != -1) {
        event.preventDefault();
      }
    });
  }
});

init();

export {
  extend,
  Contextual,
  contextAttr,
  contextValue,
  instance,
  createCanvas,
  xmlParser,
  NOP,
  ret,
  addGenImg,
  getTextureFromCache,
  Map,
  createBitmap,
  clearBitmapCache,
  normalWithAngle,
  centerSprite,
  lineCircleIntersect,
  Viewport,
  Camera,
  FollowCamera,
  peek,
  ExtendableUint8Array,
  removeLoadingScreen,
  BootState
};
