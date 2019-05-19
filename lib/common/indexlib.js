function loadAsset(name, location, type) {
  if(type === 'image') {
    return loadImage(name, location);
  } else if(type === 'json') {
    return loadJson(name, location);
  }
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
  });
}

var assets = {};

function loadManifest(url, base) {
  base = base || '';
  return fetch(url).then(response => {
    if(!response.ok) {
      throw(new Error(`could not retrieve manifest ${url}`));
    }
    return response.text();
  }).then(text => {
    var manifest = JSON.parse(text);
    return Promise.all(manifest.items.map(item => loadAsset(item[0], item[1], item[2])))
  });
}

loadManifest('/assets/manifest.json', '/').then(() => {
  var elem = document.createElement('script');
  elem.type = 'module';
  elem.src = '/node_modules/aucguy-ludum-dare-base/lib/dev/load.js';
  document.head.appendChild(elem);
});
  
export function getAsset(name) {
  return assets[name].data;
}

export function injectIntoPhaser(scene) {
  for(var name in assets) {
    var asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      scene.textures.addImage(name, asset.data);
    } else if(asset.type === 'json') {
      scene.game.cache.json.add(name, asset.data);
    }
  }
}