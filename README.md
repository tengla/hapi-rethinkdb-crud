# hapi-rethinkdb-crud

### Basic crud mapping between hapi and rethinkdb.

### Usage

```
const Handler = require('../index').factory('items'); // table name
const server = new Hapi.Server();

server.connection({ port: 3000 });

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
```

If ```item``` has ```parts```, with each ```part``` having an ```itemId``` column, a url can be constructed
to join ```parts``` with ```item``` object, like ```/items/parts/itemId/rdb-id-string/join```

```
server.route({
    method: 'GET',
    path: '/items/{member}/{column}/{id}/join',
    handler: Handler.action('join')
});
```

Likewise, if ```items``` has ```parts```, with each ```part``` having an ```itemId``` column, a url can be constructed
to get a ```parts``` listing ```/items/parts/itemId/rdb-id-string```

```
server.route({
    method: 'GET',
    path: '/items/{member}/{column}/{id}',
    handler: Handler.action('member')
});
```
