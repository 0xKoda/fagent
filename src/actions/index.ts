import { Action } from './base';
// Register actions here from /actions
// import { FinancialAnalysisAction } from './financial';

// Register action
const actions: Record<string, Action> = {
  // financial: new FinancialAnalysisAction()
};

export function loadActions(): Record<string, Action> {
  return actions;
}
