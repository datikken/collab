import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import {MESSAGE_AWARENESS, MESSAGE_SYNC} from "@/config";
import {decoding, encoding} from "lib0";
import {send, UserWebSocket} from "@/transfer/websockets";
import {getYDoc} from "@/ydoc/ydocuments";
import {pub, sub} from "@/storage/redis";
import {pushUpdateToList} from '@/storage/redis-service';

const sendSyncFirstStep = (doc: WSSharedDoc, ws: UserWebSocket): WSSharedDoc => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, ws as UserWebSocket, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
                doc.awareness,
                Array.from(awarenessStates.keys())
            )
        );
        send(doc, ws as UserWebSocket, encoding.toUint8Array(encoder));
    }

    return doc;
}

export const configureYDocumentOnConnection = async (
    ws: UserWebSocket,
    docName: string,
    uuid: string,
): Promise<WSSharedDoc> => {
    let doc;
    const {languageId, token, refreshToken} = ws.requestParams;

    if ("documentId" in ws.requestParams && ws.requestParams.documentId) {
        doc = await getYDoc(
            languageId,
            token,
            refreshToken,
            docName,
            ws.requestParams.documentId,
        );
    }

    if ("guideId" in ws.requestParams && ws.requestParams.guideId) {
        doc = await getYDoc(
            languageId,
            token,
            refreshToken,
            docName,
            ws.requestParams.guideId,
        )
    }

    if (!doc) {
        throw new Error('Failed to create doc');
    }

    doc.conns.set(uuid, ws);
    return sendSyncFirstStep(doc, ws);
}

export const messageListener = async (
    ws: WebSocket,
    doc: WSSharedDoc,
    message: Uint8Array<ArrayBufferLike>
) => {
    try {
        const conn = ws as UserWebSocket;
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);
        switch (messageType) {
            // Send updated data to connector, who send the message
            case MESSAGE_SYNC:
                encoding.writeVarUint(encoder, MESSAGE_SYNC);
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

                // If the `encoder` only contains the type of reply message and no
                // message, there is no need to send the message. When `encoder` only
                // contains the type of reply, its length is 1.
                if (encoding.length(encoder) > 1) {
                    send(doc, conn, encoding.toUint8Array(encoder));
                }
                break;
            // Send updated data to connectors
            case MESSAGE_AWARENESS: {
                const update = decoding.readVarUint8Array(decoder);
                //@ts-ignore
                await pub.publish(doc.awarenessChannel, Buffer.from(update));
                awarenessProtocol.applyAwarenessUpdate(
                    doc.awareness,
                    update,
                    conn,
                );
                break;
            }
        }
    } catch (err) {
        console.error(err);
        // @ts-ignore
        doc.emit("error", [err]);
    }
};

export class WSSharedDoc extends Y.Doc {
    name: string;
    awarenessChannel: string;
    conns: Map<any, any>;
    awareness: awarenessProtocol.Awareness;

    /**
     * @param {string} name
     */
    constructor(name: string) {
        super({gc: true});
        this.name = name;
        this.conns = new Map();
        this.awareness = new awarenessProtocol.Awareness(this);
        this.awareness.setLocalState(null);
        this.awarenessChannel = `${name}-awareness`

        const awarenessChangeHandler = (
            {
                added,
                updated,
                removed,
            }: {
                added: Array<number>;
                updated: Array<number>;
                removed: Array<number>;
            },
            conn: Object | null
        ) => {
            const changedClients = added.concat(updated, removed);
            if (conn !== null) {
                const connControlledIDs =
                    /** @type {Set<number>} */ this.conns.get(conn);
                if (connControlledIDs !== undefined) {
                    added.forEach((clientID: number) => {
                        connControlledIDs.add(clientID);
                    });
                    removed.forEach((clientID: number) => {
                        connControlledIDs.delete(clientID);
                    });
                }
            }
            // broadcast awareness update
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
            );
            const buff = encoding.toUint8Array(encoder);
            this.conns.forEach((c, _) => {
                send(this, c, buff);
            });
        };

        // Update connectors
        this.awareness.on("update", awarenessChangeHandler);

        // Update connector
        //@ts-ignore
        this.on("update", updateHandler);

        sub.subscribe(this.name, this.awarenessChannel).then(() => {
            sub.on('messageBuffer', (channel, update) => {
                const channelId = channel.toString();
                if (channelId === this.name) {
                    Y.applyUpdate(this, update, sub);
                } else if (channelId === this.awarenessChannel) {
                    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, sub);
                }
            })
        })
    }
}

export const updateHandler = async (
    update: Uint8Array<ArrayBufferLike>,
    origin: any,
    doc: WSSharedDoc
): Promise<void> => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    doc.conns.forEach((conn, _) => send(doc, conn, message));

    await pushUpdateToList(doc, update);
    await pub.publish(doc.name, Buffer.from(update));
};
