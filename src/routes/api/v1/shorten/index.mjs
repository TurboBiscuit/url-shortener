import shortid from 'shortid'
/**
 * @param {import("fastify").FastifyInstance} fastify 
 * @param {object} options 
 * @param {Function} next
 */
export default async (fastify, options, next) => {
    fastify.route({
        method: "POST",
        url: '/',
        config: {
            rateLimit: {
                max: 15,
                timeWindow: '5 minutes'
            }
        },
        schema: {
            body: {
                type: "object",
                properties: {
                    url: {
                        type: 'string',
                        format: 'uri'
                    },
                    code: {
                        type: 'string'
                    },
                    domain: {
                        type: 'string'
                    }
                },
                required: ['url']
            }
        },
        handler: async (req, res) => {
            var ip = req.headers['cf-connecting-ip'] || req.raw.ip
            var blacklisted_codes = await fastify.mongo.db.collection('misc').findOne({
                stat: 'blacklisted-codes'
            })
            var banned_hosts = await fastify.mongo.db.collection('misc').findOne({
                stat: 'banned-hosts'
            })
            var banned_ips = await fastify.mongo.db.collection('misc').findOne({
                stat: 'banned-ips'
            })
            if (!blacklisted_codes) {
                await fastify.mongo.db.collection('misc').insertOne({
                    stat: 'blacklisted-codes',
                    codes: []
                })
                blacklisted_codes = {
                    codes: []
                }
            }
            if (!banned_hosts) {
                await fastify.mongo.db.collection('misc').insertOne({
                    stat: 'banned-hosts',
                    hosts: []
                })
                banned_hosts = {
                    hosts: []
                }
            }
            if (!banned_ips) {
                await fastify.mongo.db.collection('misc').insertOne({
                    stat: 'banned-ips',
                    ips: []
                })
                banned_ips = {
                    ips: []
                }
            }
            if (banned_ips.ips.indexOf(ip) !== -1) return res.code(400).send({
                message: 'You have been banned from using this service.'
            })
            var domain = req.body.domain ? req.body.domain.toLowerCase() : req.hostname
            var url = new URL(req.body.url)
            if (['https:', 'http:'].indexOf(url.protocol) == -1) return res.code(400).send({
                message: 'URL Invalid, Bad Protocol'
            })
            if ([...[...fastify.plugins].map(e => e[0]), ...fastify.config.domains, ...banned_hosts.hosts].indexOf(url.hostname) !== -1) return res.code(400).send({
                message: 'URL Invalid, Bad Domain'
            })
            var code = ''
            if (fastify.plugins.has(domain)) {
                var plugin = fastify.plugins.get(domain)
                if (!plugin.options.custom_codes && req.body.code) return res.code(400).send({
                    message: "This domain doesn't support custom codes!"
                })
                if (blacklisted_codes.codes.indexOf(req.body.code) !== -1) return res.code(400).send({
                    message: 'Code Invalid (Blacklisted)'
                })
                try {
                    code = await (new Promise((res, rej) => {
                        if (plugin.options.custom_codes) {
                            plugin.generate(url.toString(), req.body.code || null, (err, code) => {
                                if (err) return rej(err)
                                res(code)
                            })
                        } else {
                            plugin.generate(url.toString(), (err, code) => {
                                if (err) return rej(err)
                                res(code)
                            })
                        }
                    }))
                } catch (error) {
                    res.code(400).send({
                        message: error.message
                    })
                }
            } else if (fastify.config.domains.indexOf(domain) != -1) {
                if (req.body.code) {
                    if (!/^[\w]{0,20}$/.test(req.body.code)) return res.code(400).send({
                        message: 'Short code must only conain alphanumeric characters. (a-z 0-9)'
                    })
                    if (blacklisted_codes.codes.indexOf(req.body.code.toLowerCase()) !== -1) return res.code(400).send({
                        message: 'Code Invalid (Blacklisted)'
                    })
                    if (await fastify.mongo.db.collection('urls').findOne({
                            code: req.body.code,
                            domain
                        })) return res.code(400).send({
                        message: 'This short code is already in use on this domain!'
                    })
                    code = req.body.code
                } else code = await generateShortCode(domain)
            } else {
                res.code(400).send({
                    message: `Invalid Domain "${domain}"`
                })
            }
            await fastify.mongo.db.collection('urls').insertOne({
                code,
                domain,
                url: url.toString()
            })
            res.send({
                code,
                domain,
                url: url.toString()
            })
        }
    })
    async function generateShortCode(domain) {
        var code = shortid()
        if (await fastify.mongo.db.collection('urls').findOne({
                code,
                domain
            })) return await generateShortCode(domain)
        else return code
    }
}