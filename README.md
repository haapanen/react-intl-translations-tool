# React Intl translations tool

This tool converts a structured tree of translations into a flattened list of translations supported by React Intl.

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




