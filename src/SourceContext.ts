/*
 * This file is released under the MIT license.
 * Copyright (c) 2016, 2017, Mike Lischke
 *
 * See LICENSE file for more info.
 */

"use strict"

// This file contains the handling for a single source file. It provides syntactic and semantic
// informations, symbol lookups and more.

import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import {
    ANTLRInputStream, CommonTokenStream, BailErrorStrategy, DefaultErrorStrategy, Token, LexerInterpreter,
    ParserInterpreter, CharStream, RuleContext, ParserRuleContext
} from 'antlr4ts';
import { PredictionMode, ATNState, RuleTransition, TransitionType, ATNStateType } from 'antlr4ts/atn';
import { ParseCancellationException } from 'antlr4ts/misc';
import { ParseTreeWalker, TerminalNode, ParseTree } from 'antlr4ts/tree';

import { CodeCompletionCore, Symbol, ScopedSymbol, LiteralSymbol } from "antlr4-c3";

import { ANTLRv4Parser, ParserRuleSpecContext, LexerRuleSpecContext, GrammarSpecContext, RuleSpecContext, OptionsSpecContext, TokensSpecContext } from '../parser/ANTLRv4Parser';
import { ANTLRv4Lexer } from '../parser/ANTLRv4Lexer';

import {
    SymbolKind, SymbolInfo, DiagnosticEntry, DiagnosticType, ReferenceNode, ATNGraphData, GenerationOptions
} from './AntlrLanguageSupport';

import { ContextErrorListener } from './ContextErrorListener';
import {
    GrapsSymbolTable, BuiltInChannelSymbol, BuiltInLexerTokenSymbol, BuiltInModeSymbol, LexerTokenSymbol, ParserRuleSymbol
} from './GrapsSymbolTable';
import { DetailsListener } from './DetailsListener';
import { SemanticListener } from './SemanticListener';
import { RuleVisitor } from './RuleVisitor';
import { InterpreterDataReader } from "./InterpreterDataReader";
import { ErrorParser } from "./ErrorParser";
import { LexicalRange } from "../index";

enum GrammarType { Unknown, Parser, Lexer, Combined };

// One source context per file. Source contexts can reference each other (e.g. for symbol lookups).
export class SourceContext {
    public symbolTable: GrapsSymbolTable = new GrapsSymbolTable("Context", { allowDuplicateSymbols: true }, this);
    public references: SourceContext[] = []; // Contexts referencing us.
    public sourceId: string;

    /** @internal */
    public diagnostics: DiagnosticEntry[] = [];

    constructor(private fileName: string) {
        this.sourceId = path.basename(fileName);

        // Initialize static global symbol table, if not yet done.
        if (!SourceContext.globalSymbols.resolve("EOF")) {
            SourceContext.globalSymbols.addNewSymbolOfType(BuiltInChannelSymbol, undefined, "DEFAULT_TOKEN_CHANNEL");
            SourceContext.globalSymbols.addNewSymbolOfType(BuiltInChannelSymbol, undefined, "HIDDEN");
            SourceContext.globalSymbols.addNewSymbolOfType(BuiltInLexerTokenSymbol, undefined, "EOF");
            SourceContext.globalSymbols.addNewSymbolOfType(BuiltInModeSymbol, undefined, "DEFAULT_MODE");
        }
    }

    public infoForSymbolAtPosition(column: number, row: number, limitToChildren: boolean): SymbolInfo | undefined {
        let terminal = parseTreeFromPosition(this.tree!, column, row);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }

        // If limitToChildren is set we only want to show info for symbols in specific contexts.
        // These are contexts which are used as subrules in rule definitions.
        if (!limitToChildren) {
            return this.getSymbolInfo(terminal.text);
        }

        let parent = (terminal.parent as RuleContext);
        if (parent.ruleIndex == ANTLRv4Parser.RULE_identifier) {
            parent = (parent.parent as RuleContext);
        }

        switch (parent.ruleIndex) {
            case ANTLRv4Parser.RULE_ruleref:
            case ANTLRv4Parser.RULE_terminalRule:
            case ANTLRv4Parser.RULE_lexerCommandExpr:
            case ANTLRv4Parser.RULE_optionValue:
            case ANTLRv4Parser.RULE_delegateGrammar:
            case ANTLRv4Parser.RULE_modeSpec:
            case ANTLRv4Parser.RULE_setElement:
                return this.getSymbolInfo(terminal.text);
        }

        return undefined;
    }

    public enclosingRangeForSymbol(column: number, row: number, ruleScope: boolean): LexicalRange | undefined {
        let context = parseTreeFromPosition(this.tree!, column, row);
        if (!context) {
            return;
        }

        if (context instanceof TerminalNode) {
            context = context.parent;
        }

        if (ruleScope) {
            let run = context;
            while (run && !(run instanceof RuleSpecContext) && !(run instanceof OptionsSpecContext) && !(run instanceof TokensSpecContext)) {
                run = run.parent;
            }
            if (run) {
                context = run;
            }
        }

        if (context instanceof ParserRuleContext) {
            if (context.stop) {
                return {
                    start: { column: context.start.charPositionInLine, row: context.start.line },
                    end: { column: context.stop.charPositionInLine, row: context.stop.line }
                };
            }

            let length = context.start.inputStream!.size - context.start.startIndex + 1;
            return {
                start: { column: context.start.charPositionInLine, row: context.start.line },
                end: { column: context.start.charPositionInLine + length, row: context.start.line }
            };
        }
    }

    public listSymbols(includeDependencies: boolean): SymbolInfo[] {
        return this.symbolTable.listSymbols(includeDependencies);
    }

    public getCodeCompletionCandidates(column: number, row: number): SymbolInfo[] {
        let core = new CodeCompletionCore(this.parser);
        core.showResult = false;

        // Search the token index which covers our caret position.
        let index: number;
        for (index = 0; ; ++index) {
            let token = this.parser.inputStream.get(index);
            if (token.type == Token.EOF) {
                break;
            }
            if (token.line > row
                || (token.line === row && token.charPositionInLine >= column)) {
                break;
            }
        }

        let candidates = core.collectCandidates(index);
        let result: SymbolInfo[] = [];
        candidates.tokens.forEach((following: number[], type: number) => {
            switch (type) {
                case ANTLRv4Lexer.TOKEN_REF:
                //break;

                default:
                    result.push({
                        kind: SymbolKind.LexerToken,
                        name: this.parser.vocabulary.getDisplayName(type),
                        source: "",
                        definition: undefined
                    });
                    break;
            }
        });
        return result;
    }

    public parse(source: string): string[] {
        let inputStream = new ANTLRInputStream(source);
        let lexer = new ANTLRv4Lexer(inputStream);
        lexer.removeErrorListeners();
        lexer.addErrorListener(this.errorListener);
        let tokenStream = new CommonTokenStream(lexer);

        // Keep the current parser instance for code completion.
        this.parser = new ANTLRv4Parser(tokenStream);
        this.parser.removeErrorListeners();
        this.parser.addErrorListener(this.errorListener);
        this.parser.errorHandler = new BailErrorStrategy();
        this.parser.interpreter.setPredictionMode(PredictionMode.SLL);

        this.tree = undefined;
        this.lexerInterpreter = undefined;
        this.parserInterpreter = undefined;
        this.semanticAnalysisDone = false;
        this.diagnostics.length = 0;
        this.imports.length = 0;
        this.grammarType = GrammarType.Unknown;

        this.symbolTable.clear();
        this.symbolTable.addDependencies(SourceContext.globalSymbols);
        try {
            this.tree = this.parser.grammarSpec();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                tokenStream.reset();
                this.parser.reset();
                this.parser.errorHandler = new DefaultErrorStrategy();
                this.parser.interpreter.setPredictionMode(PredictionMode.LL);
                this.tree = this.parser.grammarSpec();
            } else {
                throw e;
            }
        }

        if (this.tree && this.tree.childCount > 0) {
            let typeContext = this.tree.grammarType();
            if (typeContext.LEXER()) {
                this.grammarType = GrammarType.Lexer;
            } else if (typeContext.PARSER()) {
                this.grammarType = GrammarType.Parser;
            } else {
                this.grammarType = GrammarType.Combined;
            }
        }
        this.symbolTable.tree = this.tree;
        let listener: DetailsListener = new DetailsListener(this.symbolTable, this.imports);
        ParseTreeWalker.DEFAULT.walk(listener, this.tree);

        return this.imports;
    }

    public getDiagnostics(): DiagnosticEntry[] {
        this.runSemanticAnalysisIfNeeded();

        return this.diagnostics;
    }

    // Returns all rules with a reference count of 0.
    public getUnreferencedRules(): string[] {
        return this.symbolTable.getUnreferencedSymbols();
    }

    public getReferenceGraph(): Map<string, ReferenceNode> {
        this.runSemanticAnalysisIfNeeded();

        let result = new Map();
        for (let symbol of this.symbolTable.getAllSymbols(Symbol, true)) {
            if (symbol instanceof ParserRuleSymbol || symbol instanceof LexerTokenSymbol) {
                let entry: ReferenceNode = { rules: [], tokens: [], literals: [] };
                for (let child of symbol.getAllSymbols(ParserRuleSymbol, true)) {
                    entry.rules.push(child.name);
                }
                for (let child of symbol.getAllSymbols(LexerTokenSymbol, true)) {
                    entry.tokens.push(child.name);
                }
                for (let child of symbol.getAllSymbols(LiteralSymbol, true)) {
                    entry.literals.push(child.name);
                }
                result.set(symbol.name, entry);
            }
        }
        return result;
    }

    public getRRDScript(ruleName: string): string | undefined {
        this.runSemanticAnalysisIfNeeded();

        return this.rrdScripts.get(ruleName)!;
    }

    public addDependency(context: SourceContext) {
        // Check for mutual inclusion. Since dependencies are organized like a mesh
        // we use a work pipeline to check all relevant referencing contexts.
        var pipeline: SourceContext[] = [context];
        while (pipeline.length > 0) {
            let current = pipeline.shift();
            if (!current) {
                continue;
            }

            if (current.references.indexOf(this) > -1) {
                return; // Already in the list.
                // TODO: add diagnostic entry for this case.
            }

            pipeline.push(...current.references);
        }
        this.references.push(context);
        this.symbolTable.addDependencies(context.symbolTable);
    }

    /**
     * Remove the given context from our list of dependencies.
     */
    public removeDependency(context: SourceContext) {
        let index = context.references.indexOf(this);
        if (index > -1) {
            context.references.splice(index, 1);
        }
        this.symbolTable.removeDependency(context.symbolTable);
    }

    public getReferenceCount(symbol: string): number {
        return this.symbolTable.getReferenceCount(symbol);
    }

    public ruleFromPosition(column: number, row: number): string | undefined {
        let terminal = parseTreeFromPosition(this.tree!, column, row);
        if (!terminal) {
            return;
        }

        let context: RuleContext | undefined = (terminal as RuleContext);
        while (context && context.ruleIndex != ANTLRv4Parser.RULE_parserRuleSpec && context.ruleIndex != ANTLRv4Parser.RULE_lexerRuleSpec) {
            context = context.parent;
        }

        if (context) {
            if (context.ruleIndex == ANTLRv4Parser.RULE_parserRuleSpec) {
                return (context as ParserRuleSpecContext).RULE_REF().text;
            }
            return (context as LexerRuleSpecContext).TOKEN_REF().text;
        }
        return;
    }

    /**
     * Use ANTLR4 jars to generate target files for the grammar managed in this context and all its dependencies.
     * @param dependencies A list of additional grammars which need generation too.
     * @param options Options to customize the generation process.
     * @returns List of names of all participating files.
     */
    public generate(dependencies: Set<SourceContext>, options: GenerationOptions): Promise<string[]> {
        if (options.loadOnly) {
            this.setupInterpreters(options.outputDir);
            return new Promise<string[]>((resolve, reject) => {
                resolve([]);
            });
        }

        let thisRef = this;
        return new Promise<string[]>((resolve, reject) => {
            let parameters = ["-jar"];
            if (options.alternativeJar) {
                parameters.push(options.alternativeJar);
            } else {
                if (options.language === "typescript") {
                    parameters.push(path.join(__dirname, '../../antlr/antlr4-typescript-4.6-SNAPSHOT-complete.jar'));
                } else {
                    parameters.push(path.join(__dirname, '../../antlr/antlr4-4.7.1-SNAPSHOT-complete.jar'));
                }
            }

            if (options.language) {
                parameters.push("-Dlanguage=" + options.language);
            }

            parameters.push("-message-format");
            parameters.push("antlr");
            if (options.libDir) {
                parameters.push("-lib");
                parameters.push(options.libDir);
            }

            if (options.outputDir) {
                parameters.push("-o");
                parameters.push(options.outputDir);
            }

            if (options.package) {
                parameters.push("-package");
                parameters.push(options.package);
            }

            let genListener = options.listeners == undefined || options.listeners === true;
            parameters.push(genListener ? "-listener" : "-no-listener");
            parameters.push(options.visitors === true ? "-visitor" : "-no-visitor");
            dependencies.add(thisRef); // Needs this also in the error parser.

            let fileList: string[] = [];
            for (let dependency of dependencies) {
                fileList.push(dependency.fileName);
            }
            parameters.push(...fileList);

            let spawnOptions = { cwd: options.baseDir ? options.baseDir : undefined };
            let java = child_process.spawn("java", parameters, spawnOptions);
            let exception = "";
            java.stderr.on("data", (data) => {
                let text = data.toString();
                if (exception.length > 0) {
                    // We got a Java execution exception. Return it as is, so the caller can show that
                    // to the user, instead of interpreting it as a grammar error.
                    exception += text;
                } else {
                    let parser = new ErrorParser(dependencies);
                    if (parser.convertErrorsToDiagnostics(text)) {
                        resolve(fileList);
                    } else {
                        exception += text;
                    }
                }
            });

            java.on("close", (code) => {
                if (exception.length > 0) {
                    // Report an execution exception as is, if there's any.
                    reject(exception);
                }

                thisRef.setupInterpreters(options.outputDir);
                resolve(fileList);
            });
        });
    }

    public getATNGraph(rule: string): ATNGraphData | undefined {
        let isLexerRule = rule[0] == rule[0].toUpperCase();
        if ((isLexerRule && !this.lexerInterpreter) || (!isLexerRule && !this.parserInterpreter)) {
            // Requires a generation run.
            return;
        }

        let ruleIndexMap = isLexerRule ? this.lexerInterpreter!.getRuleIndexMap() : this.parserInterpreter!.getRuleIndexMap();
        if (!ruleIndexMap.has(rule)) {
            return;
        }
        let ruleIndex: number = ruleIndexMap.get(rule)!;

        let atn = isLexerRule ? this.lexerInterpreter!.atn : this.parserInterpreter!.atn;
        let ruleNames = isLexerRule ? this.lexerInterpreter!.ruleNames : this.parserInterpreter!.ruleNames;
        let vocabulary = isLexerRule ? this.lexerInterpreter!.vocabulary : this.parserInterpreter!.vocabulary;

        let startState = atn.ruleToStartState[ruleIndex];
        let stopState = atn.ruleToStopState[ruleIndex];

        let seenStates: Set<ATNState> = new Set([startState]);
        let pipeline: ATNState[] = [startState];

        let result = new ATNGraphData();
        result.links = [];
        result.nodes = [];
        let stateToIndex = new Map<number, number>();

        // First collect all ATN states that belong to this rule, so we can reference them in our links list.
        for (let state of atn.states) {
            if (state.ruleIndex == ruleIndex) {
                stateToIndex.set(state.stateNumber, result.nodes.length);
                result.nodes.push({ name: state.stateNumber.toString(), type: state.stateType });

                let transitions = state.getTransitions();
                // If this state transits to a new rule create also a fake node for that rule.
                if (transitions.length == 1 && transitions[0].target.stateType == ATNStateType.RULE_START) {
                    let marker = state.stateNumber * transitions[0].target.stateNumber;
                    stateToIndex.set(marker, result.nodes.length);
                    // Type 13 is a fake type denoting a rule. It's one beyond the highest ATNStateType values.
                    result.nodes.push({ name: ruleNames[transitions[0].target.ruleIndex], type: 13 });
                }
            }
        }

        while (pipeline.length > 0) {
            let state = pipeline.shift()!;

            let nodeIndex = stateToIndex.get(state.stateNumber)!; // Must exist.

            for (let transition of state.getTransitions()) {
                // Rule stop states usually point to the follow state in the calling rule, but can also
                // point to a state in itself if the rule is left recursive. In any case we don't need to follow
                // transitions going out from a stop state.
                if (state == stopState)
                    continue;

                let transitsToRule = transition.target.stateType == ATNStateType.RULE_START;
                let marker = transition.target.stateNumber * (transitsToRule ? state.stateNumber : 1);
                let link = {
                    source: nodeIndex, target: stateToIndex.get(marker)!, type: transition.serializationType,
                    labels: new Array<string>()
                };
                if (transition.isEpsilon) {
                    link.labels.push("ε");
                } else {
                    if (transition.label) {
                        for (let label of transition.label.toList()) {
                            if (isLexerRule) {
                                link.labels.push("'" + String.fromCharCode(label) + "'");
                            } else {
                                link.labels.push(vocabulary.getDisplayName(label));
                            }
                        }
                    }
                }
                result.links.push(link);

                let nextState: ATNState;
                if (transitsToRule) {
                    // Target is a state in a different rule (or this rule if left recursive).
                    // Add a backlink from that subrule into ours.
                    nextState = (transition as RuleTransition).followState;
                    let link = {
                        source: stateToIndex.get(marker)!, target: stateToIndex.get(nextState.stateNumber)!,
                        type: TransitionType.RULE, labels: ["ε"]
                    };
                    result.links.push(link);
                } else {
                    nextState = transition.target;
                }

                if (seenStates.has(nextState))
                    continue;

                seenStates.add(nextState);
                pipeline.push(nextState);
            }
        }

        return result;
    }

    public getSymbolInfo(symbol: string): SymbolInfo | undefined {
        return this.symbolTable.getSymbolInfo(symbol);
    }

    private runSemanticAnalysisIfNeeded() {
        if (!this.semanticAnalysisDone) {
            this.semanticAnalysisDone = true;
            //this.diagnostics.length = 0; Don't, we would lose our syntax errors from last parse run.
            this.rrdScripts = new Map();
            let semanticListener = new SemanticListener(this.diagnostics, this.symbolTable);
            ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree!);

            let visitor = new RuleVisitor(this.rrdScripts);
            let t = visitor.visit(this.tree!);
        }
    }

    /**
     * Loads interpreter data if it exists and sets up the interpreters.
     */
    private setupInterpreters(outputDir?: string) {
        // Load interpreter data if the code generation was successfull.
        // For that we only need the final parser and lexer files, not any imported stuff.
        // The target path is either the output path (if one was given) or the grammar path.
        let lexerFile = "";
        let parserFile = "";
        let baseName = (this.fileName.endsWith(".g4") ? path.basename(this.fileName, ".g4") : path.basename(this.fileName, ".g"));
        let grammarPath = (outputDir) ? outputDir : path.dirname(this.fileName);
        switch (this.grammarType) {
            case GrammarType.Parser:
                if (baseName.endsWith("Parser")) {
                    baseName = baseName.substr(0, baseName.length - "Parser".length);
                }
                parserFile = path.join(grammarPath, baseName) + "Parser.interp"
                lexerFile = path.join(grammarPath, baseName) + "Lexer.interp"
                break;

            case GrammarType.Lexer:
                lexerFile = path.join(grammarPath, baseName) + ".interp"
                break;

            case GrammarType.Combined:
                if (baseName.endsWith("Parser")) {
                    baseName = baseName.substr(0, baseName.length - "Parser".length);
                }
                parserFile = path.join(grammarPath, baseName) + ".interp"
                lexerFile = path.join(grammarPath, baseName) + "Lexer.interp"
                break;

            default: // Unknown, no data is loaded.
                break;
        }

        if (fs.existsSync(lexerFile)) {
            let data = InterpreterDataReader.parseFile(lexerFile);
            this.input = new ANTLRInputStream(""); // Will be overwritten on interpreter runs.
            this.lexerInterpreter = new LexerInterpreter(this.fileName, data.vocabulary, data.modes, data.ruleNames, data.atn, this.input);
            this.tokens = new CommonTokenStream(this.lexerInterpreter);
        }

        if (this.lexerInterpreter && fs.existsSync(parserFile)) {
            let data = InterpreterDataReader.parseFile(parserFile);
            this.parserInterpreter = new ParserInterpreter(this.fileName, data.vocabulary, data.ruleNames, data.atn, this.tokens!)
        }
    }

    private static globalSymbols = new GrapsSymbolTable("Global Symbols", { allowDuplicateSymbols: false });

    // Interpreter infrastructure.
    private input: CharStream | undefined;
    private tokens: CommonTokenStream | undefined;
    private lexerInterpreter: LexerInterpreter | undefined;
    private parserInterpreter: ParserInterpreter | undefined;

    // Result related fields.
    //private diagnostics: DiagnosticEntry[] = [];
    private rrdScripts: Map<string, string>;
    private semanticAnalysisDone: boolean = false; // Includes determining reference counts.

    // Grammar parsing infrastructure.
    private grammarType: GrammarType;
    private parser: ANTLRv4Parser;
    private errorListener: ContextErrorListener = new ContextErrorListener(this.diagnostics);

    private tree: GrammarSpecContext | undefined; // The root context from the last parse run.
    private imports: string[] = []; // Updated on each parse run.
};

/**
 * Returns the parse tree which covers the given position or undefined if none could be found.
 */
function parseTreeFromPosition(root: ParseTree, column: number, row: number): ParseTree | undefined {
    // Does the root node actually contain the position? If not we don't need to look further.
    if (root instanceof TerminalNode) {
        let terminal = (root as TerminalNode);
        let token = terminal.symbol;
        if (token.line != row)
            return undefined;

        let tokenStop = token.charPositionInLine + (token.stopIndex - token.startIndex + 1);
        if (token.charPositionInLine <= column && tokenStop >= column) {
            return terminal;
        }
        return undefined;
    } else {
        let context = (root as ParserRuleContext);
        if (!context.start || !context.stop) { // Invalid tree?
            return undefined;
        }

        if (context.start.line > row || (context.start.line == row && column < context.start.charPositionInLine)) {
            return undefined;
        }

        let tokenStop = context.stop.charPositionInLine + (context.stop.stopIndex - context.stop.startIndex + 1);
        if (context.stop.line < row || (context.stop.line == row && tokenStop < column)) {
            return undefined;
        }

        if (context.children) {
            for (let child of context.children) {
                let result = parseTreeFromPosition(child, column, row);
                if (result) {
                    return result;
                }
            }
        }
        return context;

    }
}
