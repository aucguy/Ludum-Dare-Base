(function() {
  fetch('config.json').then(response => response.text()).then(text => {
    var config = JSON.parse(text);
    var elem = document.createElement('iframe');
    //give a margin to prevent scrollbars
    elem.width = parseInt(config.width) + 20 + '';
    elem.height = parseInt(config.height) + 20 + '';
    elem.src = 'node_modules/aucguy-ludum-dare-base/lib/dev/index.html';
    document.body.appendChild(elem);
  });
})();