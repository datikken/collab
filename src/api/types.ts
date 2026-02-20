
export interface SecurityArg {
    token: string;
    refreshToken: string;
}

export interface DocumentArgs extends SecurityArg {
    documentId: number
    languageId: number
}

export interface GuideArgs extends SecurityArg {
    guideId: number
    languageId: number
}

export interface SaveEntityArgs extends SecurityArg {
    url: string
    data: string
}
