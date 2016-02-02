'use strict';

const AutoCoerce  = require('autocoerce');

const handlers = {
    index: function (request,reply) {

        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const chain = r.table(this.tableName);

        chain.run(c).then( (cursor) => {

            cursor.toArray().then( (items) => {

                reply(items);
            },reply);
        },reply);
    },
    show: function (request,reply) {

        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const c = request.server.plugins['hapi-rethinkdb'].connection;
        r.table(this.tableName).get(request.params.id).run(c).then( (item) => {

            reply(item);
        },reply);
    },
    join: function (request, reply) {

        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const joinTable = request.params.member;
        const byColumn = request.params.column;

        r.table(this.tableName).get(request.params.id).merge( (item) => {

            const filter = {};
            filter[byColumn] = item('id');

            const obj = {};
            obj[joinTable] = r.table(joinTable).filter(filter).coerceTo('array');

            return obj;
        }).run(c).then( (result) => {

            reply(result);
        },reply);
    },
    member: function (request, reply) {

        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const tableName = request.params.member;
        const byColumn = request.params.column;

        const filter = {};
        filter[byColumn] = request.params.id;
        r.table(tableName).filter(filter).run(c).then( (cursor) => {

            cursor.toArray().then( (items) => {

                reply(items);
            },reply);
        },reply);
    },
    post: function (request, reply) {

        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const object = Object.assign(request.payload, { createdAt: new Date(), updatedAt: null });

        r.table(this.tableName).insert(object,{ returnChanges:true }).run(c).then((result) => {

            reply(result.changes[0].new_val);
        },reply);
    },
    put: function (request, reply) {

        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const object = Object.assign(request.payload,{ updatedAt: new Date() });

        r.table(this.tableName).get(request.params.id).update(object,{ returnChanges: true }).run(c).then((result) => {

            reply(result.changes[0].new_val);
        },reply);
    },
    delete: function (request, reply) {

        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;

        r.table(this.tableName).get(request.params.id).delete().run(c).then((result) => {

            reply(result.deleted === 1);
        },reply);
    },
    search: function (request,reply) {

        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;

        let filter = {};
        let query;

        filter[request.params.key] = request.params.value;
        filter = AutoCoerce(filter);

        query = r.table(this.tableName)
            .filter(filter);

        query.run(c).then( (cursor) => {

            cursor.toArray().then( (items) => {

                reply(items);
            });
        }, reply);
    }
};

exports.factory = function (tableName) {

    const Handler = function (name) {

        this.tableName = name;
    };

    Handler.prototype.action = function (name) {

        return this.handlers[name].bind(this);
    };

    Handler.prototype.handlers = handlers;

    return new Handler(tableName);
};
