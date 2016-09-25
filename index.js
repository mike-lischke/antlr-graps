'use strict';

var logger = require("./logger");
var fs = require("fs");
var path = require("path");
var backend = require("./build/Release/antlr4_graps"); // Built on installation.

const SymbolKind = { // Same as SymbolKind in C++.
    LexerToken : 0,
    VirtualLexerToken : 1,
    FragmentLexerToken : 2,
    BuiltInLexerToken : 3,
    ParserRule : 4,
    LexerMode : 5,
    BuiltInMode : 6,
    TokenChannel : 7,
    BuiltInChannel : 8,
    Import : 9,
    TokenVocab : 10
}

var AntlrLanguageSupport = (function () {
    var sourceContexts = new Map(); // Mapping file names to SourceContext instances.

    function AntlrLanguageSupport() {
    }

    function loadDependency(obj, contextEntry, baseFile, depName) {
        // The dependency file must be located in the same folder as the base file.
        var basePath = path.dirname(baseFile);
        try {
            let depPath = basePath + "/" + depName + ".g4";
            fs.statSync(depPath);
            contextEntry.dependencies.push(depPath);
            return obj.loadGrammar(depPath);
        } catch (e) {
        };

        // No such file. Try the .g extension instead.
        try {
            let depPath = basePath + "/" + depName + ".g";
            fs.statSync(depPath);
            contextEntry.dependencies.push(depPath);
            return obj.loadGrammar(depPath);
        } catch (e) {
        };

        // Ignore the dependency if we cannot find the source file for it.
        return null;
    }

    function parseGrammar(obj, contextEntry, file, source) {
        var oldDependencies = contextEntry.dependencies;
        contextEntry.dependencies = [];
        var newDependencies = contextEntry.context.parse(source);

        for (let dep of newDependencies) {
            let depContext = loadDependency(obj, contextEntry, file, dep);
            if (depContext != null)
                contextEntry.context.addDependency(depContext);
        }

        // Release all old dependencies. This will only unload grammars which have
        // not been ref-counted by the above dep loading (or which are not used by other
        // grammars).
        for (let dep of oldDependencies)
            obj.releaseGrammar(dep);
    }

    function getContext(obj, file, source) {
        var contextEntry = sourceContexts.get(file);
        if (contextEntry == undefined) {
            return obj.loadGrammar(file, source);
        }
        return contextEntry.context;
    }

    //------------------------------------------------------------------------

    AntlrLanguageSupport.prototype.reparse = function(file, source) {
        logger.log("debug", "Reparsing " + file);
        var contextEntry = sourceContexts.get(file);
        if (contextEntry == undefined) // Not yet loaded?
            this.loadGrammar(file, source);
        else
            parseGrammar(this, contextEntry, file, source);
    }

    AntlrLanguageSupport.prototype.loadGrammar = function(file, source) {
        var contextEntry = sourceContexts.get(file);
        if (contextEntry == undefined) {
            if (source == undefined) {
                logger.log("debug", "Loading source: " + file);
                try {
                    fs.statSync(file);
                    source = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    logger.log("warning", "File '" + file + "' could not be loaded");
                };
            }
            var context = new backend.SourceContext(path.basename(file));
            contextEntry = { "context": context, "refCount": 0, "dependencies": [] };
            sourceContexts.set(file, contextEntry);

            // Do an initial parse run and load all dependencies of this context
            // and pass their references to this context.
            parseGrammar(this, contextEntry, file, source);
        }
        contextEntry.refCount++;
        return contextEntry.context;
    }

    AntlrLanguageSupport.prototype.releaseGrammar = function(file) {
        var contextEntry = sourceContexts.get(file);
        if (contextEntry != undefined) {
            contextEntry.refCount--;
            if (contextEntry.refCount == 0) {
                sourceContexts.delete(file);

                // Release also all dependencies.
                for (let dep of contextEntry.dependencies)
                    this.releaseGrammar(dep);

                delete contextEntry.context;
                logger.log("debug", "Unloaded " + file);
            }
        }
    }

    AntlrLanguageSupport.prototype.infoForSymbol = function (file, position) {
        var context = getContext(this, file);
        return context.infoForSymbolAtPosition(position.line, position.character);
    };

    AntlrLanguageSupport.prototype.listSymbols = function (file) {
        var context = getContext(this, file);
        return context.listSymbols();
    };

    AntlrLanguageSupport.prototype.getErrors = function (file) {
        var context = getContext(this, file);
        return context.getErrors();
    };

    AntlrLanguageSupport.prototype.SymbolKind = SymbolKind;

    return AntlrLanguageSupport;
})();

exports.AntlrLanguageSupport = AntlrLanguageSupport;
