module.exports = function () {
    function create(app, config, io) {
        var api      = require('./store-api')(config.store, config),
            context  = config.store.context  || '/store/api/v1',
            interval = config.store.interval || interval,
            version  = config.version        || '0.0.0',
            logger   = config.logger         || {log:function(){}},
            meta     = config.meta           || {$_id:'kv-routes'};

        // When POSTing to the RESTful API, only the value in the 
        // body of the request, does the API generate a UUID for
        // the key (true) or does it reject the request (false)
        var postGenerateUUID = (typeof(config.store.postGenerateUUID) === 'undefined') ?
                                true : config.store.postGenerateUUID;

        var deleteMultiKeys  = (typeof(config.store.deleteMultiKeys) === 'undefined') ?
                                true : config.store.deleteMultiKeys;


        /////////////////////////// STATUS ///////////////////////////////////
        // GET
        app.get(context + '/status', function (req, res) {
            res.header('X-tomahawk-http-method', 'GET');
            res.header('X-tomahawk-operation', 'status');
            api.status(res);
        });

        /////////////////////////// KEY ///////////////////////////////////
        // GET
        app.get(context + '/key/:key?', function (req, res) {
            var key   = req.params.key || '*',
                exact = key.indexOf('*') === -1;
            res.header('X-tomahawk-http-method', 'GET');
            res.header('X-tomahawk-operation', 'get');
            res.header('X-tomahawk-multi-key', !exact);
            res.header('X-tomahawk-key', key);
            api.get(res, key);
        });

        // POST
        app.post(context + '/key', function (req, res) {
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                }),
                tuples = getFormData(uuid, req),
                keys   = tuples.map(function (object) {return object.key}).join(',');

            res.header('X-tomahawk-http-method', 'POST');
            res.header('X-tomahawk-operation', 'set');
            res.header('X-tomahawk-multi-key', tuples.length > 1);
            res.header('X-tomahawk-key', keys);
            if (postGenerateUUID === false) {
                var found = tuples.filter(function (object) {
                    return object.key === uuid;
                });
                if (found.length > 0) {
                    return res.status(400).json({key:keys,error:"Multi-key DELETE not allowed"}).end();
                }
            }
            api.set(res, tuples);
        });

        // PUT
        app.put(context + '/key/:key', function (req, res) {
            var tuples = getFormData(req.params.key, req),
                keys   = tuples.map(function (object) {return object.key}).join(',');

            res.header('X-tomahawk-http-method', 'PUT');
            res.header('X-tomahawk-operation', 'set');
            res.header('X-tomahawk-multi-key', tuples.length > 1);
            res.header('X-tomahawk-key', keys);
            api.set(res, tuples);
        });

        // DELETE
        app.delete(context + '/key/:key?', function (req, res) {
            var key   = req.params.key || '*',
                exact = key.indexOf('*') === -1;
            res.header('X-tomahawk-http-method', 'DELETE');
            res.header('X-tomahawk-operation', 'del');
            res.header('X-tomahawk-multi-key', !exact);
            res.header('X-tomahawk-key', key);

            if (!exact && deleteMultiKeys !== true) {
                return res.status(400).json({key:key,error:"Multi-key DELETE not allowed"}).end();
            }

            if (!exact && req.query.force !== 'true') {
                return res.status(400).json({key:key,error:"To delete all the entries, you must use the 'force' option"}).end();
            }
            api.del(res, key);
        });

        /////////////////////////// SET ///////////////////////////////////

        app.get(context + '/set/:set/:member?', function (req, res) {
            var set    = req.params.set,
                member = req.params.member || '*',
                exact  = member.indexOf('*') === -1;
            res.header('X-tomahawk-http-method', 'GET');
            res.header('X-tomahawk-operation', 'sget');
            res.header('X-tomahawk-multi-member', !exact);
            res.header('X-tomahawk-set', set);
            api.sget(res, set, member);
        });

        // POST
        app.post(context + '/set', function (req, res) {
            var tuples = getFormData(undefined, req),
                set    = tuples[0];

            res.header('X-tomahawk-http-method', 'POST');
            res.header('X-tomahawk-operation', 'sadd');
            res.header('X-tomahawk-set', set);
            api.sadd(res, tuples);
        });

        // PUT
        app.put(context + '/set/:set', function (req, res) {
            var tuples = getFormData(req.params.set, req),
                sets   = tuples.map(function (object) {return object.key}).join(',');

            res.header('X-tomahawk-http-method', 'PUT');
            res.header('X-tomahawk-operation', 'sadd');
            res.header('X-tomahawk-multi-member', tuples.length > 1);
            res.header('X-tomahawk-set', sets);
            api.sadd(res, tuples);
        });

        // DELETE
        app.delete(context + '/set/:set/:member?', function (req, res) {
            var set    = req.params.set,
                member = req.params.member || '*',
                exact  = member.indexOf('*') === -1;
            res.header('X-tomahawk-http-method', 'DELETE');
            res.header('X-tomahawk-operation', 'sdel');
            res.header('X-tomahawk-multi-member', !exact);
            res.header('X-tomahawk-set', set);

            if (!exact && deleteMultiKeys !== true) {
                return res.status(400).json({set:set,error:"Multi-set DELETE not allowed"}).end();
            }

            if (!exact && req.query.force !== 'true') {
                return res.status(400).json({set:set,error:"To delete all the member of a set, you must use the 'force' option"}).end();
            }
            api.sdel(res, set, member);
        });


        /////////////////////////// PRIVATE ///////////////////////////////////

        function getFormData(key, req) {
            var tuples = [];
            logger.log('debug', 'kv-store::getFormData|content-type:%s', req.xContentType, meta);
            if (req.xContentType === 'application/x-www-form-urlencoded') {
                for (var name in req.body) {
                    if (req.body.hasOwnProperty(name)) {
                        tuples.push({key: name, value: req.body[name]});
                    }
                }
                // The BODY does NOT contain a KEY = VALUE, it only
                // has the VALUE in the body. We will use the defaultKey.
                if (tuples.length === 1 && !tuples[0].value) {
                    logger.log('debug', 'kv-store::getFormData|malformed-tuple:%j', tuples, meta);
                    if (typeof(key) !== 'undefined') {
                        tuples[0].value = tuples[0].key;
                        tuples[0].key   = key;
                    }
                }
            } else {
                logger.log('debug', 'kv-store::getFormData|body:%j', req.body, meta);
                if (typeof(key) !== 'undefined') {
                    tuples.push({key:key, value:req.body});
                }
            }
            logger.log('debug', 'kv-store::getFormData|tuples:%j', tuples, meta);
            return tuples;
        }

        ////////////////////////////////////////////////////////////////////////
        return {
            constructor : function (next) {
                if (next) process.nextTick(next);
            },
            shutdown : function (next) {
                if (next) process.nextTick(next);
            }
        };
    }

    return create;
}();
