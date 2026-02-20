import {CALLBACK_TIMEOUT, IMPERIUM_API} from "@/config";
import axios from "axios";
import Sentry from "@/utils/sentry";
import {SaveEntityArgs} from "@/api/types";

export const fetchApiHealth = async() => {
    const url = `${IMPERIUM_API}/internal/health`;
    try {
        return (
            await axios.get(url, {
                timeout: CALLBACK_TIMEOUT,
            })
        );
    } catch (error: any) {
        Sentry.captureException(error, (scope) => {
            scope.setExtras({
                url,
                error: error?.response?.data,
            });
            return scope;
        });
        console.log(error)
    }
};

export const fetchUrl = async (url: string, token: string, refreshToken: string) => {
    try {
        return (
            await axios.get(url, {
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `accessToken=${token}; refreshToken=${refreshToken}`,
                },
                timeout: CALLBACK_TIMEOUT,
            })
        )?.data;
    } catch (error: any) {
        Sentry.captureException(error);
    }
}

export const saveEntityContent = async ({url, data, token, refreshToken}: SaveEntityArgs) => {
    try {
        await axios.patch(url, JSON.stringify({fulltext: data}), {
            headers: {
                "Content-Type": "application/json",
                Cookie: `accessToken=${token}; refreshToken=${refreshToken}`,
            },
            timeout: CALLBACK_TIMEOUT,
            withCredentials: true,
        });
    } catch (error: any) {
        Sentry.captureException(error);
    }
}
