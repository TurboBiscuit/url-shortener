// Config .env
import dotenv from 'dotenv'
dotenv.config()

// Imports
import path from 'path'
import fs from 'fs/promises'
import _fs from 'fs'
import _fastify from 'fastify'

//Config
var config = {
    port: process.env.PORT || 3000,
    domains: [],
    https: {
        enabled: false
    }
}
if (!_fs.existsSync(path.resolve('./config.json'))) {
    console.error('config.json was not found! using default config!')
} else {
    try {
        var file = await fs.readFile(path.resolve('./config.json'))
        config = Object.assign(config, JSON.parse(file))
    } catch (error) {
        throw new Error(`Failed to load config.json: ${error.message}`)
    }
}

var options = {}
if (config.https && config.https.enabled) {
    if (!config.https.cert) throw new Error('HTTPS is enabled but cert file path is missing from config file!')
    if (!config.https.key) throw new Error('HTTPS is enabled but key file path is missing from config file!')
    var cert_path = path.resolve(config.https.cert)
    var key_path = path.resolve(config.https.key)
    if (!_fs.existsSync(cert_path)) throw new Error(`HTTPS is enabled but cert file cant be found! (${cert_path})`)
    if (!_fs.existsSync(key_path)) throw new Error(`HTTPS is enabled but key file cant be found! (${key_path})`)
    if (!(await fs.stat(cert_path)).isFile()) throw new Error(`HTTPS is enabled but cert path is not a file! (${cert_path})`)
    if (!(await fs.stat(key_path)).isFile()) throw new Error(`HTTPS is enabled but key path is not a file! (${key_path})`)
    options.https = {
        cert: await fs.readFile(cert_path),
        key: await fs.readFile(key_path)
    }
}
const fastify = _fastify(options)
var plugins = new Map()
if (!_fs.existsSync(path.resolve('./plugins'))) await fs.mkdir(path.resolve('./plugins'));
var new_plugins = _fs.readdirSync(path.resolve('./plugins')).filter(e => (e.endsWith('.js') || e.endsWith('.mjs')))
await Promise.all(new_plugins.map(async e => {
    try {
        var plugin = await import(`${path.resolve(`./plugins/${e}`)}`)
        if (plugin.default) plugin = Object.assign({}, plugin.default)
        if (!plugin.options) throw new Error('Options not found')
        if (!plugin.generate) throw new Error('Generate function not found')
        if (!plugin.options.domain) throw new Error('Domain not found')
        if (typeof plugin.generate !== 'function') throw new Error('Generate must be a function!')
        if (plugin.requires) {
            var missing = plugin.requires.map(e => {
                return {
                    exists: _fs.existsSync(path.resolve(`./node_modules/${e}`)),
                    name: e
                }
            }).filter(e => !e.exists)
            if (missing.length > 0) {
                throw new Error(`Plugin "${e}" requires "${missing.map(e=>e.name).join(',')}" and is not installed, run "npm i ${missing.map(e=>e.name).join(' ')}" to fix this issue`)
            }
        }
        plugin.options = Object.assign({
            https: false,
            custom_codes: false
        }, plugin.options)
        plugins.set(plugin.options.domain, plugin)
    } catch (error) {
        console.error(`Failed to load plugin "${e}" due to "${error.message}"`)
    }
    return
}))
console.log(`Loaded ${plugins.size}/${new_plugins.length} Plugins (${new_plugins.length-plugins.size} Errored)`)
fastify.decorate('plugins', plugins)
fastify.decorate('config', config)
await fastify.register(await import('fastify-mongodb'), {
    url: process.env.MONGO_URI || 'mongodb://localhost/short-urls'
})
fastify.register(import('./routes/index.mjs'))
fastify.listen(config.port).then(e => console.log(`Listening On ${e}`))