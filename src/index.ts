import { Database, DatabaseOptions } from './drivers/database';
import ProcessCacheFactory from './models/process_cache';
import ProcessFactory from './models/process';
import ProcessJobFactory from './models/process_job';
import ProcessJobLogFactory from './models/process_job_log';

export * from './process/job';
export * from './process/machine';
export * from './process/process_manager';
export * from './core/process_log_types';
export * from './drivers/database';
export * from './models/process';
export * from './models/process_cache';
export * from './models/process_job';
export * from './models/process_job_log';

/**
 * Possible sync options for the database sync option
 */
export enum ProcessCacheDatabaseSyncOption {
    New,
    Alter,
}

/**
 * Helper class designed to help external callers get setup to their process cache database
 */
export abstract class ProcessCacheDatabase {
    public static createConnection(options: DatabaseOptions): Database {
        return new Database(options);
    }

    /**
     * Creates the database and all models together
     * @param database the database connection we are connected to
     */
    public static sync(
        database: Database,
        syncOption: ProcessCacheDatabaseSyncOption,
        logging: boolean = false,
    ): Promise<void> {
        // init all models
        ProcessFactory.init(database.connection());
        ProcessJobFactory.init(database.connection());
        ProcessJobLogFactory.init(database.connection());
        ProcessCacheFactory.init(database.connection());

        // associate all models
        ProcessFactory.associate();
        ProcessJobFactory.associate();
        ProcessJobLogFactory.associate();
        ProcessCacheFactory.associate();

        return new Promise((resolve): void => {
            database
                .connection()
                .sync({
                    alter: syncOption === ProcessCacheDatabaseSyncOption.Alter ? true : false,
                    force: syncOption === ProcessCacheDatabaseSyncOption.New ? true : false,
                    logging: logging,
                })
                .then((): void => {
                    resolve();
                });
        });
    }
}

export default ProcessCacheDatabase;
