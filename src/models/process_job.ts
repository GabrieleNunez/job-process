import ModelFactory from '../core/factory';
import { Process } from './process';
import * as Sequelize from 'sequelize';

export class Job extends Sequelize.Model {
    public id!: number;
    public process!: number;
    public name!: string;
    public createdAt!: number;
    public updatedAt!: number;

    /** The process that this job belongs to */
    public parentProcess?: Process;

    /** Any associations to other tables that we want to keep track of or provide functionality for */
    public static associations: {
        parentProcess: Sequelize.Association<Process, Job>;
    };
}

export const JobAttributesDefinition: Sequelize.ModelAttributes = {
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

export abstract class JobFactory extends ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        Job.init(JobAttributesDefinition, {
            sequelize: sequelize,
            modelName: 'job',
            tableName: 'process_jobs',
            timestamps: false,
        });
    }
}
