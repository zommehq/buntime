export const logger = ({ prefix }: { prefix?: string } = {}) => ({
  info: (message: string) => {
    const prefixStr = prefix ? `[${prefix}] ` : "";
    console.log(`${prefixStr}${message}`);
  },
  error: (message: string) => {
    const prefixStr = prefix ? `[${prefix}] ` : "";
    console.error(`${prefixStr}${message}`);
  },
  warn: (message: string) => {
    const prefixStr = prefix ? `[${prefix}] ` : "";
    console.warn(`${prefixStr}${message}`);
  },
});
