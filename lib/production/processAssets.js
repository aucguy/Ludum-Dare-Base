var assets = @@ASSETS@@;
var textureAtlasLayout = @@TEXTURE_ATLAS_LAYOUT@@;

var urls = [];

export function onAssetsLoaded(scene) {
  for(var url of urls) {
    URL.revokeObjectURL(url);
  }
  
  for(var name in assets) {
    var asset = assets[name];
    if(asset.isSvg) {
      asset.data = scene.textures.get(name);
    }
  }
}

export function injectIntoPhaser(scene) {
  var textureAtlasImage = window.ldGetTextureAtlasImage();
  var name;
  
  for(name in assets) {
    let asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      var blob = new Blob([asset.text], { type: 'image/svg+xml' });
      var url = URL.createObjectURL(blob);
      scene.load.svg(name, url);
      urls.push(url);
      asset.isSvg = true;
    } else if(asset.type === 'json') {
      scene.game.cache.json.add(name, asset.data);
    }
  }
  
  if(textureAtlasLayout !== null && textureAtlasImage !== null) {
    for(name in textureAtlasLayout) {
      var item = textureAtlasLayout[name];
      var canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      
      var ctx = canvas.getContext('2d');
      ctx.drawImage(textureAtlasImage, -item.x, -item.y);
      scene.textures.addImage(name, canvas);
      assets[name] = {
        type: 'image',
        date: canvas
      };
    }
  }
}

export function getAsset(name) {
  return assets[name].data;
}