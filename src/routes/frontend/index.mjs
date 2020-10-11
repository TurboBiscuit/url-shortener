import fs from 'fs'
import path from 'path'
/**
 * @param {import("fastify").FastifyInstance} fastify 
 * @param {object} options 
 * @param {Function} next
 */
export default async (fastify, options, next) => {
    fastify.get('/', async (req, res) => {
        res.type('text/html').send(await fs.readFileSync(path.resolve('./src/routes/frontend/views/index.html')))
    })
    fastify.get('/src/js/vue.min.js', async (req, res) => {
        res.type('text/javascript').send(await fs.readFileSync(path.resolve('./src/routes/frontend/static/vue.min.js')))
    })
    fastify.get('/:domain/:shortcode', async (req, res) => {
        var url = await fastify.mongo.db.collection('urls').findOne({
            code: req.params.shortcode,
            domain: req.params.domain
        })
        if (!url) return res.callNotFound()
        res.redirect(url.url)
    })
    fastify.get('/:shortcode', async (req, res) => {
        var url = await fastify.mongo.db.collection('urls').findOne({
            code: req.params.shortcode,
            domain: req.hostname
        })
        if (!url) return res.callNotFound()
        res.redirect(url.url)
    })
}