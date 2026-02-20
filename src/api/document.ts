import {DocumentArgs} from "@/api/types";
import {IMPERIUM_API} from "@/config";
import {fetchUrl, saveEntityContent} from "@/api/shared";

export const fetchDocument = async ({ documentId, languageId, token, refreshToken }: DocumentArgs): Promise<any> => {
    const url = `${IMPERIUM_API}/documents/${documentId}/language/${languageId}`;
    return await fetchUrl(url, token, refreshToken);
};

export const updateDocument = async ({ data, documentId, languageId, token, refreshToken }: {
    data: string;
    documentId: number;
    languageId: number;
    token: string;
    refreshToken: string;
}) => {
    const url = `${IMPERIUM_API}/documents/${documentId}/language/${languageId}`;
    await saveEntityContent({url, data, token, refreshToken})
};
