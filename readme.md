# Process Cache



## Setup

You must have some form of database driver installed. This library does not force any sort of library into your workflow. The examples however *DO* assume you are connecting to a MySQL Database. This library is powered by Sequelize and is compatible with various dialects and database drivers. This library has only been *officially* tested with mysql2 as a driver for Sequelize. Listed below are some database libraries that should work pretty universally

* [mysql2](https://www.npmjs.com/package/mysql2) 
* [sqlite3](https://www.npmjs.com/package/sqlite3)
* [node-postgres](https://www.npmjs.com/package/pg)

Additionally you must have some way to synchronize the models to your database. Here is an example of how it looks to synchronize 

```typescript
/** 
 * This script is only an example just so you can get the gist of how to set this up. 
 * Running this example will make you lose all the database related to the tables that the model uses.
 */
import { ProcessCacheDatabase, ProcessCacheDatabaseSyncOption } from 'process-cache';

/**
 * Sync the database tables. WARNING THIS WILL COMPLETELY drop the related tables if they exist already
 */
async function Main(): Promise<void> {
    console.log('Creating database connection');
    let database = ProcessCacheDatabase.createConnection({
        login: {
            database: 'yourdatabasehere',
            username: 'usernamehere',
            password: 'passwordhere',
        },
        orm: {
            dialect: 'mysql',
            port: 3306,
            host: '127.0.0.1',
            logging: false,
        },
    });

    console.log('Creating tables in database');
    await ProcessCacheDatabase.sync(database, ProcessCacheDatabaseSyncOption.New, true);
    console.log('Database Synced');

    console.log('Closing connecting to database');
    await database.dispose();

    console.log('Completed');
}

// synchronize the database
Main();

```