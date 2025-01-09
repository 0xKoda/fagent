/**
 * Job Scheduler
 * Manages scheduled tasks and periodic jobs specific to this application:
 * - Executes SARA's scheduled tweets
 * - Runs periodic financial analysis
 * - Manages ETF flows analysis timing
 */

import { Agent } from '../core/agent';
import { Logger } from '../core/logger';
import type { Env, ScheduledEvent } from '../core/types';
import { ScheduledJobs } from './scheduled';

export class Scheduler {
    private env: Env;
    private agent: Agent;
    private jobs: ScheduledJobs;

    constructor(env: Env) {
        this.env = env;
        this.agent = new Agent(env);
        this.jobs = new ScheduledJobs(this.agent, env);
    }

    async handleScheduledEvent(event: ScheduledEvent) {
        Logger.info('Handling scheduled event:', event);

        const hour = new Date(event.scheduledTime).getUTCHours();
        const minute = new Date(event.scheduledTime).getUTCMinutes();

        try {
            // // Run SARA tweet at 12:30 UTC
            // if (hour === 12 && minute === 30) {
            //     await this.jobs.runSaraScheduledTweet();
            // }


        } catch (error) {
            Logger.error('Error in scheduled job:', error);
        }
    }
}
