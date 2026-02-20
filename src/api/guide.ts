import {GuideArgs} from "@/api/types";
import {IMPERIUM_API} from "@/config";
import {fetchUrl, saveEntityContent} from "@/api/shared";

export const fetchGuide = async ({ guideId, languageId, token, refreshToken }: GuideArgs): Promise<any> => {
    const url = `${IMPERIUM_API}/guides/${guideId}/language/${languageId}`;
    return await fetchUrl(url, token, refreshToken);
};

export const updateGuide = async ({ data, guideId, languageId, token, refreshToken }: {
    data: string;
    guideId: number;
    languageId: number;
    token: string;
    refreshToken: string;
}) => {
    const url = `${IMPERIUM_API}/guides/${guideId}/language/${languageId}`;
    await saveEntityContent({url, data, token, refreshToken})
};
