export function resolveApiBase(location = window.location) {
  const hostname = location?.hostname || 'localhost';
  const protocol = location?.protocol || 'http:';

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return 'http://localhost:3001/api';
  }

  const apiHost = hostname === 'api.dieta.upacentral.co.uk'
    ? 'api.dieta.upacentral.co.uk'
    : 'api.dieta.upacentral.co.uk';

  return `${protocol}//${apiHost}/api`;
}
