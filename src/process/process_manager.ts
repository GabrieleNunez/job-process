import Database from '../drivers/database';
import Models from '../core/models';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process as ProcessModel, ProcessFactory } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel, ProcessJobLogFactory } from '../models/process_job_log';

/**
 * Process Manager is the main class that should be used when dealing with the process cache
 */
export class ProcessManager {
    protected processList: { [processName: string]: ProcessModel };
    protected caches: { [processName: string]: { [jobName: string]: ProcessCacheModel } };
    protected database: Database;

    /** Construct our process manager. This does not do any database loading. Please use .load to load in information from the database */
    public constructor(database: Database) {
        this.processList = {};
        this.caches = {};
        this.database = database;
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
     * get the process specified by name
     */
    public getProcess(processName: string): Promise<ProcessModel | null> {
        return new Promise(
            async (resolve): Promise<void> => {
                // if we don't already have this process cached, go ahead and pull it from the database
                if (typeof this.processList[processName] == 'undefined') {
                    let process: ProcessModel | null = await this.database
                        .model<typeof ProcessModel>(Models.Process)
                        .findOne({
                            where: {
                                name: processName,
                            },
                        });

                    if (process !== null) {
                        this.processList[processName] = process;
                        this.caches[processName] = {}; // create a placeholder for our process cache
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(this.processList[processName]);
                }
            },
        );
    }
}

export default ProcessManager;
