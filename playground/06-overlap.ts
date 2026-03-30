interface Logger {
  info(msg: string): void;
}

function greet(name: string, logger: Logger): void {
  logger.info(`Greeting ${name}`);
  console.log(`Hello, ${name}!`);

}

function farewell(name: string, logger: Logger): void {
  logger.info(`Farewell ${name}`);
  console.log(`Goodbye, ${name}!`);
}

const logger: Logger = { info: (msg) => console.debug(msg) };
greet("World", logger);
farewell("World", logger);
