import * as path from "path";
import {dirExists, findAllFiles, readFile, saveObject} from "../utilities";
import {error, success, warning} from "../printer";

/**
 * Flattened translations
 * first level contains all the languages,
 * second level the translations
 * e.g.
 * "en-gb": {
 *     "app.title": "Title"
 * },
 * "fi-fi": {
 *     "app.title": "Otsikko"
 * }
 */
interface Translations {
    [language: string]: {
        [id: string]: string;
    }
}

/**
 * Compile command
 * @param dir Target directory
 * @param outputDir Output directory
 * @returns {undefined}
 */
export async function compile(dir: string, outputDir: string) {
    try {
        // check if target dir exists
        if (!(await dirExists(dir))) {
            return error(`could not find directory: ${dir}.`);
        }

        // find all .json files from the directory / subdirectories and get their full paths
        const files = (await findAllFiles(dir, "json")).map(f => path.resolve(f));
        if (files.length === 0) {
            return error(`could not find any .json files in: ${dir}.`);
        }

        // get the translations from each file and flatten them
        const translations: Translations = await compileTranslations(path.resolve(dir), files);

        for (let prop in translations) {
            if (!translations.hasOwnProperty(prop)) {
                continue;
            }

            await saveObject(path.join(outputDir, prop + ".json"), translations[prop]);
        }

        success("Successfully created translations.");
    } catch (err) {
        return error(err);
    }
}

/**
 * Structured translations
 */
interface TranslationTree {
    [id: string]: string | TranslationTree;
    __filepath: string;
}

/**
 * Compiles translation objects for each language
 * @param rootDir
 * @param files
 * @returns {Promise<Translations>}
 */
async function compileTranslations(rootDir: string, files: string[]) {
    return new Promise<Translations>(async (resolve, reject) => {
        try {
            // read the translations from files
            const translations = await readTranslations(files);

            // flatten the translations
            const flattened = await createFlattenedTranslations(rootDir, translations);

            // merge flattened translations
            const merged = mergeFlattenedTranslations(flattened);

            return resolve(merged);
        } catch (err) {
            return reject(err);
        }
    });
}

/**
 * A flattened translation tree
 * e.g.
 * {
 *   foo: "bar"
 *   bar: {
 *      baz: "foo"
 *   }
 * }
 * =>
 * {
 *   "foo": "bar",
 *   "bar.baz": "foo"
 * }
 */
interface FlattenedTranslation {
    [index: string]: {
        [index: string]: string;
    }
}

/**
 * Converts the translation tree objects to flattened translation objects
 * @param rootDir
 * @param translationTrees
 * @returns {Promise<FlattenedTranslation[]>}
 */
async function createFlattenedTranslations(rootDir: string, translationTrees: TranslationTree[]) {
    return new Promise<FlattenedTranslation[]>((resolve, reject) => {
        try {
            let flattenedTranslations: FlattenedTranslation[] = [];

            translationTrees.forEach(tree => {
                // if there's only a single key there was an error in parsing the JSON / the object was empty
                // => ignore the file
                if (Object.keys(tree).length === 1) {
                    return warning(`ignored translation file: ${tree.__filepath}. File contains no props or is not valid JSON.`);
                }

                // get the nodes from the path
                // add +1 to rootDir length to remove the trailing /
                const nodes = tree.__filepath.substr(rootDir.length + 1).split(path.sep)

                const initialPath = nodes.length === 1
                    // remove .json postfix
                    ? nodes[0].split(".")[0] :
                    // take all but last
                    nodes.slice(0, nodes.length - 1)
                    // add last but remove .json extension
                        .concat(nodes.slice(nodes.length - 1).map(node => node.split(".")[0]))
                        .join(".");

                flattenedTranslations.push(flattenTranslationTree(tree, initialPath));
            });

            return resolve(flattenedTranslations);
        } catch (err) {
            return reject(err);
        }
    });
}

/**
 * Flattens the translation tree =>
 * {
 *   foo: "bar"
 *   bar: {
 *      baz: "foo"
 *   }
 * }
 * =>
 * {
 *   "foo": "bar",
 *   "bar.baz": "foo"
 * }
 *
 * @param tree
 * @param path
 * @param flattenedTranslation
 * @returns {FlattenedTranslation}
 */
function flattenTranslationTree(tree: TranslationTree,
                                path: string,
                                flattenedTranslation: FlattenedTranslation = {}): FlattenedTranslation {
    for (const prop in tree) {
        if (!tree.hasOwnProperty(prop)) {
            continue;
        }

        // ignore prop if it's not a translation id
        if (prop === "__filepath") {
            continue;
        }

        if (typeof tree[prop] === "string") {
            flattenedTranslation[prop] = flattenedTranslation[prop] || {};
            flattenedTranslation[prop][path] = tree[prop] as string;
        } else if (typeof tree[prop] === "object") {
            flattenTranslationTree(tree[prop] as TranslationTree,
                path.length > 0 ? `${path}.${prop}` : prop, flattenedTranslation);
        }
    }

    return flattenedTranslation;
}

/**
 * Merges multiple flattened translation trees into a single one
 * @param args
 */
function mergeFlattenedTranslations(flattenedTranslations: FlattenedTranslation[]): Translations {
    let translations: Translations = {};

    flattenedTranslations.forEach(iter => {
        for (let lang in iter) {
            if (!iter.hasOwnProperty(lang)) {
                continue;
            }

            translations[lang] = Object.assign({}, translations[lang], iter[lang]);
        }
    });

    return translations;
}

/**
 * Reads the translations from list of input files
 *
 * Returns an object with just __filepath if the JSON parse fails
 *
 * @param files
 * @returns {Promise<TranslationTree[]>}
 */
async function readTranslations(files: string[]): Promise<TranslationTree[]> {
    return new Promise<TranslationTree[]>((resolve, reject) => {
        try {
            // read the input files
            let fileContents: Promise<TranslationTree>[] = [];
            files.forEach(async (file) => {
                // read the file or just add an empty object with filepath if JSON parse failed
                fileContents.push(readFile<TranslationTree>(file) || Promise.resolve({ __filepath: file }));
            });

            Promise.all(fileContents).then((translations: TranslationTree[]) => {
                return resolve(translations);
            });
        } catch (err) {
            return reject(err);
        }
    });
}
