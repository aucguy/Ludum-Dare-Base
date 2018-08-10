var base = base || {};
var indexlib = indexlib || {};
(function() {
  indexlib.basePath = indexlib.basePath || '';
  indexlib.loadManifests = indexlib.loadManifests || function() {};
  
  var logo;
  var logoLoaded = false;
  
  indexlib.loadManifest = function(path, basePath) {
    base.ajax(path, false, function(request) {
      base.loadAssets(JSON.parse(request.response).items, basePath);
    });
  }
  
  base.indexFunc = function indexFunc(state) {
    indexlib.loadManifests();

    logo = new Image();
    logo.onload = base.external(function() {
      logoLoaded = true;
    });
    logo.src = base.join(indexlib.basePath, 'assets/image/logo.png');
  };

  //configurable render loading screen code
  base.renderLoadingScreen = function(canvasID, loading, loaded) {
    var display = document.getElementById(canvasID);
    if(display === null) return;
    var context = display.getContext('2d');
    if(context === null) return;
    var width = context.canvas.width;
    var height = context.canvas.height;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    if(logoLoaded) {
      context.drawImage(logo, (width - logo.width) / 2, (height - logo.height) / 2);
    }
    context.fillStyle = '#000000';
    context.beginPath();
    context.rect(20, height - 40, width - 40, 20);
    context.stroke();
    context.beginPath();
    context.rect(20, height - 40, (loaded / (loaded + loading)) * (width - 40), 20);
    context.fill();
  };
})();