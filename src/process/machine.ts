import Database from '../drivers/database';
import { ProcessLogTypes } from '../core/process_log_types';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process as ProcessModel, ProcessFactory } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel, ProcessJobLogFactory } from '../models/process_job_log';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';
import Models from 'core/models';

/**
 * An advanced way to filter through the resultsof the process job log initially
 */
export interface MachineJobLogFilters {
    offset?: number;
    limit?: number;
    type?: string;
}

/**
 * A set of filters that are default.
 */
export const MACHINE_JOB_LOG_FILTERS_DEFAULT: MachineJobLogFilters = {};

/**
 * Handles the machine level process information
 */
export class Machine {
    protected machine: string;
    protected database: Database;
    protected jobList: { [processName: string]: { [jobName: string]: ProcessJobModel } };
    protected caches: { [processId: number]: { [jobId: number]: { [cacheId: number]: ProcessCacheModel } } };
    protected logs: { [processId: number]: { [jobId: number]: { [logId: number]: ProcessJobLogModel } } };
    protected processList: { [processName: string]: ProcessModel };
    /**
     * Construct what represents our machine
     * @param machineName
     */
    public constructor(database: Database, machineName: string) {
        this.machine = machineName;
        this.database = database;
        this.jobList = {};
        this.caches = {};
        this.logs = {};
        this.processList = {};
    }

    /**
     * Trims, cleans and formats the process name into a clean name
     * @param processName
     */
    private formatProcessName(processName: string): string {
        return processName
            .trim()
            .toLowerCase()
            .replace(/[\s\*\,\.\-]+/g, '-') // convert all long spaces,'*',',','.','-' characters into a singular dash '-'
            .trim() // trim the output again just to be sane
            .replace(/[\-]+/g, '-') // take all back to back dashes ('--', '------','--dsa---f-gfg---regre-g') combos and trim it into a single dash '-'
            .trim(); // again just a trim just to be sane
    }

    /**
     * Format the job name. This is functionality equivalent to formatProcessName but might change before stable release
     */
    private formatJobName(jobName: string): string {
        return this.formatProcessName(jobName);
    }

    /**
     * Cache our process if possible
     * @param process The process we want to cache into our system
     */
    private cacheProcess(process: ProcessModel): void {
        if (typeof this.processList[process.name] == 'undefined') {
            this.processList[process.name] = process;
        }

        if (typeof this.caches[process.id] == 'undefined') {
            this.caches[process.id] = {};
        }

        if (typeof this.jobList[process.name] == 'undefined') {
            this.jobList[process.name] = {};
        }

        if (typeof this.logs[process.id] == 'undefined') {
            this.logs[process.id] = {};
        }
    }

    /**
     * Makes sure the job can be cached if possible
     * @param process The process that this job is tied too
     * @param job The job we intend to cache
     */
    private cacheJob(process: ProcessModel, job: ProcessJobModel): void {
        // make sure that our process is already cached, if it is then all good!
        this.cacheProcess(process);
        this.jobList[process.name][job.name] = job;

        if (typeof this.caches[process.id][job.id] == 'undefined') {
            this.caches[process.id][job.id] = {};
        }

        if (typeof this.logs[process.id] == 'undefined') {
            this.logs[process.id] = {};
        }

        if (typeof this.logs[process.id][job.id] == 'undefined') {
            this.logs[process.id][job.id] = {};
        }
    }

    /**
     * Logs the specific log to retrieve later on
     * @param log the log we are intending to cache
     */
    private cacheLog(log: ProcessJobLogModel): void {
        if (typeof this.logs[log.process] == 'undefined') {
            this.logs[log.process] = {};
        }

        if (typeof this.logs[log.process][log.job] == 'undefined') {
            this.logs[log.process][log.job] = {};
        }
        this.logs[log.process][log.job][log.id] = log;
    }

    /**
     * Caches into memory what was stored into the database. This is good for freqeuent accesses
     * @param cacheData The data we want to cache into memory
     */
    private cacheProcessCache(cacheData: ProcessCacheModel): void {
        if (typeof this.caches[cacheData.process] == 'undefined') {
            this.caches[cacheData.process] = {};
        }

        if (typeof this.caches[cacheData.process][cacheData.job] == 'undefined') {
            this.caches[cacheData.process][cacheData.job] = {};
        }

        this.caches[cacheData.process][cacheData.job][cacheData.id] = cacheData;
    }

    /**
     * Pull all logs related to the process
     * @param process The process we want to pull the logs from
     * @param filters An optional parameter. If its included you'll be able to have more advanced filtering capabilities
     * @returns A promise with all the log models upon resolve. Logs are returned in ASCENDING order using createdAt as a reference.
     */
    public getProcessLogs(
        process: ProcessModel,
        filters: MachineJobLogFilters = MACHINE_JOB_LOG_FILTERS_DEFAULT,
    ): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                this.cacheProcess(process);
                let results: ProcessJobLogModel[] = [];

                results = await this.database.model<typeof ProcessJobLogModel>(Models.ProcessJobLog).findAll({
                    where: {
                        process: process.id,
                        machine: this.machine,
                        type: {
                            [Sequelize.Op.in]: filters.type ? [filters.type] : [Object.values(ProcessLogTypes)],
                        },
                    },
                    limit: filters.limit,
                    offset: filters.offset,
                    order: [['createdAt', 'ASC']],
                });
                resolve(results);
            },
        );
    }

    /**
     * Gets all logs related to a specific job
     * @param job The job that we want to pull logs on
     * @param filters An optional parameter. If its included you'll be able to have more advanced filtering capabilities
     * @returns A promise with all the log models upon resolve. Logs are returned in ASCENDING order using createdAt as a reference.
     */
    public getJobLogs(
        job: ProcessJobModel,
        filters: MachineJobLogFilters = MACHINE_JOB_LOG_FILTERS_DEFAULT,
    ): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                let results: ProcessJobLogModel[] = [];

                results = await this.database.model<typeof ProcessJobLogModel>(Models.ProcessJobLog).findAll({
                    where: {
                        process: job.process,
                        job: job.id,
                        machine: this.machine,
                        type: {
                            [Sequelize.Op.in]: filters.type ? [filters.type] : [Object.values(ProcessLogTypes)],
                        },
                    },
                    limit: filters.limit,
                    offset: filters.offset,
                    order: [['createdAt', 'ASC']],
                });

                resolve(results);
            },
        );
    }

    public createLog(
        process: ProcessModel,
        job: ProcessJobModel,
        message: string,
        logType: ProcessLogTypes = ProcessLogTypes.Generic,
    ): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                await this.database.model<typeof ProcessJobLogModel>(Models.ProcessJobLog).create({
                    id: null,
                    process: process.id,
                    job: job.id,
                    type: logType,
                    machine: this.machine,
                    message: message,
                    createdAt: moment().unix(),
                    updatedAt: 0,
                });
                resolve();
            },
        );
    }
}

export default Machine;
