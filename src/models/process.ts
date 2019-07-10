import ModelFactory from '../core/factory';
import Models from '../core/models';
import { ProcessJob } from './process_job';
import { ProcessJobLog } from './process_job_log';
import { ProcessCache } from './process_cache';

import * as Sequelize from 'sequelize';

/**
 * The model that directly relates to the processes table
 */
export class Process extends Sequelize.Model {
    public id!: number;
    public name!: number;
    public createdAt!: number;
    public updatedAt!: number;

    public readonly jobs?: ProcessJob[];
    public readonly logs?: ProcessJobLog[];
    public readonly caches?: ProcessCache[];

    /**
     * All associations that should be made to the process table
     */
    public static associations: {
        jobs: Sequelize.Association<Process, ProcessJob>;
        logs: Sequelize.Association<Process, ProcessJobLog>;
        caches: Sequelize.Association<Process, ProcessCache>;
    };
}

/**
 * Column definitions for the table processes
 */
export const ProcessAttributesDefinition: Sequelize.ModelAttributes = {
    id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
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

/**
 * Factory that will simplfy initiating the process and making any additional associations
 */
export abstract class ProcessFactory extends ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        Process.init(ProcessAttributesDefinition, {
            sequelize: sequelize,
            modelName: Models.Process,
            tableName: 'processes',
            timestamps: false,
            indexes: [{ unique: true, fields: ['name'] }],
        });
    }

    public static associate(): void {
        Process.hasMany(ProcessJob, {
            sourceKey: 'id',
            foreignKey: 'process',
            as: 'jobs',
        });

        Process.hasMany(ProcessJobLog, {
            sourceKey: 'id',
            foreignKey: 'process',
            as: 'logs',
        });

        Process.hasMany(ProcessCache, {
            sourceKey: 'id',
            foreignKey: 'process',
            as: 'caches',
        });
    }
}

export default ProcessFactory;
