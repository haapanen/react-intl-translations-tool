import * as path from "path";
import {dirExists, findAllFiles, readFile, saveObject} from "../utilities";
import {error, success, warning} from "../printer";
interface TranslationTree {
    __filepath:string;
    [index:string]:Object;
    [index:string]:string;
}

interface CompiledTranslations {
    [index:string]:string;
}


/**
 * Reads all .json files in target dir and child directories, parses them and
 * outputs the language files
 * @param dir
 */
export async function compile(dir:string, outputDir: string) {
    try {
        if (!(await dirExists(dir))) {
            return error(`could not find directory: ${dir}.`);
        }

        const files = (await findAllFiles(dir, "json")).map(f => path.resolve(f));
        if (files.length === 0) {
            return error(`could not find any .json files in: ${dir}.`);
        }

        const result = await compileTranslations(path.resolve(dir), files);

        for (var lang in result) {
            if (!result.hasOwnProperty(lang)) {
                continue;
            }

            await saveObject(path.join(outputDir, `${lang}.json`), result[lang]);
        }
        saveObject(path.join(outputDir, result))
        console.log(result)
        return success(`Successfully compiled ${files.length} files.`);
    } catch (err) {
        return error("unknown error: " + err);
    }
}

/**
 * Compiles the translations and stores them to a file
 * @param files
 * @returns {Promise<string>}
 */
export async function compileTranslations(rootDir: string, files:string[]) {
    return new Promise<string>(async(resolve, reject) => {
        try {
            let allTranslations:Promise<TranslationTree>[] = [];
            files.forEach(async(file) => {
                allTranslations.push(readFile<TranslationTree>(file));
            });

            let translations: CompiledTranslations[] = [];

            Promise.all(allTranslations)
                .then((translationTrees:(TranslationTree)[]) => {
                    translationTrees.forEach(translationTree => {
                        if (Object.keys(translationTree).length === 1) {
                            warning(`ignored translation file: ${translationTree.__filepath}. File contains no props or is not valid JSON.`);
                            return;
                        }

                        // remove the empty node (as __filepath will be like /foo/bar instead of foo/bar)
                        const nodes = translationTree.__filepath.substr(rootDir.length).split(path.sep).slice(1);
                        const application = nodes[0];

                        let initialPath: string;
                        if (nodes.length === 1) {
                            initialPath = nodes[0];
                        } else {
                            initialPath = nodes
                                .slice(0, nodes.length - 1) // take all but last
                                .concat(nodes.slice(nodes.length - 1).map(node => node.split(".")[0])) // add last but remove .json extension from it
                                .join(".");
                        }

                        console.log(nodes
                            .slice(0, nodes.length - 1) // take all but last
                            .concat(nodes.slice(nodes.length - 1).map(node => node.split(".")[0])) // add last but remove .json extension from it
                            .join("."));

                        translations.push(flattenTranslationTree(translationTree, {}, initialPath));

                        success(`generated translations for ${application}: ${initialPath}`);

                    });
                    let singleDict = {};

                    translations.forEach(file => {
                        for (var lang in file) {
                            if (!file.hasOwnProperty(lang)) {
                                continue;
                            }

                            singleDict[lang] = Object.assign({}, singleDict[lang], file[lang]);
                        }
                    });

                    return resolve(singleDict);
                }).catch((err) => {
                return resolve(err);
            });
        } catch (err) {
            return reject(err);
        }
    })
}

export function flattenTranslationTree(originalTree: TranslationTree, dictionary: CompiledTranslations, path: string) {
    for (const prop in originalTree) {
        if (!originalTree.hasOwnProperty(prop)) {
            continue;
        }

        if (prop === "__filepath") {
            continue;
        }

        if (typeof originalTree[prop] === "string") {
            dictionary[prop] = dictionary[prop] || {};
            dictionary[prop][path] = originalTree[prop] as string
        } else if (typeof originalTree[prop] === "object") {
            flattenTranslationTree(originalTree[prop] as TranslationTree, dictionary, path.length > 0 ? `${path}.${prop}` : prop);
        }
    }
    return dictionary;
}
