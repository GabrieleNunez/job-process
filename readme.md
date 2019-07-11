# Process Cache

This library is intended for to be utilized as a way to store data between processes/clusters/farms/etc. The idea is any data that is *"expensive"* to get ( any long running operations/calls to external rate limited apis)or is **valuable** and important to keep track of between process runs can be stored here in the database to be recovered or to be recalled at a later point. To put it extremly simply, this library is *primarily* intended for people who run cron jobs and need a way to save data either between executions or need some more advance logging capability. 

## Install
```bash
npm install process-cache
```


## Building
```bash
git clone https://github.com/GabrieleNunez/process-cache.git
cd process-cache
npm install
npm run build
```


## Setup

You must have some form of database driver installed. This library does not force any sort of library into your workflow. The examples however *DO* assume you are connecting to a MySQL Database. This library is powered by Sequelize and is compatible with various dialects and database drivers. This library has only been *officially* tested with mysql2 as a driver for Sequelize. Listed below are some database libraries that should work pretty universally

* [mysql2](https://www.npmjs.com/package/mysql2) 
* [sqlite3](https://www.npmjs.com/package/sqlite3)
* [node-postgres](https://www.npmjs.com/package/pg)

Additionally you must have some way to synchronize the models to your database. Here is an example of how it looks to synchronize using TypeScript

**sync.ts**
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


## How to Use

Below you will find an example of how to use this library

**index.ts**
```typescript
import { Database, ProcessLogTypes, Job, ProcessJobLog, ProcessCache } from 'process-cache';
import ProcessCacheDatabase from 'process-cache';

class HelloWorldJob extends Job {
    /**
     * Construct our hello world job
     * @param database
     * @param machineName
     */
    public constructor(database: Database, machineName: string) {
        super(database, 'example', 'hello-world', machineName);
    }

    /**
     * This is only called when there are no cache values present
     */
    protected onCacheEmpty(): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                await this.createLog('Cache is empty and fresh');
                resolve();
            },
        );
    }

    /**
     * This is only called when some kind of cache value is present
     */
    protected onCacheExist(): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                await this.createLog('Cache does exist');

                // when the cache does exist, internally a tree is created that represents the cache
                // you can access it in a couple ways

                // this.cacheTree is the most direct way
                // this.cacheTree[key] = ProcessCache[]
                // this is how you would loop over it
                for (var i = 0; i < this.cacheTree['foo'].length; i++) {
                    console.log(this.cacheTree['foo'][i].value);
                }

                // there is also this.cacheResults, which is simply the format of { [cacheDatabaseId: number] : ProcessCache }
                for (var cacheDatabaseId in this.cacheResults) {
                    let cache = this.cacheResults[cacheDatabaseId];
                    console.log(cache.value);
                }

                // if for some reason you ever need to rebuild the tree
                // doing the following this.syncCache() will rebuild the tree and results

                resolve();
            },
        );
    }

    /**
     * Wraps the parent createLog function, in addition to sending out to the database for logging, we log to the console window
     * @param message The message we want to log
     * @param logType The kind of log we are looking to make
     */
    public createLog(message: string, logType: ProcessLogTypes = ProcessLogTypes.Generic): Promise<ProcessJobLog> {
        switch (logType) {
            case ProcessLogTypes.Generic:
                console.log(message);
                break;
            case ProcessLogTypes.Warning:
                console.warn(message);
                break;
            case ProcessLogTypes.Error:
                console.error(message);
                break;
            default:
                console.log(message);
                break;
        }
        return super.createLog(message, logType);
    }

    public run(): Promise<void> {
        return new Promise(
            async (resolve): Promise<void> => {
                await this.createLog('Operation running');

                await this.createLog('This is an example warning log', ProcessLogTypes.Warning);
                await this.createLog('This is what an error looks like', ProcessLogTypes.Error);

                let hasCache: boolean = await this.hasCache();
                if (hasCache) {
                    await this.createCache('foo', 'bar');
                    await this.createLog('Created value "bar" at key "foo" in cache');
                } else {
                    await this.createCache('foo', 'nope');
                    await this.createLog('Created value "nope" at key "foo" in cache');
                }

                resolve();
            },
        );
    }
}

/**
 * Run our job and then simply dispose of our connection
 */
async function Main(): Promise<void> {
    console.log('Database details');

    // creates a database connection to our process cache
    let database: Database = ProcessCacheDatabase.createConnection({
        login: {
            database: 'databasehere',
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

    console.log('Constructing hello world');
    let helloWorldJob: HelloWorldJob = new HelloWorldJob(database, 'desktop-main');
    
    console.log('Loading hello world job');
    await helloWorldJob.load();
    
    console.log('Running job');
    await helloWorldJob.run();

    // close out the database connection before we exit
    console.log('Closing database connection');
    await database.dispose();
}

Main();
```