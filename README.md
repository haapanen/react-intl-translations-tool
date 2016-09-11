# React Intl translations tool

This tool converts a structured tree of translations into a flattened list of translations supported by React Intl.

I wrote this tool as I was using TypeScript with React Intl and had some issues trying to get the default extraction system to work. 

## Directory structure

First directory specifies the target application. Different applications can have same string id.

```
./translations/[application]/**/[component].json
```

Output will be like:

```
./outputDirectory/app/<language>.json

{
    "[application].[**].[component].[property]": "translation...",
    "[application].[**].[component].[anotherProperty]": "another translation..."
}
```




