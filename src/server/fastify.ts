import Fastify, {FastifyRequest} from "fastify";
import {WebSocketServer} from "ws";
import {PORT} from "@/config";
import {messageListener, configureYDocumentOnConnection} from "@/ydoc/ws-shared-doc";
import {
    getDocumentNameByRequest,
    getYDoc,
    getYdocParamsByRequest
} from "@/ydoc/ydocuments";
import {uuidv4} from "lib0/random";
import {closeConn, enrichWsConnectionByProps} from "@/transfer/websockets";
import Sentry from '@/utils/sentry';
import process from "node:process";

const wss = new WebSocketServer({noServer: true});
wss.on("connection", async (ws: any, req: FastifyRequest) => {
    const uuid = uuidv4();
    const reqParams = getYdocParamsByRequest(req);
    if(!reqParams) return;

    ws = enrichWsConnectionByProps(ws, uuid, reqParams);

    const doc = await configureYDocumentOnConnection(
        ws,
        getDocumentNameByRequest(req),
        uuid,
    );

    ws.on('message', (message: ArrayBufferLike) => {
        messageListener(ws, doc, new Uint8Array(message))
    });

    ws.on('error', () => {
        console.log('Error sorry terminated.')
        closeConn(doc, ws.uuid);
    });

    ws.on('close', () => {
        console.log('Closing connection')
        closeConn(doc, ws.uuid);
    });
});

export const server = Fastify({});
server.server.on("upgrade", async (request: FastifyRequest, socket, head) => {
    try {
        const reqParam = getYdocParamsByRequest(request);
        const docName = getDocumentNameByRequest(request);
        if(reqParam) {
            if("documentId" in reqParam) {
                await getYDoc(
                    reqParam.languageId,
                    reqParam.token,
                    reqParam.refreshToken,
                    docName,
                    reqParam.documentId,
                    true
                );
            }

            if("guideId" in reqParam) {
                await getYDoc(
                    reqParam.languageId,
                    reqParam.token,
                    reqParam.refreshToken,
                    docName,
                    reqParam.guideId,
                    false
                );
            }

            console.info("\n");
            console.info("New client trying to make a connection..");
            //@ts-ignore
            wss.handleUpgrade(request, socket, head, (ws) => {
                console.info(`New connect is open`);
                wss.emit("connection", ws, request);
            });
        }

    } catch (err) {
        Sentry.captureException(err);
        console.info(`Something went wrong }`);
        socket.destroy();
    }
});

server.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error);
    request.log.error(error);
    reply.status(500).send({error: "Internal Server Error"});
});

server.listen({
    port: Number(PORT),
    host: "0.0.0.0",
}).then(r => {
    console.log(`Server started on: ${PORT}`)
}).catch(err => {
    Sentry.captureException(err);
    server.log.error(err);
    process.exit(1);
});

process.stdout.on('error', function( err ) {
    process.exit(0);
});
