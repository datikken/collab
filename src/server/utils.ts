import {FastifyReply, FastifyRequest} from "fastify";
import {COLLABORANT_API_KEY} from "@/config";

export const checkApiKeyHeader = (req: FastifyRequest, res: FastifyReply): FastifyReply | void => {
    const header = req.headers["x-api-key"] ?? '';
    if (header !== COLLABORANT_API_KEY) {
        return res
            .code(403)
            .send('Unauthorized')
    }
};
