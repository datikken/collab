import { prosemirrorJSONToYDoc } from "y-prosemirror";
import { JSDOM } from "jsdom";
import {
    buildSchema,
    ProseMirrorDOMParser,
} from "@cointelegraph/schema-of-prosemirror";

export const stringToHTMLElement = (htmlString: string): HTMLElement => {
    const { window } = new JSDOM();
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    return doc.body as HTMLElement;
};

export const htmlToYDoc = (docname: string, htmlString: string) => {
    const schema = buildSchema();
    const dom = stringToHTMLElement(htmlString);

    // Parse using schema and convert to JSON
    const docNode = ProseMirrorDOMParser.fromSchema(schema).parse(dom);
    const proseJson = docNode.toJSON();

    // Convert to Y.Doc
    return prosemirrorJSONToYDoc(schema, proseJson, docname);
};
