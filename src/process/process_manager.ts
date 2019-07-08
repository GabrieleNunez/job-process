import Database from '../drivers/database';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process, ProcessFactory } from '../models/process';
import { ProcessJob, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog, ProcessJobLogFactory } from '../models/process_job_log';

/**
 * Process Manager is the main class that should be used when dealing with the process cache
 */
export class ProcessManager {
    protected processList: { [processName: string]: Process };
    protected caches: { [processName: string]: { [jobName: string]: ProcessCacheModel } };
    protected database: Database;

    /** Construct our process manager. This does not do any database loading. Please use .load to load in information from the database */
    public constructor(database: Database) {
        this.processList = {};
        this.caches = {};
        this.database = database;
    }

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

            // complete loading
            resolve();
        });
    }
}
