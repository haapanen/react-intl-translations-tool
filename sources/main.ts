import * as program from "commander";
import * as path from "path";
import {compile} from "./commands/compile";
import {getIds} from "./commands/getIds";

var packageJson:{
    version:string;
} = require(path.join(__dirname, "../package.json"));

export function entry(argv:string[]) {
    program
        .command("compile <dir>")
        .action(compile);

    program
        .command("getids <dir>")
        .description("Get the IDs from the files in the specified dir, create a translations tree out of them and add default messages into the tree.")
        .option("-l, --defaultLanguage <defaultLanguage>", "Specify the language the default messages will be mapped to.")
        .option("-a, --additionalLanguages <items>", "Specify a list of languages that will be added to each translation.")
        .action(getIds);

    program
        .version(packageJson.version)
        .parse(argv);
}

entry(process.argv);