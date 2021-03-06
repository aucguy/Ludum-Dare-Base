import { getAssets } from './fetchAssets.js';

export function onAssetsLoaded(scene) {}

export function injectIntoPhaser(scene) {
  var assets = getAssets();
  
  for(var name in assets) {
    var asset = assets[name];
    if(asset.type === 'image') { //TODO add all other asset types
      scene.textures.addImage(name, asset.data);
    } else if(asset.type === 'json') {
      scene.game.cache.json.add(name, asset.data);
    } else if(asset.type === 'audio') {
      scene.load.audio(name, asset.url);
    } else {
      console.warn('unknown asset type');
    }
  }
}

export function getAsset(name) {
  return getAssets()[name].data;
}