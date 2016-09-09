import * as chalk from "chalk";

export function success(message: string) {
    console.log(chalk.green("success: ") + message);
}

export function info(message: string) {
    console.log(chalk.blue("info: ") + message);
}

export function warning(message: string) {
    console.log(chalk.yellow("warning: ") + message);
}

export function error(message: string) {
    console.log(chalk.red("error: ") + message);
}