import EventEmmiter from 'events';
import {WSSharedDoc} from "@/ydoc/ws-shared-doc";
import {DocumentReqParams, getDocumentData, GuideReqParams} from "@/ydoc/ydocuments";
import Sentry from '@/utils/sentry';
import {updateDocument} from "@/api/document";
import {updateGuide} from "@/api/guide";

export const events = new EventEmmiter();

events.on('finish', async (doc: WSSharedDoc, requestParams: DocumentReqParams|GuideReqParams) => {
    if("documentId" in requestParams && requestParams.documentId) {
        await updateDocument({
            data: getDocumentData(doc.name, doc),
            documentId: requestParams.documentId,
            languageId: requestParams.languageId,
            token: requestParams.token,
            refreshToken: requestParams.refreshToken,
        })
            .then(() => {
                console.log(`${doc.name} - saved`);
            }).catch((error) => {
                Sentry.captureException(error, (scope) => {
                    scope.setExtras({
                        url: doc.name,
                        documentId: requestParams.documentId,
                        languageId: requestParams.languageId,
                        error: error?.response?.data,
                    });
                    return scope;
                });
            });
    }

    if("guideId" in requestParams && requestParams.guideId) {
        await updateGuide({
            data: getDocumentData(doc.name, doc),
            guideId: requestParams.guideId,
            languageId: requestParams.languageId,
            token: requestParams.token,
            refreshToken: requestParams.refreshToken,
        })
            .then(() => {
                console.log(`${doc.name} - saved`);
            }).catch((error) => {
                Sentry.captureException(error, (scope) => {
                    scope.setExtras({
                        url: doc.name,
                        guideId: requestParams.guideId,
                        languageId: requestParams.languageId,
                        error: error?.response?.data,
                    });
                    return scope;
                });
            });
    }
});
