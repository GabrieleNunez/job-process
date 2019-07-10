import ModelFactory from '../core/factory';
import Models from '../core/models';
import { Process } from './process';
import { ProcessJob } from './process_job';
import { ProcessLogTypes } from '../core/process_log_types';
import * as Sequelize from 'sequelize';

export class ProcessJobLog extends Sequelize.Model {
    public id!: number;
    public process!: number;
    public job!: number;
    public machine!: string;
    public type!: string;
    public createdAt: number;
    public updatedAt: number;

    public readonly parentProcess?: Process;
    public readonly parentJob?: ProcessJob;

    public static associations: {
        parentProcess: Sequelize.Association<Process, ProcessJobLog>;
        parentJob: Sequelize.Association<ProcessJob, ProcessJobLog>;
    };
}

export const ProcessJobLogAttributesDefinition: Sequelize.ModelAttributes = {
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
    job: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    machine: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'unknown',
    },
    type: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: ProcessLogTypes.Generic,
    },
    message: {
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

export abstract class ProcessJobLogFactory extends ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        ProcessJobLog.init(ProcessJobLogAttributesDefinition, {
            sequelize: sequelize,
            modelName: Models.ProcessJobLog,
            tableName: 'process_job_logs',
            timestamps: false,
        });
    }

    public static associate(): void {
        ProcessJobLog.belongsTo(Process, {
            targetKey: 'id',
            foreignKey: 'process',
            as: 'parentProcess',
        });

        ProcessJobLog.belongsTo(ProcessJob, {
            targetKey: 'id',
            foreignKey: 'job',
            as: 'parentJob',
        });
    }
}

export default ProcessJobLogFactory;
