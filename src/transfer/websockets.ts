import * as awarenessProtocol from "y-protocols/awareness";
import {WSSharedDoc} from "@/ydoc/ws-shared-doc";
import {encodeAwarenessUpdate} from "y-protocols/awareness";
import {pub} from "@/storage/redis";
import {events} from "@/events";
import {DocumentReqParams, GuideReqParams} from "@/ydoc/ydocuments";
//@ts-ignore
import { Buffer } from 'node:buffer';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

export interface UserWebSocket extends WebSocket {
    requestParams: DocumentReqParams|GuideReqParams;
    uuid: string;
}

export const enrichWsConnectionByProps = (ws: UserWebSocket, uuid: string, reqParams: DocumentReqParams|GuideReqParams): WebSocket => {
    ws.uuid = uuid;
    ws.requestParams = reqParams;
    return ws;
}

export const closeConn = async (doc: WSSharedDoc, conName: string): Promise<void> => {
    if (doc.conns.has(conName)) {
        const conn = doc.conns.get(conName);
        conn.close();
        doc.conns.delete(conName);

        const deletedKey = [...doc.awareness.getStates().entries()]
            .find(([, value]) => value.user?.id === conn.requestParams.userId)?.[0] || null;

        awarenessProtocol.removeAwarenessStates(
            doc.awareness,
            deletedKey ? [deletedKey] : [],
            null
        );

        await pub.publish(doc.awarenessChannel, Buffer.from(
            encodeAwarenessUpdate(doc.awareness, deletedKey ? [deletedKey] : [])
        ));

        if(doc.conns.size === 0) {
            events.emit('finish', doc, conn.requestParams);
        }
    }
};

export const send = (doc: WSSharedDoc, conn: UserWebSocket, m: Uint8Array<ArrayBufferLike>): void => {
    if (
        conn.readyState !== wsReadyStateConnecting &&
        conn.readyState !== wsReadyStateOpen
    ) {
        closeConn(doc, conn.uuid);
    }
    try {
        conn.send(m);
    } catch (e) {
        closeConn(doc, conn.uuid);
    }
};
