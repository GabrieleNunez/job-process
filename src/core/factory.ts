import * as Sequelize from 'sequelize';

/**
 * The basis for our model factory to all represent
 */
export abstract class ModelFactory {
    public static init(sequelize: Sequelize.Sequelize): void {
        sequelize.models;
    }
    public static associate(): void {}
}

export default ModelFactory;
