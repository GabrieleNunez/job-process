import ModelFactory from '../core/factory';
import Models from '../core/models';
import { Process } from './process';
import { ProcessJobLog } from './process_job_log';
import { ProcessCache } from './process_cache';

import * as Sequelize from 'sequelize';

export class ProcessJob extends Sequelize.Model {
    public id!: number;
    public process!: number;
    public name!: string;
    public createdAt!: number;
    public updatedAt!: number;

    /** The process that this job belongs to */
    public readonly parentProcess?: Process;
    public readonly logs?: ProcessJobLog[];
    public readonly caches?: ProcessCache[];

    /** Any associations to other tables that we want to keep track of or provide functionality for */
    public static associations: {
        parentProcess: Sequelize.Association<Process, ProcessJob>;
        logs: Sequelize.Association<ProcessJobLog, ProcessJob>;
        caches: Sequelize.Association<ProcessCache, ProcessJob>;
    };
}

export const ProcessJobAttributesDefinition: Sequelize.ModelAttributes = {
    id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    },
    process: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
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

export abstract class ProcessJobFactory extends ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        ProcessJob.init(ProcessJobAttributesDefinition, {
            sequelize: sequelize,
            modelName: Models.ProcessJob,
            tableName: 'process_jobs',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['process', 'name'] },
                { unique: false, fields: ['process'] },
                { unique: false, fields: ['name'] },
            ],
        });
    }

    public static associate(): void {
        ProcessJob.belongsTo(Process, {
            targetKey: 'id',
            foreignKey: 'process',
            as: 'parentProcess',
        });

        ProcessJob.hasMany(ProcessJobLog, {
            sourceKey: 'id',
            foreignKey: 'job',
            as: 'logs',
        });

        ProcessJob.hasMany(ProcessCache, {
            sourceKey: 'id',
            foreignKey: 'job',
            as: 'caches',
        });
    }
}

export default ProcessJobFactory;
