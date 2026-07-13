export function createLogger(scope) {
  return Object.freeze({
    info: (message, context = {}) => write('info', scope, message, context),
    warn: (message, context = {}) => write('warn', scope, message, context),
    error: (message, context = {}) => write('error', scope, message, context)
  });
}
function write(level, scope, message, context) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, scope, message, ...context }));
}
