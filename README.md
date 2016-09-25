# antlr4-graps

[![NPM](https://nodei.co/npm/antlr4-graps.png?downloads=true&downloadRank=true)](https://nodei.co/npm/antlr4-graps/) [![NPM](https://nodei.co/npm-dl/antlr4-graps.png?months=6&height=3)](https://nodei.co/npm/antlr4-graps/)

[![Build Status](https://travis-ci.org/mike-lischke/antlr-graps.svg?branch=master)](https://travis-ci.org/mike-lischke/antlr-graps)

ANTLR4 graps (Grammar Parsing Service) is a native node module (tested with node 5 and node 6) with a C++ parsing backend that provides parsing functionality for ANTLR grammars.

## Platform support

The module comes with all needed files (no external binaries needed). There are 2 flavours of the module you can use, each contained in an own branch. The master branch contains all source code and will build the native antlr4-graps.node binary on installation (via node-gyp rebuild) on all platforms. The second variant (in the graps-bin branch) does not have the cpp source files, but instead comes with precompiled binaries. This way no compilation is needed on the target machines (and hence there's no need for XCode or Visual Studio).

If you install from master you need a compiler, depending on your platform. Otherwise you should be able to use the node module as is. The Windows variant was built as 32bit module using VS 2013, to make it compatible with Visual Studio Code. Unfortunately, currently the module doesn't work there yet.

## Usage

Here's a node session to demonstrate the use of the module:

```bash
Mikes-MBP:antlr4-graps Mike$ pwd
/Volumes/Extern/Work/projects/antlr4-graps
Mikes-MBP:antlr4-graps Mike$ node
```
```js
> var graps = require(".");
undefined
>
> console.log(graps);
{ AntlrLanguageSupport: [Function: AntlrLanguageSupport] }
undefined
>
> var backend = new graps.AntlrLanguageSupport();
undefined
>
> backend.loadGrammar("test/t.g4");
[graps-debug] Loading source: test/t.g4
SourceContext {}
>
> console.log(backend.infoForSymbol("test/t.g4", { "line": 2, "character": 11 }));
{ name: 'C',
  source: 't.g4',
  kind: 0,
  text: 'C: \'C\' -> channel(BLAH);',
  start: { character: 0, line: 7 },
  stop: { character: 23, line: 7 } }
undefined
>
> console.log(backend.listSymbols("test/t.g4"));
[ { name: 'A',
    source: 't.g4',
    kind: 0,
    text: 'A: \'A\';',
    start: { character: 0, line: 5 },
    stop: { character: 6, line: 5 } },
  { name: 'B',
    source: 't.g4',
    kind: 0,
    text: 'B: \'B\';',
    start: { character: 0, line: 6 },
    stop: { character: 6, line: 6 } },
  { name: 'C',
    source: 't.g4',
    kind: 0,
    text: 'C: \'C\' -> channel(BLAH);',
    start: { character: 0, line: 7 },
    stop: { character: 23, line: 7 } },
  { name: 'x',
    source: 't.g4',
    kind: 4,
    text: 'x: A | B | C;',
    start: { character: 0, line: 2 },
    stop: { character: 12, line: 2 } },
  { name: 'y',
    source: 't.g4',
    kind: 4,
    text: 'y: ZZ;',
    start: { character: 0, line: 3 },
    stop: { character: 5, line: 3 } } ]
undefined
>
> backend.releaseGrammar("test/t.g4");
[graps-debug] Unloaded test/t.g4
undefined
>
> backend.reparse("test/t.g4", "grammar A; a:: b \n| c; c: b+;");
[graps-debug] Reparsing t.g4
undefined
> console.log(backend.getErrors("test/t.g4"));
[ { message: 'mismatched input \'::\' expecting \'{\'options\', COLON, AT}\'',
    position: { character: 12, line: 1 },
    length: 2 },
  { message: 'mismatched input \'|\' expecting \'{\'options\', COLON, AT}\'',
    position: { character: 0, line: 2 },
    length: 1 },
  { message: 'mismatched input \';\' expecting \'{\'options\', COLON, AT}\'',
    position: { character: 3, line: 2 },
    length: 1 } ]
undefined
>
```

In this example I ran the node module from a local node session, hence the `require(".");` call. Usually you would do: `require("antlr4-graps");`. The module exports a central class (**AntlrLanguageSupport**), through which every call is routed. It takes care to load additional dependencies when you load a grammar (token vocabularies and imports) and it takes care not to load a grammar multiple times. Instead an internal reference counter is maintained. That also means that every call to `loadGrammar` must be paired with a call to `releaseGrammar` to avoid leaking grammar instances.

The module uses the given file name mostly to identify a source context, not so much to get the source from that file. This happens only if you call `loadGrammar()` without the source parameter (also indirectly, e.g. `getErrors()` calls `loadGrammar()` if the given grammar is not loaded yet). However, the file name is also used to resolve dependencies, by using its base path to locate the other grammar files (they all have to be in the same folder).

## Symbol Kinds

The module uses an enum to denote the kind of a symbol, which you can access via `AntlrLanguageSupport.SymbolKind`. Use this to check what type of symbol has been returned by the symbol retrieval functions. Available types are:

* LexerToken
* VirtualLexerToken
* FragmentLexerToken
* BuiltInLexerToken
* ParserRule
* LexerMode
* BuiltInMode
* TokenChannel
* BuiltInChannel
* Import
* TokenVocab

## Available APIs

> `function loadGrammar(file[, source])`

> Loads a grammar source from either the given file or, if specified, from the source parameter. If an explicit source is given then the file content will be ignored. The file name however is used to identify the internally managed source context and dependency references. A call to this function will not load any additional source, if there was a previous call to loadGrammar with the same file name (e.g. via dependency resolution). It will then only increase the internal ref counter. Calls to `loadGrammar()` must always be paired by a `releaseGrammar()` or the source context will stay in memory until the module is unloaded.
>
> Both parameters are strings.

-----

> `function releaseGrammar(file)`

> Decreases the ref counter for the given file and if that reaches zero unloads the source context and releases all it's dependencies (which might lead to unloading them too if they are no longer referenced anywhere else).

-----

> `function reparse(file, source)`

> Used to update symbol information for a given file (e.g. after an edit action). It is not necessary that the file already has all the changes. Only `source` is used as source for the grammar code. This function will also update all dependencies, by releasing no longer used ones and loading new ones, if required.

-----
    
> `function infoForSymbol(file, position)`

> Returns informations about the symbol at the given position.
>
> The position parameter is an object with the members `line` and `character` (as used e.g. in [Visual Studio code](https://code.visualstudio.com/docs/extensionAPI/vscode-api#Position)). The line value is one based, as usual for ANTLR.
> 
> The result is an object with these members:
> 
> - **name**: The name of the symbol.
> - **source**: The base name of the source file it belongs to.
> - **kind**: The type of the symbol,e.g. `AntlrLanguageSupport.SymbolKind.LexerToken`.
> - **text**: The definition for the symbol.
> - **start**: The start position of the symbol.
> - **stop**: The end position of the symbol.
    
-----
    
> `function listSymbols(file)`

> Returns a list of all symbols defined in the given file (or grammar if parsed from a string). The result is an array of symbol objects (like the ones returned by `infoForSymbol()`).

-----
    
> `function getErrors(file)`

> Returns a list of syntax and semantic errors. Syntax errors are generated by ANTLR itself and passed on unchanged. Semantic errors are mostly about symbol validity. A lookup is done for each found symbol (parser rule, lexer token, channel + mode) in a parse unit in all symbols (including those from imported grammars). The returned list consists of object with this structure:
> 
> - **message**: The error message.
> - **position**: The start position of the offending token.
> - **length**: The length of the error range (errors never span multiple lines).

##Testing

The module contains a simple test setup, which you can run from the module root folder by simply running mocha from a console. Additionally, there is Test setup for Visual Studio code, which even allows to debug the tests. You have to install the node modules "mocha" and "chai" locally for this to work.

##Debugging

The module contains a very small logging class that is used to log errors, warnings, infos or debug infos to the console. The log level is usually set to error, which hides the all irrelevant info output from the user (these are shown above for better understanding). 

##Known Issues
When looking for dependencies a simple search for .g and .g4 files is applied to find the files. This can fail if the grammar extension is different or the files are not all in the same folder.

##What's next?
The module is in a pretty good shape now, but there are ideas to add more functionality, like:

- Pass a callback function to the C++ code so it can send internal errors back to the Node.JS layer.
- Add support for code completion.
- Add support for automatic code formatting.
- Add support for linting ANTLR files.
- Add special language functions like (indirect) left recursion removal.

I'd love to see code contributions, so that the module evolves faster.
