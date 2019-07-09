import Database from '../drivers/database';
import { ProcessLogTypes } from '../core/process_log_types';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process as ProcessModel, ProcessFactory } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel, ProcessJobLogFactory } from '../models/process_job_log';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';

/**
 * Process Manager is the main class that should be used when dealing with the process cache
 */
export class ProcessManager {
    protected processList: { [processName: string]: ProcessModel };
    protected jobList: { [processName: string]: { [jobName: string]: ProcessJobModel } };
    protected caches: { [processName: string]: { [jobName: string]: ProcessCacheModel } };
    protected database: Database;

    /** Construct our process manager. This does not do any database loading. Please use .load to load in information from the database */
    public constructor(database: Database) {
        this.processList = {};
        this.caches = {};
        this.database = database;
        this.jobList = {};
    }

    /**
     * Initiate models and associate all models together
     */
    public load(): Promise<void> {
        return new Promise((resolve): void => {
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

        if (typeof this.caches[process.name] == 'undefined') {
            this.caches[process.name] = {};
        }

        if (typeof this.jobList[process.name] == 'undefined') {
            this.jobList[process.name] = {};
        }
    }

    private cacheJob(process: ProcessModel, job: ProcessJobModel): void {
        // make sure that our process is already cached, if it is then all good!
        this.cacheProcess(process);
        this.jobList[process.name][job.name] = job;
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
     * @param logType An optional parameter. If its included, you'll only receive the specific type of log
     * @returns A promise with all the log models upon resolve. Logs are returned in ASCENDING order using createdAt as a reference.
     */
    public getProcessLogs(process: ProcessModel, logType?: ProcessLogTypes): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                this.cacheProcess(process);
                let results: ProcessJobLogModel[] = [];

                results = await ProcessJobLogModel.findAll({
                    where: {
                        process: process.id,
                        type: {
                            [Sequelize.Op.in]: logType ? [logType] : [Object.values(ProcessLogTypes)],
                        },
                    },
                    order: [['createdAt', 'ASC']],
                });

                resolve(results);
            },
        );
    }

    /**
     * Gets all logs related to a specific job
     * @param job The job that we want to pull logs on
     * @param logType An optional parameter. If its included you'll only receive the specific type of log in your results
     * @returns A promise with all the log models upon resolve. Logs are returned in ASCENDING order using createdAt as a reference.
     */
    public getJobLogs(job: ProcessJobModel, logType?: ProcessLogTypes): Promise<ProcessJobLogModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                let results: ProcessJobLogModel[] = [];

                results = await ProcessJobLogModel.findAll({
                    where: {
                        process: job.process,
                        job: job.id,
                        type: {
                            [Sequelize.Op.in]: logType ? [logType] : [Object.values(ProcessLogTypes)],
                        },
                    },
                    order: [['createdAt', 'ASC']],
                });

                resolve(results);
            },
        );
    }
}

export default ProcessManager;
