'use strict';

const tableName = 'items';
const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Handlers = require('../index').factory(tableName);

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

lab.before((done) => {

    Insert(dbOptions,
        {
            items: [
                {
                    name: 'YAMAHA',
                    model: 'XJR1300'
                },
                {
                    name: 'YAMAHA WITH SPACE',
                    model: 'XJR1300'
                },
                {
                    name: 'BMW',
                    model: 'R100'
                }
            ]
        }
    ).then( (fixtures) => {

        done();
    },console.error);
});

lab.after( (done) => {

    Delete(dbOptions, ['items']).then( (changes) => {

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
        path: '/search/{key}/{value}',
        handler: Handlers.verb('search')
    });

    server.route({
        method: 'GET',
        path: '/items',
        handler: Handlers.verb('get')
    });

    server.route({
        method: 'POST',
        path: '/items',
        handler: Handlers.verb('post')
    });

    server.route({
        method: 'PUT',
        path: '/items/{id}',
        handler: Handlers.verb('put')
    });

    server.route({
        method: 'DELETE',
        path: '/items/{id}',
        handler: Handlers.verb('delete')
    });
});

lab.experiment('handlers', () => {

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

        server.inject({ method: 'GET', url: '/search/name/YAMAHA WITH SPACE' }, (response) => {
            console.log(response.result);
            expect(response.result.length).to.be.equal(1);
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('should get', (done) => {

        server.inject({ method: 'GET', url: '/items' }, (response) => {

            expect(response.result.length).to.be.equal(3);
            expect(response.statusCode).to.equal(200);
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
