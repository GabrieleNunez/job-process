import Database from '../drivers/database';
import { ProcessLogTypes } from '../core/process_log_types';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process as ProcessModel, ProcessFactory } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel, ProcessJobLogFactory } from '../models/process_job_log';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';

/**
 * An advanced way to filter through the resultsof the process job log initially
 */
export interface ProcessJobLogFilters {
    offset?: number;
    limit?: number;
    type?: string;
}

/**
 * A set of filters that are default.
 */
export const PROCESS_JOB_LOG_FILTERS_DEFAULT: ProcessJobLogFilters = {};

/**
 * Process Manager is the main class that should be used when dealing with the process cache
 */
export class ProcessManager {
    protected processList: { [processName: string]: ProcessModel };
    protected jobList: { [processName: string]: { [jobName: string]: ProcessJobModel } };
    protected caches: { [processId: number]: { [jobId: number]: { [cacheId: number]: ProcessCacheModel } } };
    protected logs: { [processId: number]: { [jobId: number]: { [logId: number]: ProcessJobLogModel } } };
    protected database: Database;
    protected loadCompleted: boolean;

    /** Construct our process manager. This does not do any database loading. Please use .load to load in information from the database */
    public constructor(database: Database) {
        this.processList = {};
        this.caches = {};
        this.database = database;
        this.jobList = {};
        this.logs = {};
        this.loadCompleted = false;
    }

    /**
     * Initiate models and associate all models together
     */
    public load(): Promise<void> {
        return new Promise((resolve): void => {
            if (this.loadCompleted === false) {
                // initialitze all models
                ProcessFactory.init(this.database.connection());
                ProcessJobFactory.init(this.database.connection());
                ProcessJobLogFactory.init(this.database.connection());
                ProcessCacheFactory.init(this.database.connection());

                // associate all models
                ProcessFactory.associate();
                ProcessJobFactory.associate();
                ProcessJobLogFactory.associate();
                ProcessCacheFactory.associate();

                this.loadCompleted = true;
            }

            resolve();
        });
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
     * get the process specified by name
     */
    public getProcess(processName: string): Promise<ProcessModel | null> {
        return new Promise(
            async (resolve): Promise<void> => {
                // processName = this.formatProcessName(processName);
                // if we don't already have this process cached, go ahead and pull it from the database
                if (typeof this.processList[processName] == 'undefined') {
                    let process: ProcessModel | null = await ProcessModel.findOne({
                        where: {
                            name: processName,
                        },
                    });

                    if (process !== null) {
                        // since we have just pulled this from the database go ahead and add everything into our variables
                        this.cacheProcess(process);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(this.processList[processName]);
                }
            },
        );
    }

    /**
     * Creates a process if it already does not exist
     * @param processName The name of the model.Will be trimmed/cleaned to a specific format
     */
    public createProcess(processName: string): Promise<ProcessModel> {
        return new Promise(
            async (resolve): Promise<void> => {
                // prepare to make a new process model
                // make sure we dont have it already cached
                let process: ProcessModel | null = null;
                processName = this.formatProcessName(processName);
                process = await this.getProcess(processName);
                if (process === null) {
                    process = await ProcessModel.create({
                        id: null,
                        name: processName,
                        createdAt: moment().unix(),
                        updatedAt: 0,
                    });
                    this.cacheProcess(process);
                }
                resolve(process as ProcessModel);
            },
        );
    }

    /**
     * Gets the job tied to the process
     * @param process The process that we are going to use to pull information from
     * @param jobName The name of the job that we want to get
     */
    public getJob(process: ProcessModel, jobName: string): Promise<ProcessJobModel | null> {
        return new Promise(
            async (resolve): Promise<void> => {
                // this is a sanity check for our logic
                // there is no harm in attempting to recache a process
                // this method handles it gracefully
                this.cacheProcess(process);
                let job: ProcessJobModel | null = null;
                if (typeof this.jobList[process.name][jobName] == 'undefined') {
                    // not cached, fetch it from the database if possible
                    job = await ProcessJobModel.findOne({
                        where: {
                            process: process.id,
                            name: jobName,
                        },
                    });
                    if (job !== null) {
                        this.cacheJob(process, job);
                    }
                } else {
                    job = this.jobList[process.name][jobName];
                }

                resolve(job);
            },
        );
    }

    /**
     * Creates a job if possible that is tied to the supplied process
     * @param process
     * @param jobName
     */
    public createJob(process: ProcessModel, jobName: string): Promise<ProcessJobModel> {
        return new Promise(
            async (resolve): Promise<void> => {
                let processJob: ProcessJobModel | null = null;
                jobName = this.formatJobName(jobName);
                processJob = await this.getJob(process, jobName);
                if (processJob === null) {
                    processJob = await ProcessJobModel.create({
                        id: null,
                        process: process.id,
                        name: jobName,
                        createdAt: moment().unix(),
                        updatedAt: 0,
                    });
                    this.cacheJob(process, processJob as ProcessJobModel);
                }

                resolve(processJob as ProcessJobModel);
            },
        );
    }

    /**
     * Pull all logs related to the process
     * @param process The process we want to pull the logs from
     * @param filters An optional parameter. If its included you'll be able to have more advanced filtering capabilities
     * @returns A promise with all the log models upon resolve. Logs are returned in ASCENDING order using createdAt as a reference.
     */
    public getProcessLogs(
        process: ProcessModel,
        filters: ProcessJobLogFilters = PROCESS_JOB_LOG_FILTERS_DEFAULT,
    ): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                this.cacheProcess(process);
                let results: ProcessJobLogModel[] = [];

                results = await ProcessJobLogModel.findAll({
                    where: {
                        process: process.id,
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
        filters: ProcessJobLogFilters = PROCESS_JOB_LOG_FILTERS_DEFAULT,
    ): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                let results: ProcessJobLogModel[] = [];

                results = await ProcessJobLogModel.findAll({
                    where: {
                        process: job.process,
                        job: job.id,
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
     * Gets all the cache values stored at the specific key tied to the specific process and job.
     * This does mean that all cache values returned here are not tied
     * @param process The process that our cache is tied too
     * @param job The job that our cache is tied too
     * @param key The key that this is tied too
     */
    public getCache(process: ProcessModel, job: ProcessJobModel, key: string): Promise<ProcessCacheModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                // make sure our process and job are cached
                this.cacheProcess(process);
                this.cacheJob(process, job);

                // grab results from the cache. Note: this does not tie it to a specific machine
                let results: ProcessCacheModel[] = [];
                results = await ProcessCacheModel.findAll({
                    where: {
                        process: process.id,
                        job: job.id,
                        key: key,
                    },
                    order: [['createdAt', 'ASC']],
                });
                resolve(results);
            },
        );
    }
}

export default ProcessManager;
