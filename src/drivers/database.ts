import * as Sequelize from 'sequelize';

/**
 * A complete set of options for our database driver to use
 */
export interface DatabaseOptions {
    login: {
        database: string;
        username: string;
        password: string;
    };
    orm: Sequelize.Options;
}

/**
 * A class that starts and wraps basic database functionality using Sequelize
 */
export class Database {
    private db: Sequelize.Sequelize;

    /**
     * Construct the basic datbaase object and initialize a connection
     */
    public constructor(ormOptions: DatabaseOptions) {
        this.db = new Sequelize.Sequelize(
            ormOptions.login.database,
            ormOptions.login.username,
            ormOptions.login.password,
            ormOptions.orm,
        );
    }

    /**
     * Return the sequelize connection directly
     */
    public connection(): Sequelize.Sequelize {
        return this.db;
    }

    /**
     * From what has been initialized already, pull the model from the database object
     * This can work across multiple modules at runtime
     * @param modelName The name of the model specified by the factory
     */
    public model<T1 extends typeof Sequelize.Model>(modelName: string): T1 {
        if (typeof this.db.models[modelName] !== 'undefined') {
            return this.db.model(modelName) as T1;
        } else {
            throw 'Model: ' + modelName + ' not  found';
        }
    }
}

export default Database;
