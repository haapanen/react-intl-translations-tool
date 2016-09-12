import {readFileAsString, dirExists, findAllFiles, saveObject} from "../utilities";
import {error, success} from "../printer";
interface GetIdsOptions {
    defaultLanguage: string;
    additionalLanguages: string;
    outputFile?: string;
}

const defaultOptions = {
    defaultLanguage: "en-gb",
    additionalLanguages: "",
    outputFile: undefined
};

export async function getIds(dir: string, options: GetIdsOptions = defaultOptions) {
    try {
        if (!(await dirExists(dir))) {
            return error(`could not find directory: ${dir}.`);
        }

        const files = await findAllFiles(dir);
        if (files.length === 0) {
            return error(`could not find any files in: ${dir}.`);
        }

        const result = await createTranslationsTree(files, {
            defaultLanguage: options.defaultLanguage,
            additionalLanguages: options.additionalLanguages
                ? options.additionalLanguages.split(",").map(x => x.trim())
                : [],
            outputFile: options.outputFile
        });

        if (options.outputFile !== undefined) {
            await saveObject(options.outputFile, result);
            success("Successfully saved parsed IDs to: " + options.outputFile);
        } else {
            console.log(JSON.stringify(result, null, 4));
        }
    } catch (err) {
        return error("unknown error: " + err);
    }
}

interface TranslationTree {
    __filepath?: string;
    [index:string]:Object | string | undefined;
}

interface CreateTranslationsTreeOptions {
    defaultLanguage: string;
    additionalLanguages: string[];
    outputFile?: string;
}

/**
 * Reads input files, checks for any ids in them and builds a translations
 * tree based on the ids
 * @param files
 * @returns {Promise<TranslationTree>}
 */
function createTranslationsTree(files: string[], options: CreateTranslationsTreeOptions): Promise<TranslationTree> {
    return new Promise<TranslationTree>(async (resolve, reject) => {
        try {
            let translationTree: TranslationTree = {};
            const formattedMessages = await findFormattedMessages(await getContents(files));

            formattedMessages.forEach(message => {
                const nodes = message.id.split(".");

                buildTranslationTree(translationTree, nodes, message.defaultMessage || "", options as any);
            });

            return resolve(translationTree);
        } catch (err) {
            return reject(err);
        }
    });
}

interface FormattedMessage {
    id: string;
    defaultMessage?: string;
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
    let bracketsDefaultMessageRegex = /defaultMessage={("|'|`)(.*?)\1}/;

    let begin = input.indexOf(beginOfFmtMsg);
    let end = input.indexOf(endOfFmtMsg, begin);

    while (begin !== -1 && end !== -1) {
        const slice = input.slice(begin, end);
        const idMatch = idRegex.exec(slice);
        const defaultMessageMatch = defaultMessageRegex.exec(slice);
        const bracketsDefaultMessageMatch = bracketsDefaultMessageRegex.exec(slice);

        if (idMatch !== null) {
            const messageMatch = defaultMessageMatch || bracketsDefaultMessageMatch;

            formattedMessages.push({
                id: idMatch[2],
                defaultMessage: messageMatch !== null ? messageMatch[2] : undefined
            });
        }

        begin = input.indexOf(beginOfFmtMsg, begin + (end - begin));
        end = input.indexOf(endOfFmtMsg, begin);
    }



    return formattedMessages;
}

function buildTranslationTree(translationTree: any, nodes: string[], defaultMessage: string, { defaultLanguage = "en-gb", additionalLanguages = [] }) {
    if (nodes.length === 0) {
        return;
    }

    translationTree[nodes[0]] = translationTree[nodes[0]] || {};

    if (nodes.length > 1) {
        buildTranslationTree(translationTree[nodes[0]], nodes.slice(1), defaultMessage, {
            defaultLanguage, additionalLanguages
        });
    } else {
        translationTree[nodes[0]] = { [defaultLanguage]: defaultMessage };
        additionalLanguages.forEach((lang: string) => {
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