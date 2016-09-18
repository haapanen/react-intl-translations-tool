/**
 * Transforms translations from tree format to flat format and vice versa
 */

/**
 * Translations in a tree format e.g.
 *
 * {
 *   app: {
 *     title: "foo"
 *   },
 *   anotherApp: {
 *     inner: {
 *       title: "bar"
 *     }
 *   }
 * }
 */
export interface ITranslationTree {
    [id: string]: ITranslationTree | string;
}

/**
 * Translations in a list format e.g.
 *
 * {
 *   "app.title": "foo",
 *   "anotherApp.inner.title": "bar"
 * }
 */
export interface IFlatTranslations {
    [id: string]: string;
}

/**
 * toTranslationTree options
 */
export interface IToTranslationTreeOptions {
    // The specified translation will be set to this property.
    defaultLanguage: string;
    // Other languages will contain empty strings.
    languages: string[];
}

const defaultToTranslationTreeOptions: IToTranslationTreeOptions = {
    defaultLanguage: "en-gb",
    languages: []
};

/**
 * Converts flattened input translations into a translation tree
 * @param translations
 */
export function toTranslationTree(translations: IFlatTranslations,
                                  options = defaultToTranslationTreeOptions): ITranslationTree {
    let translationTree: ITranslationTree = {};

    for (var translation in translations) {
        if (!translations.hasOwnProperty(translation)) {
            continue;
        }

        // get the nodes from the translation path
        const nodes = translation.split(".");

        // use the previous object with the same name if one exists
        let subtree = translationTree;
        for (let i = 0, len = nodes.length; i < len; ++i) {
            // if this is the last one, set the translation
            if (i + 1 === len) {
                subtree[nodes[i]] = subtree[nodes[i]] || {};
                // set the translation to the default language
                (subtree[nodes[i]] as ITranslationTree)[options.defaultLanguage] = translations[translation];
                // set others as empty
                options.languages.forEach(language => {
                    (subtree[nodes[i]] as ITranslationTree)[language] = "";
                });
            } else {
                // go to next tree level
                subtree[nodes[i]] = subtree[nodes[i]] || {};
                subtree = subtree[nodes[i]] as ITranslationTree;
            }
        }
    }

    return translationTree;
}

/**
 * Datastructure containing translations for each language
 */
export interface IFlatTranslationsDictionary {
    [language: string]: IFlatTranslations;
}

/**
 * Converts translations tree to flattened translations lists. One list for each language
 * @param translationTree
 */
export function toFlatTranslations(translationTree: ITranslationTree): IFlatTranslationsDictionary {
    return getFlatTranslations(translationTree);
}

/**
 * Returns flattened translations as a dictionary with language as key
 * @param tree
 * @param currentPath
 * @returns {IFlatTranslationsDictionary}
 */
function getFlatTranslations(tree: ITranslationTree, currentPath: string = "", translations: IFlatTranslationsDictionary = {}): IFlatTranslationsDictionary {
    for (var prop in tree) {
        if (!tree.hasOwnProperty(prop)) {
            continue;
        }

        const value = tree[prop];

        if (typeof value === "string") {
            translations[prop] = translations[prop] || {};
            translations[prop][currentPath] = value;
        } else if (typeof value === "object") {
            getFlatTranslations(value, currentPath.length ? `${currentPath}.${prop}` : prop, translations);
        }
    }
    return translations;
}