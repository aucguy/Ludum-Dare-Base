import { ajax } from '../common/ajax.js'

export function getManifest(cb) {
  ajax('/assets/manifest.json', false, request => {
    cb(JSON.parse(request.response));
  });
}