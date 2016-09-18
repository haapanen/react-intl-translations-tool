# React Intl translations tool (Prototype at the moment!)

![Build status](https://travis-ci.org/haapanen/react-intl-translations-tool.svg?branch=master)

This tool converts a structured tree of translations into a flattened list of translations supported by React Intl.

I wrote this tool as I was using TypeScript with React Intl and had some issues trying to get the default extraction system to work. 

# Usage

Install NPM packages
```
npm install
```

Run the app
```
node bin/main ...
```

## Extracting IDs from a directory

To extract IDs from all files in a directory, run the following command.

```
node bin/main getids <directory>
```

This will output the IDs to stdout.

## Compiling a React Intl translations file

To compile the translations files (one for each language specified in the input jsons) run the following command:

```
node bin/main compile <input directory> <output directory>
```




