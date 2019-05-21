/**
 * sends a request to the server for the given asset
 */
export function ajax(path, arraybuffer, onready, onfail) {
  onfail = onfail || (request => {
    console.warn(`asset ${path} failed to load with a status of ${request.status}`);
  });

  // taken from
  // http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_first
  // and modified
  var request = window.XMLHttpRequest ? new XMLHttpRequest() :
      new ActiveXObject("Microsoft.XMLHTTP");
  request.responseType = arraybuffer ? 'arraybuffer' : 'text';
  request.onreadystatechange = () => {
    if (request.readyState === 4) {
      if (request.status === 200 || request.status === 0) {
        onready(request);
      } else {
        onfail(request);
      }
    }
  };
  request.open("GET", path, true);
  request.send();
}