import { Action } from './base';
import type { Env } from '../core/types';

// Register actions here from /actions
// import { FinancialAnalysisAction } from './financial';

let actions: Record<string, Action>;

export function loadActions(env: Env): Record<string, Action> {
  if (!actions) {
    actions = {
      // add actions here
      //financial: new FinancialAnalysisAction(),
    };
  }
  return actions;
}
