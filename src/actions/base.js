/**
 * Base class for creating new actions
 */

export class Action {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.env = null; // Will be set by Agent
  }

  setEnv(env) {
    this.env = env;
    return this;
  }

  shouldExecute(text) {
    return false; // Base implementation always returns false
  }

  async execute({ text, author }) {
    throw new Error('Action must implement execute method');
  }
}
