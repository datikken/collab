import {server} from "@/server/fastify";
import {FastifyReply, FastifyRequest} from "fastify";
import {getDocumentFromRedis,getDocumentData} from "@/ydoc/ydocuments";
import {WSSharedDoc} from "@/ydoc/ws-shared-doc";
import Sentry from '@/utils/sentry';
import {deleteRedisRecordByKey, getDocUpdatesKey, hasUpdatesByDoc} from "@/storage/redis-service";
import {fetchApiHealth} from "@/api/shared";
import {pub, redis, sub} from "@/storage/redis";
import {checkApiKeyHeader} from "@/server/utils";
import {RedisDeleteKeyParams, URLParams} from "@/server/types";

// doc:guides/1534/language/1:updates
server.post('/redis/delete', async function (req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> {
    const { redisKey } = req.body as RedisDeleteKeyParams;

    try {
        const hits = await deleteRedisRecordByKey(redisKey);
        return res.send(hits);
    } catch(e) {
        Sentry.captureException(e);
    }

    throw new Error('Something went wrong');
})

const getHtmlByDocName = async (docName: string) => {
    const ydoc = new WSSharedDoc(docName);
    if (!await hasUpdatesByDoc(ydoc)) {
        throw new Error(`Failed to fetch html for: ${docName}`);
    }

    await getDocumentFromRedis(ydoc);
    return getDocumentData(docName, ydoc);
}

server.route({
    method: 'GET',
    url: '/documents/:documentId/language/:languageId',
    handler: async function (req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> {
        await checkApiKeyHeader(req, res);
        const {documentId, languageId} = req.params as URLParams;
        try {
            const docName = `documents/${documentId}/language/${languageId}`;
            const html = await getHtmlByDocName(docName);
            res.send(html);
        } catch (err) {
            Sentry.captureException(err);
        }

        throw new Error('Document has no content');
    }
});

server.route({
    method: 'GET',
    url: '/guides/:guideId/language/:languageId',
    handler: async function (req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> {
        await checkApiKeyHeader(req, res);
        const {guideId, languageId} = req.params as URLParams;
        try {
            const docName = `guides/${guideId}/language/${languageId}`;
            const html = await getHtmlByDocName(docName);
            return res.send(html);
        } catch (err) {
            Sentry.captureException(err);
        }

        throw new Error('Guide has no content');
    }
});

server.route({
    method: 'GET',
    url: '/health',
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    redis: { type: 'string' },
                    redisPub: { type: 'string' },
                    redisSub: { type: 'string' },
                    imperium: { type: 'string' },
                    'mysql-primary': { type: 'string' },
                    rabbitmq: { type: 'string' },
                    elasticsearch: { type: 'string' },
                }
            }
        }
    },
    handler: async function (request, reply) {
        try {
            const healthResponse = await fetchApiHealth();
            const response = {
                redis: redis.status,
                redisPub: pub.status,
                redisSub: sub.status,
                ...healthResponse?.data
            };
            reply.send(JSON.stringify(response));
        } catch(err) {
            Sentry.captureException(err);
        }
    }
});
