import type { Message, ActionResult, Env } from '../core/types';

export abstract class Action {
  readonly name: string;
  readonly description: string;
  protected env: Env;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  setEnv(env: Env) {
    this.env = env;
  }

  abstract shouldExecute(message: Message): boolean;
  
  abstract execute(message: Message): Promise<ActionResult>;

  protected validateEnv() {
    if (!this.env) {
      throw new Error('Action environment not initialized');
    }
  }
}
