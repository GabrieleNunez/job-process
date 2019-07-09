import Database from '../drivers/database';
import Models from 'core/models';
import { ProcessLogTypes } from '../core/process_log_types';
import { Process as ProcessModel } from '../models/process';
import { ProcessJob as ProcessJobModel } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel } from '../models/process_job_log';
import { ProcessCache as ProcessCacheModel } from '../models/process_cache';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';
import ProcessManager from './process_manager';

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
    protected processManager: ProcessManager;
    /**
     * Construct what represents our machine
     * @param machineName
     */
    public constructor(database: Database, machineName: string, processManager?: ProcessManager) {
        this.machine = machineName;
        this.database = database;
        if (processManager) {
            this.processManager = processManager;
        } else {
            this.processManager = new ProcessManager(database);
        }
    }

    public load(): Promise<void> {
        return this.processManager.load();
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

    /**
     * Creates a cache value tied to the process, job and this machine
     * @param process The process we want to tie to
     * @param job The Job we want to tie to
     * @param key The key of the value we want to tie to
     * @param value The value that we are trying to store
     */
    public createCache(process: ProcessModel, job: ProcessJobModel, key: string, value: string): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                await this.database.model<typeof ProcessCacheModel>(Models.ProcessCache).create({
                    id: null,
                    process: process.id,
                    job: job.id,
                    machine: this.machine,
                    key: key,
                    value: value,
                    createdAt: moment().unix(),
                    updatedAt: 0,
                });
                resolve();
            },
        );
    }

    /**
     * Gets all the cache values stored at the specific key tied to this machine matching the process and job
     * @param process The process that our cache is tied too
     * @param job The job that our cache is tied too
     * @param key The key that this is tied too
     */
    public getCache(process: ProcessModel, job: ProcessJobModel, key: string): Promise<ProcessCacheModel[]> {
        return new Promise(
            async (resolve): Promise<void> => {
                let results: ProcessCacheModel[] = [];
                results = await this.database.model<typeof ProcessCacheModel>(Models.ProcessCache).findAll({
                    where: {
                        process: process.id,
                        job: job.id,
                        machine: this.machine,
                        key: key,
                    },
                    order: [['createdAt', 'ASC']],
                });
                resolve(results);
            },
        );
    }

    /**
     * Determines if a key exist in the cache for this machine
     * @param process THe process that this cache value is tied too
     * @param job The job that we are looking into
     * @param key The key we want to retrieve
     */
    public hasCacheKey(process: ProcessModel, job: ProcessJobModel, key: string): Promise<boolean> {
        return new Promise(
            async (resolve): Promise<void> => {
                let result = false;

                let foundResult: number = await this.database
                    .model<typeof ProcessCacheModel>(Models.ProcessCache)
                    .count({
                        where: {
                            process: process.id,
                            job: job.id,
                            key: key,
                            machine: this.machine,
                        },
                    });
                result = foundResult > 0 ? true : false;
                resolve(result);
            },
        );
    }

    /**
     * Determines if a cache exist at all for the current machine
     * @param process The process we want to look into
     * @param job The job we want to look into
     */
    public hasCache(process: ProcessModel, job: ProcessJobModel): Promise<boolean> {
        return new Promise(
            async (resolve): Promise<void> => {
                let result = false;

                let foundResult: number = await this.database
                    .model<typeof ProcessCacheModel>(Models.ProcessCache)
                    .count({
                        where: {
                            process: process.id,
                            job: job.id,
                            machine: this.machine,
                        },
                    });

                result = foundResult > 0 ? true : false;
                resolve(result);
            },
        );
    }
}

export default Machine;
