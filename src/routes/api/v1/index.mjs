/**
 * @param {import("fastify").FastifyInstance} fastify 
 * @param {object} options 
 * @param {Function} next
 */
export default async (fastify, options, next) => {
    fastify.register(import('fastify-rate-limit'), {
        global: false,
        max: 15,
        timeWindow: '5 minutes',
        addHeaders: { // default show all the response headers when rate limit is reached
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true
        },
        keyGenerator: function (req) {
            return req.headers['cf-connecting-ip'] || req.raw.ip
        }, // default (req) => req.raw.ip
    })
    fastify.register(import('./shorten/index.mjs'), {
        prefix: '/shorten'
    })
    fastify.register(import('./domains/index.mjs'), {
        prefix: '/domains'
    })
}