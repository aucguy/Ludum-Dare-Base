(function() {
  function ajax(path, onready) {
    // taken from
    // http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_firstfa
    // and modified
    var request = window.XMLHttpRequest ? new XMLHttpRequest() :
        new ActiveXObject("Microsoft.XMLHTTP");
    request.responseType = 'text';
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        if (request.status == 200 || request.status === 0) {
          onready(request);
        } else {
          throw(new Exception('could not load config.json'));
        }
      }
    };
    request.open("GET", path, true);
    request.send();
  };
  
  ajax('config.json', function(request) {
    var config = JSON.parse(request.response);
    var elem = document.createElement('iframe');
    //give a margin to prevent scrollbars
    elem.width = parseInt(config.width) + 20 + '';
    elem.height = parseInt(config.height) + 20 + '';
    elem.src = 'node_modules/aucguy-ludum-dare-base/lib/dev/index.html';
    document.body.appendChild(elem);
  });
})();