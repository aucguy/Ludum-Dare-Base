// join from https://gist.github.com/creationix/7435851 and modified
// Joins path segments. Preserves initial "/" and resolves ".." and "."
// Does not support using ".." to go above/outside the root.
// This means that join("foo", "../../bar") will not resolve to "../bar"
function join( /* path segments */ ) {
  // Split the inputs into a list of path commands.
  var parts = [];
  for (var i = 0, l = arguments.length; i < l; i++) {
    parts = parts.concat(arguments[i].split("/"));
  }
  // Interpret the path commands to get the new resolved path.
  var newParts = [];
  for (i = 0, l = parts.length; i < l; i++) {
    var part = parts[i];
    // Remove leading and trailing slashes
    // Also remove "." segments
    if (!part || part === ".") {
      continue;
    }
    // Interpret ".." to pop the last segment
    if (part === "..") {
      if(newParts.length === 0 || newParts[newParts.length - 1] == "..") {
        newParts.push(part);
      } else {
        newParts.pop();
      }
    } else {
      // Push new path segments.
      newParts.push(part);
    }
  }
  // Preserve the initial slash if there was one.
  var initialSlash = false;
  for(i = 0; i < arguments.length; i++) {
    if(arguments[i]) {
      if(arguments[i].startsWith("/") || arguments[i].startsWith("\\")) {
        newParts.unshift("");
      }
      break;
    }
  }
  // Turn back into a single string path.
  return newParts.join("/") || (newParts.length ? "/" : ".");
}
var loading = 0;
var loaded = 0;

function loadAsset(name, location, type) {
  if(type === 'script' || type === 'module') {
    return loadScript(name, location, type);
  } if(type === 'image') {
    return loadImage(name, location);
  } else if(type === 'json') {
    return loadJson(name, location);
  }
}

function loadScript(name, location, type) {
  return new Promise((resolve, reject) => {
    var elem = document.createElement('script');
    elem.type = 'module';
    elem.onload = () => {
      assets[name] = elem;
      loaded++;
      resolve();
    };
    elem.onerror = () => {
      console.error(`could not load ${location}`);
      reject();
    };
    document.head.appendChild(elem);
    elem.src = location;
  });
}

function loadImage(name, location) {
  return new Promise((resolve, reject) => {
    var elem = new Image();
    elem.onload = () => {
      assets[name] = {
        data: elem,
        location,
        type: 'image'
      }
      loaded++;
      resolve();
    };
    elem.onerror = () => {
      console.error(`could not load ${location}`);
      reject();
    };
    elem.src = location;
  });
}

function loadJson(name, location) {
  return fetch(location).then(response => {
    if(!response.ok) {
      throw new Error(`could not load ${location}`);
    }
    return response.text();
  }).then(JSON.parse).then(data => {
    assets[name] = {
      data,
      location,
      type: 'json'
    };
    loaded++;
  });
}

var assets = {};

function loadManifest(url, base) {
  base = base || '';
  loading++;
  return fetch(url).then(response => {
    if(!response.ok) {
      throw(new Error(`could not retrieve manifest ${url}`));
    }
    return response.text();
  }).then(text => {
    loaded++;
    var manifest = JSON.parse(text);
    return Promise.all(manifest.items.map(item => loadAsset(item[0], item[1], item[2])))
  });
}

loadManifest('/node_modules/aucguy-ludum-dare-base/lib/dev/manifest.json')
  .then(() => loadManifest('/src/manifest.json', '/'))
  .then(loadManifest('/assets/manifest.json', '/'))
  .then(() => {
    var elem = document.createElement('script');
    elem.type = 'module';
    elem.innerText = 'import { init } from "/src/main.js"; init()';
    document.head.appendChild(elem);
  });
  
export function getAsset(name) {
  return assets[name].data;
}

export function injectIntoPhaser(game) {
  for(var name in assets) {
    var asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      game.load.cache.addImage(name, asset.location, asset.data);
    /*} else if(asset.type == 'tilemap'){
      load.cache.addTilemap(asset.id, asset.url, asset.data, Phaser.Tilemap.TILED_JSON);
    } else if(asset.type == 'spritesheet') {
      load.cache.addSpriteSheet(asset.id, asset.url, asset.data, asset.extra.frameWidth, asset.extra.frameHeight);
    } else if(asset.type == 'audio') {
      load.cache.addSound(asset.id, asset.url, asset.data, base.hasWebAudio(), !base.hasWebAudio());*/
    } else if(asset.type === 'json') {
      game.load.cache.addJSON(name, asset.url, asset.data);
    }
    /*if(['image', 'spritesheet'].indexOf(asset.type) !== -1 && asset.extra.pixelated){
      load.cache.getBaseTexture(asset.id).scaleMode = Phaser.scaleModes.NEAREST;
    }*/
  }
}