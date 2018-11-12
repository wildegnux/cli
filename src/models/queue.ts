import { Sequelize, DataTypes } from 'sequelize';

export default (sequelize: Sequelize, DataTypes: DataTypes) => {
  return sequelize.define('queue', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 'nextval(queue_id_seq::regclass)',
      primaryKey: true
    },
    messages__id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    actionid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('HOLD', 'DELETE', 'DELIVER', 'BOUNCE'),
      allowNull: false
    },
    ts: {
      type: DataTypes.DATE,
      allowNull: true
    },
    senderip: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    serverid: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    senderhelo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    saslusername: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    senderlocalpart: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    senderdomain: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recipientlocalpart: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    recipientdomain: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: '0'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    transportid: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    deltafile: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '0'
    },
    next_retry: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.fn('now')
    },
    last_retry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    freezeTableName: true,
    tableName: 'queue',
    timestamps: true,
    createdAt: 'ts',
    updatedAt: false
  });
};
