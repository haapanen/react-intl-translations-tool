import * as program from "commander";
import * as path from "path";
import {dirExists, findAllFiles, readFile} from "./utilities";
import {error, info, success} from "./printer";

var packageJson: {
    version: string;
} = require(path.join(__dirname, "../package.json"));

export function entry(argv: string[]) {
    program
        .command("compile <dir>")
        .action(compile);

    program
        .version(packageJson.version)
        .parse(argv);
}

/**
 * Reads all .json files in target dir and child directories, parses them and
 * outputs the language files
 * @param dir
 */
export async function compile(dir: string) {
    try {
        if (!(await dirExists(dir))) {
            return error(`could not find directory: ${dir}.`);
        }

        const files = await findAllFiles(dir, "json");
        if (files.length === 0) {
            return error(`could not find any .json files in: ${dir}.`);
        }

        const result = await compileTranslations(files);
        if (result.length !== 0) {
            return error(result);
        }

        return success(`Successfully compiled ${files.length} files.`);
    } catch (err) {
        return error("unknown error: " + err);
    }
}

interface Translation {
    __filepath: string;
    [index: string]: Object;
    [index: string]: string;
}

export async function compileTranslations(files: string[]) {
    return new Promise<string>(async (resolve, reject) => {
        try {
            let allTranslations: Translation[] = [];
            files.forEach(async (file) => {
                allTranslations.push(readFile<Translation>(file));
            });
            Promise.all(allTranslations)
                .then((translations: Translation[]) => {
                    console.log(translations);
                }).catch((err) => {
                    return resolve(err);
                });
        } catch (err) {
            return reject(err);
        }
    })
}

entry(process.argv);