export function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[—–]/g, '--')
}
