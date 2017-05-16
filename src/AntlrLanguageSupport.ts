/*
 * This file is released under the MIT license.
 * Copyright (c) 2016, 2017, Mike Lischke
 *
 * See LICENSE file for more info.
 */

"use strict";

import * as fs from "fs";
import * as path from "path";

import { SourceContext } from './SourceContext';
import { ATNStateType, TransitionType } from "antlr4ts/atn";

export enum SymbolGroupKind { // Multiple symbol kinds can be involved in a symbol lookup.
    TokenRef,
    RuleRef,
    LexerMode,
    TokenChannel,
};

export enum SymbolKind {
    TokenVocab,
    Import,
    BuiltInLexerToken,
    VirtualLexerToken,
    FragmentLexerToken,
    LexerToken,
    BuiltInMode,
    LexerMode,
    BuiltInChannel,
    TokenChannel,
    ParserRule
};

export class LexicalRange {
    start: { column: number, row: number };
    end: { column: number, row: number };
}

// The definition of a single symbol (range and content it is made of).
export class Definition {
    text: string;
    range: LexicalRange;
};

export class SymbolInfo {
    kind: SymbolKind;
    name: string;
    source: string;
    definition: Definition | undefined;
};

export enum DiagnosticType {
    Hint,
    Info,
    Warning,
    Error
}

export class DiagnosticEntry {
    type: DiagnosticType;
    message: string;
    range: LexicalRange;
};

/**
 * All references of a rule (both lexer and parser) to other rules and string literals.
 * Lexer rules obviously cannot have any parser rule reference. String literals are mostly interesting
 * for parser rules to check for implicit lexer tokens.
 */
export class ReferenceNode {
    rules: string[];
    tokens: string[];
    literals: string[];
};

/**
 * Contains the link + node values which describe the ATN graph for a single rule.
 */
export class ATNGraphData {
    nodes: { name: string, type: ATNStateType }[];
    links: { source: number, target: number, type: TransitionType, labels: string[] }[];
};

/**
 * Options used by the parser files generation.
 */
export interface GenerationOptions {
    baseDir?: string;    // The folder in which to run the generation process. Should be an absolute path for predictable results.
    libDir?: string;     // Search path for the ANTLR tool.
    outputDir?: string;  // The folder where to place generated files in (relative to baseDir or absolute). (default: grammar dir)
    package?: string;    // Package or namespace name for generated files. (default: none)
    language?: string;   // The target language for the generated files. (default: what's given in the grammar or Java)
    listeners?: boolean; // Generate listener files if set. (default: true)
    visitors?: boolean;  // Generate visitor files if set. (default: false)
    loadOnly?: boolean;  // Don't generate anything. Just try to load interpreter data and do interpreter setup.
    alternativeJar?: string; // Use this jar for work instead of the built-in one(s).
};

class ContextEntry {
    context: SourceContext;
    refCount: number;
    dependencies: string[] = [];
};

export class AntlrLanguageSupport {
    // Mapping file names to SourceContext instances.
    private sourceContexts: Map<string, ContextEntry> = new Map<string, ContextEntry>();

    constructor(private importDir: string) {
    }

    /**
     * Info for unit tests.
     */
    public getSelfDiagnostics() {
        return {
            "contextCount": this.sourceContexts.keys.length
        }
    }

    private loadDependency(contextEntry: ContextEntry, baseFile: string, depName: string): SourceContext | undefined {
        // The given import dir is used to locate the dependency (either relative to the base path or via an absolute path).
        // If we cannot find the grammar file that way we try the base folder.
        let basePath = path.dirname(baseFile);
        let fullPath = path.isAbsolute(this.importDir) ? this.importDir : path.join(basePath, this.importDir);
        try {
            let depPath = fullPath + "/" + depName + ".g4";
            fs.accessSync(depPath, fs.constants.R_OK);
            // Target path can be read. Now check the target file.
            contextEntry.dependencies.push(depPath);
            return this.loadGrammar(depPath);
        } catch (e) {
        }

        // File not found. Try other extension.
        try {
            let depPath = fullPath + "/" + depName + ".g";
            fs.accessSync(depPath, fs.constants.R_OK);
            // Target path can be read. Now check the target file.
            contextEntry.dependencies.push(depPath);
            return this.loadGrammar(depPath);
        } catch (e) {
        }

        // Couldn't find it in the import folder. Use the base then.
        try {
            let depPath = basePath + "/" + depName + ".g4";
            fs.statSync(depPath);
            contextEntry.dependencies.push(depPath);
            return this.loadGrammar(depPath);
        } catch (e) {
        };

        try {
            let depPath = basePath + "/" + depName + ".g";
            fs.statSync(depPath);
            contextEntry.dependencies.push(depPath);
            return this.loadGrammar(depPath);
        } catch (e) {
        };

        // Ignore the dependency if we cannot find the source file for it.
        return undefined;
    }

    private parseGrammar(contextEntry: ContextEntry, file: string, source: string) {
        let oldDependencies = contextEntry.dependencies.slice();
        contextEntry.dependencies.length = 0;
        let newDependencies = contextEntry.context.parse(source);

        for (let dep of newDependencies) {
            let depContext = this.loadDependency(contextEntry, file, dep);
            if (depContext)
                contextEntry.context.addDependency(depContext);
        }

        // Release all old dependencies. This will only unload grammars which have
        // not been ref-counted by the above dep loading (or which are not used by other
        // grammars).
        for (let dep of oldDependencies)
            this.releaseGrammar(dep);
    }

    private getContext(fileName: string, source?: string | undefined): SourceContext {
        let contextEntry = this.sourceContexts.get(fileName);
        if (!contextEntry) {
            return this.loadGrammar(fileName, source);
        }
        return contextEntry.context;
    }

    public reparse(fileName: string, source: string) {
        var contextEntry = this.sourceContexts.get(fileName);
        if (!contextEntry) // Not yet loaded?
            this.loadGrammar(fileName, source);
        else
            this.parseGrammar(contextEntry, fileName, source);
    }

    public loadGrammar(fileName: string, source?: string): SourceContext {
        var contextEntry = this.sourceContexts.get(fileName);
        if (!contextEntry) {
            if (!source) {
                try {
                    fs.statSync(fileName);
                    source = fs.readFileSync(fileName, 'utf8');
                } catch (e) {
                    source = "";
                };
            }

            var context = new SourceContext(fileName);
            contextEntry = { context: context, refCount: 0, dependencies: [] };
            this.sourceContexts.set(fileName, contextEntry);

            // Do an initial parse run and load all dependencies of this context
            // and pass their references to this context.
            this.parseGrammar(contextEntry, fileName, source);
        }
        contextEntry.refCount++;
        return contextEntry.context;
    }

    private internalReleaseGrammar(fileName: string, referencing?: ContextEntry) {
        var contextEntry = this.sourceContexts.get(fileName);
        if (contextEntry) {
            if (referencing) {
                // If a referencing context is given remove this one from the reference's dependencies list,
                // which in turn will remove the referencing context from the dependency's referencing list.
                referencing.context.removeDependency(contextEntry.context);
            }

            contextEntry.refCount--;
            if (contextEntry.refCount == 0) {
                this.sourceContexts.delete(fileName);

                // Release also all dependencies.
                for (let dep of contextEntry.dependencies)
                    this.internalReleaseGrammar(dep, contextEntry);
            }
        }
    }

    public releaseGrammar(fileName: string) {
        this.internalReleaseGrammar(fileName);
    }

    public infoForSymbol(fileName: string, column: number, row: number, limitToChildren: boolean = true): SymbolInfo | undefined {
        var context = this.getContext(fileName);
        return context.infoForSymbolAtPosition(column, row, limitToChildren);
    };

    /**
     * Returns the lexical range of the closest symbol scope that covers the given location.
     * @param ruleScope if true find the enclosing rule (if any) and return it's range, instead of the directly enclosing scope.
     */
    public enclosingRangeForSymbol(fileName: string, column: number, row: number, ruleScope: boolean = false): LexicalRange | undefined {
        var context = this.getContext(fileName);
        return context.enclosingRangeForSymbol(column, row, ruleScope);
    }

    public listSymbols(fileName: string, fullList: boolean): SymbolInfo[] {
        var context = this.getContext(fileName);
        return context.listSymbols(!fullList);
    };

    public getCodeCompletionCandidates(fileName: string, column: number, row: number): SymbolInfo[] {
        var context = this.getContext(fileName);
        return context.getCodeCompletionCandidates(column, row);
    };

    public getDiagnostics(fileName: string): DiagnosticEntry[] {
        var context = this.getContext(fileName);
        return context.getDiagnostics();
    };

    public ruleFromPosition(fileName: string, column: number, row: number): string | undefined{
        var context = this.getContext(fileName);
        return context.ruleFromPosition(column, row);
    }

    /**
     * Count how many times a symbol has been referenced. The given file must contain the definition of this symbol.
     */
    public countReferences(fileName: string, symbol: string): number {
        var context = this.getContext(fileName);
        var result: number = context.getReferenceCount(symbol);
        for (let reference of context.references) {
            result += reference.getReferenceCount(symbol);
        }
        return result;
    }

    public getReferenceGraph(fileName: string): Map<string, ReferenceNode> {
        var context = this.getContext(fileName);
        return context.getReferenceGraph();
    }

    public getRRDScript(fileName: string, rule: string): string {
        var context = this.getContext(fileName);

        let result = context.getRRDScript(rule);
        if (!result) {
            for (let reference of context.references) {
                result = reference.getRRDScript(rule);
                if (result) {
                    return result;
                }
            }
            return "";
        }
        return result!;
    };

    private pushDependencyFiles(entry: ContextEntry, parameters: Set<SourceContext>) {
        for (let dep of entry.dependencies) {
            let depEntry = this.sourceContexts.get(dep);
            if (depEntry) {
                this.pushDependencyFiles(depEntry, parameters);
                parameters.add(depEntry.context);
            }
        }
    }

    public generate(fileName: string, options: GenerationOptions): Promise<string[]> {
        var context = this.getContext(fileName);
        let dependencies: Set<SourceContext> = new Set();
        this.pushDependencyFiles(this.sourceContexts.get(fileName)!, dependencies);

        return context.generate(dependencies, options);
    }

    public getATNGraph(fileName: string, rule: string): ATNGraphData | undefined {
        var context = this.getContext(fileName);
        return context.getATNGraph(rule);
    }

}
