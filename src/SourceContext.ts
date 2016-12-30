/*
 * This file is released under the MIT license.
 * Copyright (c) 2016 Mike Lischke
 *
 * See LICENSE file for more info.
 */

"use strict"

// This file contains the handling for a single source file. It provides syntactic and semantic
// informations, symbol lookups and more.

import { ANTLRInputStream, CommonTokenStream, BailErrorStrategy, ParserRuleContext, DefaultErrorStrategy } from 'antlr4ts';
import { PredictionMode } from 'antlr4ts/atn';
import { ParseCancellationException } from 'antlr4ts/misc';
import { ParseTreeWalker, TerminalNode, ParseTree } from 'antlr4ts/tree';

import { ANTLRv4Parser } from '../parser/ANTLRv4Parser';
import { ANTLRv4Lexer } from '../parser/ANTLRv4Lexer';

import { DiagnosticEntry, DiagnosticType } from './index';

import { ContextErrorListener } from './ContextErrorListener';
import { SymbolKind, SymbolTable, SymbolInfo } from './SymbolTable';
import { DetailsListener } from './DetailsListener';
import { SemanticListener } from './SemanticListener';

// One source context per file. Source contexts can reference each other (e.g. for symbol lookups).
export class SourceContext {
    public symbolTable: SymbolTable = new SymbolTable(this);

    constructor(public sourceId: string) {
    }

    public infoForSymbolAtPosition(column: number, row: number): SymbolInfo | undefined {
        let terminal = terminalFromPosition(this.tree, column, row);
        if (!terminal) {
            return null;
        }

        // We only want to show info for symbols in specific contexts.
        let parent = (terminal.parent as ParserRuleContext);
        if (parent.getRuleIndex() == ANTLRv4Parser.RULE_identifier) {
            parent = (terminal.parent as ParserRuleContext);
        }

        switch (parent.getRuleIndex()) {
            case ANTLRv4Parser.RULE_ruleref:
            case ANTLRv4Parser.RULE_terminalRule:
            case ANTLRv4Parser.RULE_lexerCommandExpr:
            case ANTLRv4Parser.RULE_optionValue:
            case ANTLRv4Parser.RULE_delegateGrammar:
            case ANTLRv4Parser.RULE_modeSpec:
                return this.getSymbolInfo(terminal.getText());
        }

        return undefined;
    }

    public listSymbols(includeDependencies: boolean): SymbolInfo[] {
        return this.symbolTable.listSymbols(includeDependencies);
    }

    public parse(source: string): string[] {
        let inputStream = new ANTLRInputStream(source);
        let lexer = new ANTLRv4Lexer(inputStream);
        lexer.removeErrorListeners();
        lexer.addErrorListener(new ContextErrorListener(this.diagnostics));
        let tokenStream = new CommonTokenStream(lexer);

        let parser = new ANTLRv4Parser(tokenStream);
        parser.removeErrorListeners();
        parser.addErrorListener(new ContextErrorListener(this.diagnostics));
        parser.setErrorHandler(new BailErrorStrategy());
        parser.getInterpreter().setPredictionMode(PredictionMode.SLL);

        this.tree = null;
        try {
            this.tree = parser.grammarSpec();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                tokenStream.reset();
                parser.reset();
                parser.setErrorHandler(new DefaultErrorStrategy());
                parser.getInterpreter().setPredictionMode(PredictionMode.LL);
                this.tree = parser.grammarSpec();
            } else {
                throw e;
            }
        }

        this.symbolTable.tree = this.tree;
        let listener: DetailsListener = new DetailsListener(this.symbolTable, this.imports);
        ParseTreeWalker.DEFAULT.walk(listener, this.tree);

        return this.imports;
    }

    public getDiagnostics(): DiagnosticEntry[] {
        let semanticListener = new SemanticListener(this.diagnostics, this.symbolTable);
        ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);

        return this.diagnostics;
    }

    public addDependency(context: SourceContext) {
        this.symbolTable.addDependency(context.symbolTable);
    }

    protected getSymbolInfo(symbol: string): SymbolInfo | undefined {
        return this.symbolTable.getSymbolInfo(symbol);
    }

    private tree: ParserRuleContext; // The root context for the last parse run.
    private imports: string[] = []; // Updated on each parse run.
    private errorListener: ContextErrorListener;
    private diagnostics: DiagnosticEntry[] = [];
};

/**
 * Returns the terminal node at the given position, or null if there is no terminal at that position,
 * which is given as (column, row) pair.
 */
function terminalFromPosition(root: ParseTree, column: number, row: number): TerminalNode | undefined {
    // Does the root node actually contain the position? If not we don't need to look further.
    if (root instanceof TerminalNode) {
        let terminal: TerminalNode = <TerminalNode>root;
        let token = terminal.getSymbol();
        if (token.getLine() != row)
            return undefined;

        let tokenStop = token.getCharPositionInLine() + (token.getStopIndex() - token.getStartIndex() + 1);
        if (token.getCharPositionInLine() <= column && tokenStop >= column) {
            return terminal;
        }
        return undefined;
    } else {
        let context = (root as ParserRuleContext);
        if (!context.start || !context.stop) { // Invalid tree?
            return undefined;
        }

        if (context.start.getLine() > row || (context.start.getLine() == row && column < context.start.getCharPositionInLine())) {
            return undefined;
        }

        let tokenStop = context.stop.getCharPositionInLine() + (context.stop.getStopIndex() - context.stop.getStartIndex() + 1);
        if (context.stop.getLine() < row || (context.stop.getLine() == row && tokenStop < column)) {
            return undefined;
        }

        for (var i = 0; i < context.getChildCount(); ++i) {
            let result = terminalFromPosition(context.getChild(i), column, row);
            if (result) {
                return result;
            }
        }

    }

    return undefined;
}
