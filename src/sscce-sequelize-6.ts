import { BelongsToManyAddAssociationMixin, DataTypes, Model } from 'sequelize';
import { createSequelize6Instance } from '../setup/create-sequelize-instance';
import { expect } from 'chai';
import sinon from 'sinon';

// if your issue is dialect specific, remove the dialects you don't need to test on.
export const testingOnDialects = new Set(['mssql', 'sqlite', 'mysql', 'mariadb', 'postgres', 'postgres-native']);

// You can delete this file if you don't want your SSCCE to be tested against Sequelize 6

// Your SSCCE goes inside this function.
export async function run() {
  // This function should be used instead of `new Sequelize()`.
  // It applies the config for your SSCCE to work on CI.
  const sequelize = createSequelize6Instance({
    logQueryParameters: true,
    benchmark: true,
    define: {
      // For less clutter in the SSCCE
      timestamps: false,
    },
  });

  class Foo extends Model {
    public declare addBar: BelongsToManyAddAssociationMixin<Bar, string>;
  }
  class Bar extends Model {}
  class FooBarAttachment extends Model {}

  Foo.init(
    {
      fooName: {
        type: DataTypes.TEXT,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: 'Foo',
    }
  );

  Bar.init(
    {
      barName: {
        type: DataTypes.TEXT,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: 'Bar',
    }
  );

  FooBarAttachment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fooName: DataTypes.TEXT,
      barName: DataTypes.TEXT,
      restrictionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'FooBarAttachment',
    }
  );

  Foo.belongsToMany(Bar, {
    foreignKey: 'fooName',
    otherKey: 'barName',
    through: FooBarAttachment,
  });

  // You can use sinon and chai assertions directly in your SSCCE.
  const spy = sinon.spy();
  sequelize.afterBulkSync(() => spy());
  await sequelize.sync({ force: true });
  expect(spy).to.have.been.called;

  // tests
  const [foo, bar, anotherBar] = await Promise.all([
    Foo.create({ fooName: 'TS foo' }),
    Bar.create({ barName: 'TS bar' }),
    Bar.create({ barName: 'TS anotherBar' }),
  ]);

  // First test: add bar to foo
  await foo.addBar(bar, {
    through: {
      restrictionId: 1,
    },
  });
  expect(
    (await FooBarAttachment.findAll({ order: [['id', 'ASC']] })).map((x) =>
      x.toJSON()
    ),
    'First test failed'
  ).to.deep.include.members([
    {
      id: 1,
      fooName: 'TS foo',
      barName: 'TS bar',
      restrictionId: 1,
    },
  ]);

  // Second test: add anotherBar to foo
  await foo.addBar(anotherBar, {
    through: {
      restrictionId: 2,
    },
  });
  expect(
    (await FooBarAttachment.findAll({ order: [['id', 'asc']] })).map((x) =>
      x.toJSON()
    ),
    'Second test failed'
  ).to.deep.include.members([
    {
      id: 1,
      fooName: 'TS foo',
      barName: 'TS bar',
      restrictionId: 1,
    },
    {
      id: 2,
      fooName: 'TS foo',
      barName: 'TS anotherBar',
      restrictionId: 2,
    },
  ]);

  // Third test: add bar to foo again, but with another restrictionId
  await foo.addBar(bar, {
    through: {
      restrictionId: 3,
    },
  });
  expect(
    (await FooBarAttachment.findAll({ order: [['id', 'asc']] })).map((x) =>
      x.toJSON()
    ),
    'Third test failed'
  ).to.deep.include.members([
    {
      id: 1,
      fooName: 'TS foo',
      barName: 'TS bar',
      restrictionId: 1,
    },
    {
      id: 2,
      fooName: 'TS foo',
      barName: 'TS anotherBar',
      restrictionId: 2,
    },
    {
      id: 3,
      fooName: 'TS foo',
      barName: 'TS bar',
      restrictionId: 3,
    },
  ]);
}
