/**
 * @param {import("fastify").FastifyInstance} fastify 
 * @param {object} options 
 * @param {Function} next
 */
export default async (fastify, options, next) => {
    fastify.route({
        method: "GET",
        url: '/',
        handler: async (req, res) => {
            res.send([...fastify.config.domains.map(e => {
                return {
                    name: e,
                    external: false,
                    custom_codes: true,
                    https: true
                }
            }), ...[...fastify.plugins].map(e => {
                return {
                    name: e[0],
                    external: true,
                    custom_codes: e[1].options.custom_codes,
                    https: e[1].options.https
                }
            })])
        }
    })
}