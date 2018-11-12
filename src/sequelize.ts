import Sequelize from 'sequelize';

export const Connector = (settings: any) => {
    return new Sequelize(settings.sequelize);
}

export const getQueueCount = async (connection: Sequelize.Sequelize) => {
    const Queue: any = connection.import('./models/queue');

    const holdQueueCount = Queue.findAndCountAll({ where: { status: 'HOLD' } });
    const deliverQueueCount = Queue.findAndCountAll({ where: { status: 'DELIVER' } });

    return Promise.all([holdQueueCount, deliverQueueCount]);
};

export const getQueueSize = async (connection: Sequelize.Sequelize) => {
    const Queue: any = connection.import('./models/queue');

    const holdQueueSize = Queue.sum('size', { where: { status: 'HOLD' } });
    const deliverQueueSize = Queue.sum('size', { where: { status: 'DELIVER' } });

    return Promise.all([holdQueueSize, deliverQueueSize]);
};