const logger = {
  info: (...args: any[]) => console.log('✅', ...args),
  warn: (...args: any[]) => console.warn('⚠️', ...args),
  error: (...args: any[]) => console.error('❌', ...args),
  debug: (...args: any[]) => process.env.NODE_ENV === 'development' && console.debug('🔍', ...args)
};

export default logger;
