export function injectIntoPhaser(scene) {
  var textureAtlas = window.ldGetTextureAtlas();
  var assets = window.ldGetAssets();  
  
  if(textureAtlas !== null) {
    for(var item of textureAtlas.layout.items) {
      var canvas = document.createElement('canvas');
      canvas.width = item.width;
      canvas.height = item.height;
      
      var ctx = canvas.getContext('2d');
      ctx.drawImage(textureAtlas.image, -item.x, -item.y);
      scene.textures.addImage(item.name, canvas);
      assets[item.name] = canvas;
    }
  }
  
  
  for(var name in assets) {
    var asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      scene.textures.addImage(name, asset.data);
    } else if(asset.type === 'json') {
      scene.game.cache.json.add(name, asset.data);
    }
  }
}

export function getAsset(name) {
  return window.ldGetAssets()[name].data;
}