import ModelFactory from '../core/factory';
import Models from '../core/models';
import * as Sequelize from 'sequelize';

/**
 * The model that directly relates to the processes table
 */
export class Process extends Sequelize.Model {
    public id!: number;
    public name!: number;
    public createdAt!: number;
    public updatedAt!: number;

    /**
     * All associations that should be made to the process table
     */
    public static associations: {};
}

/**
 * Column definitions for the table processes
 */
export const ProcessAttributesDefinition: Sequelize.ModelAttributes = {
    id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
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
        });
    }
}

export default ProcessFactory;
