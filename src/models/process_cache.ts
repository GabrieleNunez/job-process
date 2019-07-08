import ModelFactory from '../core/factory';
import { Process } from './process';
import { ProcessJob } from './process_job';
import * as Sequelize from 'sequelize';

export class ProcessCache extends Sequelize.Model {
    public id!: number;
    public process!: number;
    public job!: number;
    public machine!: number;
    public key!: string;
    public value!: string;
    public createdAt!: number;
    public updatedAt!: number;

    public readonly parentProcess?: Process;
    public readonly parentJob?: ProcessJob;

    public static associations: {
        parentProcess: Sequelize.Association<Process, ProcessCache>;
        parentJob: Sequelize.Association<Process, ProcessCache>;
    };
}

export const ProcessCacheAttributeDefinition: Sequelize.ModelAttributes = {
    id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    process: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    job: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    machine: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    key: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    value: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
    },
    createdAt: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    updatedAt: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
};

export class ProcessCacheFactory extends ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        ProcessCache.init(ProcessCacheAttributeDefinition, {
            sequelize: sequelize,
            modelName: 'process_cache',
            tableName: 'process_cache',
            timestamps: false,
        });
    }
}

export default ProcessCacheFactory;
