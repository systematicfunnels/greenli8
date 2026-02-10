const logger = {
  info: (...args) => console.log('✅', ...args),
  warn: (...args) => console.warn('⚠️', ...args),
  error: (...args) => console.error('❌', ...args),
  debug: (...args) => process.env.NODE_ENV === 'development' && console.debug('🔍', ...args)
};

export default logger;
