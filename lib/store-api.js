module.exports = function () {

    function create(store, config) {
        var version  = config.version        || '0.0.0',
            logger   = config.logger         || {log:function(){}},
            meta     = config.meta           || {$_id:'kv-routes-api'};

        function status(res) {
            store.status(function (err, result) {
                res.status(err ? 503 : 204).json(result).end();
            });
        }

        function get(res, key, array) {
            store.get(key, function (err, values) {
                if (err) {
                    return res.status(500).json({key:key,error:err}).end();
                }
                if (values) {
                    if (array) {
                        return res.set('Content-Type', 'text/plain; charset=utf8').send(values).end();
                    }
                    var hash = {};
                    values.forEach(function (row) {
                        hash[row.key] = row.value
                    });
                    return res.set('Content-Type', 'text/plain; charset=utf8').send(hash).end();
                }
                return res.status(404).end();
            });
        }

        function set(res, tuples) {
            store.set(tuples, function (err, values) {
                if (err) {
                    var keys = tuples.map(function (object) {return object.key}).join(',');
                    return res.status(500).json({key:keys,error:err}).end();
                }
                return res.status(201).end();
            });
        }

        function del(res, key) {
            store.del(key, function (err) {
                if (err) {
                    return res.status(500).json({key:key,error:err}).end();
                }
                return res.status(204).end();
            });
        }

        ///////////////////////////////////////////////////////////////////////

        function sget(res, set, member) {
            store.sget(set, member, function (err, found) {
                if (err) {
                    return res.status(500).json({key:key,error:err}).end();
                }
                if (member === '*') {
                    return res.status(200).json(found).end();
                }
                return res.status(+found === 0 ? 404 : 204).end();
            });
        }
        function sadd(res, tuples) {
            store.sadd(tuples, function (err, values) {
                if (err) {
                    return res.status(500).json({key:keys,error:err}).end();
                }
                return res.status(201).end();
            });
        }
        function sdel(res, set, member) {
            store.sdel(set, member, function (err) {
                if (err) {
                    return res.status(500).json({key:keys,error:err}).end();
                }
                return res.status(204).end();
            });
        }

        ////////////////////////////////////////////////////////////////////////
        return {
            status    : status,
            get       : get,
            set       : set,
            del       : del,
            sadd      : sadd,
            sget      : sget,
            sdel      : sdel
        };
    }

    return create;
}();

