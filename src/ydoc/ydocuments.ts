import { FastifyRequest } from "fastify";
import * as cookie from "cookie";
import { applyUpdate, encodeStateAsUpdate } from "yjs";
import { WSSharedDoc } from "@/ydoc/ws-shared-doc";
import { htmlToYDoc } from "@/utils/html";
import { getDocUpdatesFromQueue, hasUpdatesByDoc } from "@/storage/redis-service";
import { fetchDocument } from "@/api/document";
import * as Y from 'yjs';
import { map } from "lib0";
import '@/storage/redis';
import { fetchGuide } from "@/api/guide";

export const getDocumentData = (name: string, doc: WSSharedDoc): string => {
    return doc.getXmlFragment(name).toJSON();
}
export const getDocumentNameByRequest = (req: FastifyRequest): string => {
    return req.url.toString().slice(1).split("?")[0];
};

export interface RequestMeta {
    languageId: number;
    userId: number;
    token: string;
    refreshToken: string;
}

export interface DocumentReqParams extends RequestMeta {
    documentId: number;
}

export interface GuideReqParams extends RequestMeta {
    guideId: number;
}

export const getYdocParamsByRequest = (req: FastifyRequest): DocumentReqParams | GuideReqParams | undefined => {
    const cookies: string = req.headers.cookie as string;

    if (!cookies) {
        throw new Error('Unable to parse cookie');
    }

    const token = cookie.parse(cookies as string)?.accessToken || "";
    const refreshToken = cookie.parse(cookies as string)?.refreshToken || "";

    const urlParams = new URLSearchParams(req.url.toString().split("?")[1]);
    const languageId = parseInt(urlParams.get("languageId") || "1");
    const documentId = parseInt(urlParams.get("documentId") || "");
    const guideId = parseInt(urlParams.get("guideId") || "");
    const userId = parseInt(urlParams.get("userId") || "1");

    let requestMeta: RequestMeta = {
        languageId,
        userId,
        token,
        refreshToken,
    }

    if (documentId) {
        return {
            ...requestMeta,
            documentId
        }
    }

    if (guideId) {
        return {
            ...requestMeta,
            guideId
        }
    }
}

export const getDocumentFromRedis = async (doc: WSSharedDoc) => {
    const redisUpdates = await getDocUpdatesFromQueue(doc);
    const redisYDoc = new Y.Doc();
    redisYDoc.transact(() => {
        for (const u of redisUpdates) {
            Y.applyUpdate(redisYDoc, u);
        }
    });

    Y.applyUpdate(doc, Y.encodeStateAsUpdate(redisYDoc));
}

interface DocumentText extends Object {
    fulltext: string
}

interface GuideText extends Object {
    fulltext: string
}

export const docs: Map<string, WSSharedDoc> = new Map();

export const getYDoc = async (
    languageId: number,
    token: string,
    refreshToken: string,
    docName: string,
    entityId: number,
    isDocument: boolean = false
): Promise<WSSharedDoc> => map.setIfUndefined(docs, docName,
    //@ts-ignore
    async () => {
        console.log('created: ', docName, entityId);
        let doc = new WSSharedDoc(docName);
        if (await hasUpdatesByDoc(doc)) {
            await getDocumentFromRedis(doc);
        } else {
            if (isDocument) {
                fetchDocument({ documentId: entityId, languageId, token, refreshToken })
                    .then(
                        (htmlData: DocumentText) => {
                            if (!htmlData) return;
                            const documentFulltext = htmlData.fulltext;
                            if (documentFulltext) {
                                const newDoc = htmlToYDoc(docName, documentFulltext);
                                applyUpdate(doc, encodeStateAsUpdate(newDoc));
                            }
                        }
                    );
            }

            if (!isDocument) {
                fetchGuide({ guideId: entityId, languageId, token, refreshToken })
                    .then(
                        (htmlData: GuideText) => {
                            if (!htmlData) return;
                            const guideFulltext = htmlData.fulltext;
                            if (guideFulltext) {
                                const newDoc = htmlToYDoc(docName, guideFulltext);
                                applyUpdate(doc, encodeStateAsUpdate(newDoc));
                            }
                        }
                    );
            }

        }

        doc.gc = true;
        return doc;
    });
