# Tomahawk REST Routes for Key Value Pair Store


# REST API, Key Value Pair Store

## To use this plugin

    npm install -g tomahawk-routes-kv-store

Then create a configuration file in your home directory:

    ~/.tomahawk/config.json
    {
        "plugins" : {
            "store-route" : {
                "implementation" : "tomahawk-routes-kv-store"
            }
        }
    }