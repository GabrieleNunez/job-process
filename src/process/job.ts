import Database from '../drivers/database';
import Models from 'core/models';
import ProcessManager from './process_manager';
import Machine from './machine';
import { ProcessLogTypes } from '../core/process_log_types';
import { Process as ProcessModel, Process } from '../models/process';
import { ProcessJob as ProcessJobModel } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel } from '../models/process_job_log';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';

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
}
