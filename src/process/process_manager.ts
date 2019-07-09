import Database from '../drivers/database';
import Models from '../core/models';
import { ProcessCache as ProcessCacheModel, ProcessCacheFactory } from '../models/process_cache';
import { Process as ProcessModel, ProcessFactory } from '../models/process';
import { ProcessJob as ProcessJobModel, ProcessJobFactory } from '../models/process_job';
import { ProcessJobLog as ProcessJobLogModel, ProcessJobLogFactory } from '../models/process_job_log';
import * as moment from 'moment';

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
     * get the process specified by name
     */
    public getProcess(processName: string): Promise<ProcessModel | null> {
        return new Promise(
            async (resolve): Promise<void> => {
                processName = this.formatProcessName(processName);
                // if we don't already have this process cached, go ahead and pull it from the database
                if (typeof this.processList[processName] == 'undefined') {
                    let process: ProcessModel | null = await ProcessModel.findOne({
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
                }
                resolve(process as ProcessModel);
            },
        );
    }
}

export default ProcessManager;
