/**
 * @param {import("fastify").FastifyInstance} fastify 
 * @param {object} options 
 * @param {Function} next
 */
export default async (fastify, options, next) => {
    fastify.register(import('./api/v1/index.mjs'), {
        prefix: '/api/v1'
    })
    fastify.register(import('./frontend/index.mjs'))
}