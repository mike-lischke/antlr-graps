/*
 * This file is released under the MIT license.
 * Copyright (c) 2016, 2018, Mike Lischke
 *
 * See LICENSE file for more info.
 */

"use strict";

import { ANTLRv4ParserListener } from '../parser/ANTLRv4ParserListener';
import {
    LexerRuleSpecContext, ParserRuleSpecContext, TokensSpecContext, ChannelsSpecContext,
    ModeSpecContext, DelegateGrammarContext, OptionContext, TerminalRuleContext, RulerefContext,
    OptionValueContext, BlockContext, AlternativeContext, RuleBlockContext, EbnfSuffixContext,
    OptionsSpecContext, ActionBlockContext, ArgActionBlockContext
} from '../parser/ANTLRv4Parser';

import { SymbolKind } from '../index';
import {
    GrapsSymbolTable, FragmentTokenSymbol, TokenSymbol, TokenReferenceSymbol, RuleSymbol, RuleReferenceSymbol,
    VirtualTokenSymbol, TokenChannelSymbol, LexerModeSymbol, ImportSymbol, TokenVocabSymbol, definitionForContext,
    AlternativeSymbol,
    EbnfSuffixSymbol,
    OptionsSymbol,
    ActionSymbol,
    ArgumentSymbol
} from './GrapsSymbolTable';

import { ScopedSymbol, LiteralSymbol, BlockSymbol, Symbol } from "antlr4-c3";
import { TerminalNode, ParseTree } from 'antlr4ts/tree';

export class DetailsListener implements ANTLRv4ParserListener {
    constructor(private symbolTable: GrapsSymbolTable, private imports: string[]) { }

    enterLexerRuleSpec(ctx: LexerRuleSpecContext) {
        let tokenRef = ctx.TOKEN_REF();
        if (tokenRef) {
            if (ctx.FRAGMENT()) {
                this.currentSymbol = this.symbolTable.addNewSymbolOfType(FragmentTokenSymbol, undefined, tokenRef.text);
                this.currentSymbol.context = ctx;
            } else {
                this.currentSymbol = this.symbolTable.addNewSymbolOfType(TokenSymbol, undefined, tokenRef.text);
                this.currentSymbol.context = ctx;
            }
        }
    }

    enterParserRuleSpec(ctx: ParserRuleSpecContext) {
        this.currentSymbol = this.symbolTable.addNewSymbolOfType(RuleSymbol, undefined, ctx.RULE_REF().text);
        this.currentSymbol.context = ctx;
    }

    exitParserRuleSpec(ctx: ParserRuleSpecContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(TokenSymbol, this.currentSymbol as ScopedSymbol, ";");
        try {
            symbol.context = ctx.SEMI();
        } catch (e) {
        }

        if (this.currentSymbol) {
            this.currentSymbol = this.currentSymbol.parent as ScopedSymbol;
        }
    }

    enterRuleBlock(ctx: RuleBlockContext) {
        this.currentSymbol = this.symbolTable.addNewSymbolOfType(BlockSymbol, this.currentSymbol as ScopedSymbol, "");
    }

    exitRuleBlock(ctx: RuleBlockContext) {
        if (this.currentSymbol) {
            this.currentSymbol = this.currentSymbol.parent as ScopedSymbol;
        }
    }

    enterBlock(ctx: BlockContext) {
        this.currentSymbol = this.symbolTable.addNewSymbolOfType(BlockSymbol, this.currentSymbol as ScopedSymbol, "");
        this.currentSymbol.context = ctx;
    }

    exitBlock(ctx: BlockContext) {
        if (this.currentSymbol) {
            this.currentSymbol = this.currentSymbol.parent as ScopedSymbol;
        }
    }

    enterAlternative(ctx: AlternativeContext) {
        this.currentSymbol = this.symbolTable.addNewSymbolOfType(AlternativeSymbol, this.currentSymbol as ScopedSymbol, "");
        this.currentSymbol.context = ctx;
    }

    exitAlternative(ctx: AlternativeContext) {
        if (this.currentSymbol) {
            this.currentSymbol = this.currentSymbol.parent as ScopedSymbol;
        }
    }

    enterTokensSpec(ctx: TokensSpecContext) {
        let idList = ctx.idList();
        if (idList) {
            for (let identifier of idList.identifier()) {
                let symbol = this.symbolTable.addNewSymbolOfType(VirtualTokenSymbol, undefined, identifier.text);
                symbol.context = ctx;
            }
        }
    }

    enterTerminalRule(ctx: TerminalRuleContext) {
        if (this.currentSymbol) {
            if (ctx.TOKEN_REF()) {
                let refName = ctx.TOKEN_REF()!.text;
                if (!this.currentSymbol.resolve(refName, true)) { // A rule can be referenced more than once.
                    let symbol = this.symbolTable.addNewSymbolOfType(TokenReferenceSymbol,
                        this.currentSymbol as ScopedSymbol, refName);
                    symbol.context = ctx.TOKEN_REF();
                }
            } else {
                // Must be a string literal then.
                let refName = ctx.STRING_LITERAL()!.text;
                refName = refName.substring(1, refName.length - 1);
                if (!this.currentSymbol.resolve(refName, true)) {
                    let symbol = this.symbolTable.addNewSymbolOfType(LiteralSymbol, this.currentSymbol as ScopedSymbol,
                        refName);
                    symbol.context = ctx.STRING_LITERAL();
                }
            }
        }
    }

    enterRuleref(ctx: RulerefContext) {
        if (ctx.RULE_REF() && this.currentSymbol) {
            let refName = ctx.RULE_REF()!.text;
            if (!this.currentSymbol.resolve(refName, true)) {
                let symbol = this.symbolTable.addNewSymbolOfType(RuleReferenceSymbol, this.currentSymbol as ScopedSymbol,
                    refName);
                symbol.context = ctx.RULE_REF();
            }
        }
    }

    enterChannelsSpec(ctx: ChannelsSpecContext) {
        let idList = ctx.idList();
        if (idList) {
            for (let identifier of idList.identifier()) {
                let symbol = this.symbolTable.addNewSymbolOfType(TokenChannelSymbol, undefined, identifier.text);
                symbol.context = ctx;
            }
        }
    }

    exitModeSpec(ctx: ModeSpecContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(LexerModeSymbol, undefined, ctx.identifier().text);
        symbol.context = ctx;
    }

    exitDelegateGrammar(ctx: DelegateGrammarContext) {
        let context = ctx.identifier()[ctx.identifier().length - 1];
        if (context) {
            let name = definitionForContext(context, false)!.text;
            let symbol = this.symbolTable.addNewSymbolOfType(ImportSymbol, undefined, name);
            symbol.context = ctx;
            this.imports.push(name);
        }
    }

    enterOptionsSpec(ctx: OptionsSpecContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(OptionsSymbol, undefined, "options");
        symbol.context = ctx;
    }

    exitOption(ctx: OptionContext) {
        let option = ctx.identifier().text;
        if (option.toLowerCase() == "tokenvocab" && ctx.tryGetRuleContext(0, OptionValueContext)) {
            let name = ctx.optionValue().text;
            let symbol = this.symbolTable.addNewSymbolOfType(TokenVocabSymbol, undefined, name);
            symbol.context = ctx;
            this.imports.push(name);
        }
    }

    enterEbnfSuffix(ctx: EbnfSuffixContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(EbnfSuffixSymbol, this.currentSymbol as ScopedSymbol,
            ctx.text);
        symbol.context = ctx;
    }

    enterActionBlock(ctx: ActionBlockContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(ActionSymbol, undefined, "action");
        symbol.context = ctx;
    }

    enterArgActionBlock(ctx: ArgActionBlockContext) {
        let symbol = this.symbolTable.addNewSymbolOfType(ArgumentSymbol, undefined, "argument");
        symbol.context = ctx;
    }

    private currentSymbol: Symbol | undefined;
};
