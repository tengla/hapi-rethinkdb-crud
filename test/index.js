'use strict';

const tableName = 'items';
const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const _ = require('lodash');

const Handler = require('../index').factory(tableName);
const Insert = require('rethinkdb-fixtures').Insert;
const Delete = require('rethinkdb-fixtures').Delete;

const expect = Code.expect;
const lab = exports.lab = Lab.script();

const dbOptions = {
    db: 'test'
};

let server;
let item;

const RethinkDbPlugin = {
    register: require('hapi-rethinkdb'),
    options: {
        url: 'rethinkdb://localhost/test'
    }
};

const fixtures = {
    items: [
        {
            id: 'yammie1',
            name: 'YAMAHA',
            model: 'XJR1300'
        },
        {
            id: 'tx500',
            name: 'YAMAHA WITH SPACE',
            model: 'TX500'
        },
        {
            id: 'bmw',
            name: 'BMW',
            model: 'R100'
        }
    ],
    parts: [
        {
            name: 'Scrambler seat',
            desc: 'Fits BMW models R100/7, R100RS, R100RT',
            itemId: 'bmw'
        },
        {
            name: 'Head light',
            desc: 'Fits BMW models R100/7, R100RS, R100RT',
            itemId: 'bmw'
        },
        {
            name: 'Mudguard',
            desc: 'Fits BMW models R100/7, R100RS, R100RT',
            itemId: 'bmw'
        },
        {
            name: 'Handlebar mirror',
            desc: 'Mirror for Yamaha TX500',
            itemId: 'tx500'
        },
        {
            name: 'Rear cat eye light',
            desc: 'Rear light for the legendary Yamaha TX500',
            itemId: 'tx500'
        },
        {
            name: 'Front fender',
            desc: 'Black front fender',
            itemId: 'yammie1'
        },
        {
            name: 'Dummy name 1',
            desc: 'Dummy desc 1'
        },
        {
            name: 'Dummy name 2',
            desc: 'Dummy desc 2'
        }
    ]
};

lab.before((done) => {

    Insert(dbOptions,fixtures)
        .then( (_fixtures) => {

            done();
        },console.error);
});

lab.after( (done) => {

    Delete(dbOptions, Object.keys(fixtures))
        .then( (changes) => {

            done();
        },console.error);
});

lab.beforeEach((done) => {

    const plugins = [RethinkDbPlugin];

    server = new Hapi.Server();
    server.connection({ port: 3000 });
    server.register(plugins, (err) => {

        if (err) {
            return done(err);
        }

        done();
    });

    server.route({
        method: 'GET',
        path: '/items/search/{key}/{value}',
        handler: Handler.action('search')
    });

    server.route({
        method: 'GET',
        path: '/items',
        handler: Handler.action('index')
    });

    server.route({
        method: 'GET',
        path: '/items/{id}',
        handler: Handler.action('show')
    });

    server.route({
        method: 'GET',
        path: '/items/{member}/{column}/{id}/join',
        handler: Handler.action('join')
    });

    server.route({
        method: 'GET',
        path: '/items/{member}/{column}/{id}',
        handler: Handler.action('member')
    });

    server.route({
        method: 'POST',
        path: '/items',
        handler: Handler.action('post')
    });

    server.route({
        method: 'PUT',
        path: '/items/{id}',
        handler: Handler.action('put')
    });

    server.route({
        method: 'DELETE',
        path: '/items/{id}',
        handler: Handler.action('delete')
    });
});

lab.experiment('Handler', () => {

    lab.beforeEach((done) => {

        const r = server.plugins['hapi-rethinkdb'].rethinkdb;
        const c = server.plugins['hapi-rethinkdb'].connection;

        r.table(tableName).run(c).then( (cursor) => {

            cursor.toArray().then( (items) => {

                item = items[0];
                done();
            });
        });
    });

    lab.test('should search', (done) => {

        server.inject({ method: 'GET', url: '/items/search/name/YAMAHA WITH SPACE' }, (response) => {

            expect(response.result.length).to.be.equal(1);
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should get index', (done) => {

        server.inject({ method: 'GET', url: '/items' }, (response) => {

            expect(response.result.length).to.be.equal(3);
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should show item', (done) => {

        server.inject({ method: 'GET', url: '/items/bmw' }, (response) => {

            expect(response.result.name).to.be.equal('BMW');
            expect(response.result.model).to.be.equal('R100');
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should join \'parts\' with \'item\'', (done) => {

        server.inject({ method: 'GET', url: '/items/parts/itemId/bmw/join' }, (response) => {

            const names = response.result.parts.map( (part) => {

                return part.name;
            });

            expect(names.length).to.be.equal(3);
            const stmt = _.eq(_.sortBy(names), ['Head light', 'Mudguard', 'Scrambler seat']);
            expect(stmt).to.be.true();
            done();
        });
    });

    lab.test('should fail joining \'parts\' with \'item\'', (done) => {

        server.inject({ method: 'GET', url: '/items/bogusmember/bogusId/bmw/join' }, (response) => {

            expect(response.statusCode).to.be.equal(500);
            done();
        });
    });

    lab.test('should get \'parts\' members', (done) => {

        server.inject({ method: 'GET', url: '/items/parts/itemId/tx500' }, (response) => {

            const itemIds = response.result.map( (part) => {

                return part.itemId;
            });

            expect(itemIds[0]).to.be.equal('tx500');
            expect(itemIds[1]).to.be.equal('tx500');
            expect(itemIds.length).to.be.equal(2);
            expect(itemIds).to.be.array();
            done();
        });
    });

    lab.test('should fail to get \'parts\' members', (done) => {

        server.inject({ method: 'GET', url: '/items/parts/bogusId/tx500' }, (response) => {

            expect(response.result.length).to.be.equal(0);
            expect(response.statusCode).to.be.equal(200);
            done();
        });
    });

    lab.test('should get 500 on \'parts\' members', (done) => {

        server.inject({ method: 'GET', url: '/items/bogusmember/bogusId/tx500' }, (response) => {

            expect(response.statusCode).to.be.equal(500);
            done();
        });
    });

    lab.test('should post', (done) => {

        server.inject({ method: 'POST', url: '/items', payload: { name: 'BMW', model: 'R100' } }, (response) => {

            expect(response.result.name).to.be.equal('BMW');
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should put', (done) => {

        server.inject({ method: 'PUT', url: '/items/' + item.id, payload: { model: 'R80' } }, (response) => {

            expect(response.result.model).to.be.equal('R80');
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should delete', (done) => {

        server.inject({ method: 'DELETE', url: '/items/' + item.id }, (response) => {

            expect(response.result).to.be.equal(true);
            expect(response.statusCode).to.equal(200);
            done();
        });
    });
});
