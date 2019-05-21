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

var xmlParser = new DOMParser();

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

function removeLoadingLogo(config) {
  var loadingLogo = document.getElementById('loadingLogo');
  loadingLogo.parentElement.removeChild(loadingLogo);
}

/**
 * intial state used to inject assets
 */
var BootScene = extend(Phaser.Scene, 'BootScene', {
  preload: function preload() {
    injectIntoPhaser(this);
  },
  create: function create() {
    //necessary?
    /*var names = Object.getOwnPropertyNames(this.cache._cache.sound);
    for(var i=0; i<names.length; i++) {
      this.main.game.sound.decode(names[i]);
      this.main.sounds[names[i]] = this.main.game.sound.add(names[i]);
    }*/

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
  for(var name in assets) {
    var asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      scene.textures.addImage(name, asset.data);
    } else if(asset.type === 'json') {
      scene.game.cache.json.add(name, asset.data);
    }
  }
}

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
  Map,
  peek,
  ExtendableUint8Array,
  removeLoadingLogo,
  BootScene,
  getAsset
};
