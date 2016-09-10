import {readFileAsString, dirExists, findAllFiles} from "../utilities";
import {error, success} from "../printer";
interface GetIdsOptions {
    defaultLanguage: string;
    additionalLanguages: string;
}

export async function getIds(dir: string, options: GetIdsOptions = {
    defaultLanguage: "en-gb",
    additionalLanguages: ""
}) {
    console.log(options.additionalLanguages);
    try {
        if (!(await dirExists(dir))) {
            return error(`could not find directory: ${dir}.`);
        }

        const files = await findAllFiles(dir);
        if (files.length === 0) {
            return error(`could not find any files in: ${dir}.`);
        }

        const result = await createTranslationsTree(files, {defaultLanguage: options.defaultLanguage,
            additionalLanguages: options.additionalLanguages
                ? options.additionalLanguages.split(",").map(x => x.trim())
                : []});

        success(JSON.stringify(result, null, 4));
    } catch (err) {
        return error("unknown error: " + err);
    }
}

interface TranslationTree {
    __filepath:string;
    [index:string]:Object;
    [index:string]:string;
}

/**
 * Reads input files, checks for any ids in them and builds a translations
 * tree based on the ids
 * @param files
 * @returns {Promise<TranslationTree>}
 */
function createTranslationsTree(files: string[], options: {
    defaultLanguage: string;
    additionalLanguages: string[];
}): Promise<TranslationTree> {
    return new Promise<TranslationTree>(async (resolve, reject) => {
        try {
            let translationTree: Object = {};
            const formattedMessages = await findFormattedMessages(await getContents(files));

            formattedMessages.forEach(message => {
                const nodes = message.id.split(".");

                buildTranslationTree(translationTree, nodes, message.defaultMessage, options);
            });

            return resolve(translationTree);
        } catch (err) {
            return reject(err);
        }
    });
}

interface FormattedMessage {
    id: string;
    defaultMessage: string;
}

/**
 * Finds FormattedMessages from the input string
 * @param input
 * @returns {string[]}
 */
export function findFormattedMessages(input: string): FormattedMessage[] {
    let formattedMessages: FormattedMessage[] = [];

    const beginOfFmtMsg = "<FormattedMessage";
    const endOfFmtMsg = "/>";

    let idRegex = /id=("|'|`)(.*?)\1/;
    let defaultMessageRegex = /defaultMessage=("|'|`)(.*?)\1/;

    let begin = input.indexOf(beginOfFmtMsg);
    let end = input.indexOf(endOfFmtMsg, begin);

    while (begin !== -1 && end !== -1) {
        const slice = input.slice(begin, end);
        const idMatch = idRegex.exec(slice);
        const defaultMessageMatch = defaultMessageRegex.exec(slice);

        if (idMatch !== null) {
            formattedMessages.push({
                id: idMatch[2],
                defaultMessage: defaultMessageMatch !== null ? defaultMessageMatch[2] : undefined
            });
        }

        begin = input.indexOf(beginOfFmtMsg, begin + (end - begin));
        end = input.indexOf(endOfFmtMsg, begin);
    }

    return formattedMessages;
}

function buildTranslationTree(translationTree: Object, nodes: string[], defaultMessage: string, { defaultLanguage = "en-gb", additionalLanguages = [] }) {
    if (nodes.length === 0) {
        return;
    }

    translationTree[nodes[0]] = translationTree[nodes[0]] || {};

    if (nodes.length > 1) {
        buildTranslationTree(translationTree[nodes[0]], nodes.slice(1), defaultMessage, {
            defaultLanguage, additionalLanguages
        });
    } else {
        translationTree[nodes[0]] = { [defaultLanguage]: defaultMessage || "" };
        additionalLanguages.forEach(lang => {
            translationTree[nodes[0]][lang] = "";
        });
    }
}

/**
 * Returns file contents as a string string
 * @param files
 */
export async function getContents(files: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {
            let results: Promise<string>[] = [];
            files.forEach(file => {
                results.push(readFileAsString(file));
            });
            Promise.all(results).then((fileContents: string[]) => {
                return resolve(fileContents.join(""));
            });
        } catch (err) {
            return reject(err);
        }
    });
}