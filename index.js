'use strict';

const AutoCoerce  = require('autocoerce');

const handlers = {
    get: function (request,reply) {

        const c = request.server.plugins['hapi-rethinkdb'].connection;
        const r = request.server.plugins['hapi-rethinkdb'].rethinkdb;
        const chain = r.table(this.tableName);

        chain.run(c).then( (cursor) => {

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

    Handler.prototype.verb = function (verb) {

        const method = this.handlers[verb];
        return method.bind(this);
    };

    Handler.prototype.handlers = handlers;

    return new Handler(tableName);
};
