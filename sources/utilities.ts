import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import {info} from "./printer";

/**
 * Checks if the target directory exists in the file system
 * @param dir
 * @returns {Promise<boolean>}
 */
export function dirExists(dir: string) {
    return new Promise<boolean>((resolve, reject) => {
        try {
            fs.access(dir, fs.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        } catch (err) {
            return reject(err);
        }
    });
}

/**
 * Finds all files in the directory and it's child directories matching
 * the extension
 * @param dir
 * @param extension
 * @returns {Promise<string[]>}
 */
export function findAllFiles(dir: string, extension: string) {
    return new Promise<string[]>((resolve, reject) => {
        try {
            const opts = {};
            const fullPath = path.join(dir, "**", `*.${extension}`);
            glob(fullPath, opts, (err, files) => {
                if (err) {
                    return reject(err);
                }

                return resolve(files);
            });
        } catch (err) {
            return reject(err);
        }
    });
}

/**
 * Tries to read file and parse the JSON to object. If parse fails,
 * returns null
 * @param path
 * @returns {Promise<T>}
 */
export function readFile<T>(path: string): Promise<T | null> {
    return new Promise<T>((resolve, reject) => {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    return reject(err);
                }

                try {
                    return resolve(Object.assign({}, JSON.parse(data.toString()), {"__filename": path}));
                } catch (err) {
                    return resolve(null);
                }
            })
        } catch (err) {
            return reject(err);
        }
    });
}