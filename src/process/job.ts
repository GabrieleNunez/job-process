import Database from '../drivers/database';
import Models from 'core/models';
import ProcessManager from './process_manager';
import Machine from './machine';
import { ProcessLogTypes } from '../core/process_log_types';
import { Process as ProcessModel, Process } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJob } from '../models/process_job';

export class Job {
    protected processManager: ProcessManager;
    protected machine: Machine;
    protected jobName: string;
    protected processName: string;
    protected processJob: ProcessJobModel | null;
    protected process: Process | null;

    /**
     * Construct our basic job class. Make sure to call job.load()
     * @param database The database driver we want to use
     * @param processName The name of the process we are trying to utilze
     * @param jobName The job we are trying to target
     * @param machineName The name of the machine we want to tie too
     */
    public constructor(database: Database, processName: string, jobName: string, machineName: string) {
        this.machine = new Machine(database, machineName);
        this.processManager = new ProcessManager(database);
        this.processName = processName;
        this.jobName = jobName;
        this.process = null;
        this.processJob = null;
    }

    /**
     * Load in any specific data to our process that we should know about
     */
    public load(): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                // load our process and our job directly from the process manager making sure that they are created
                // if they are a new one won't be inserted, the current one will be returned
                this.process = await this.processManager.createProcess(this.processName);
                this.processJob = await this.processManager.createJob(this.process, this.jobName);

                resolve();
            },
        );
    }

    /**
     * Log whatever message/value we want. This is functionally a wrapper that calls machine.createLog
     * @param message The message we are trying to log
     * @param logType The kind of log we want to issue
     */
    public createLog(message: string, logType: ProcessLogTypes = ProcessLogTypes.Generic): Promise<void> {
        return this.machine.createLog(this.process as ProcessModel, this.processJob as ProcessJob, message, logType);
    }
}
