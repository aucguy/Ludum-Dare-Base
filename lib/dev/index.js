var indexlib = indexlib || {};
indexlib.basePath = '/';
indexlib.loadManifests = function() {
  indexlib.loadManifest('manifest.json');
  indexlib.loadManifest('/src/manifest.json', '/');
  indexlib.loadManifest('/assets/manifest.json', '/');
}