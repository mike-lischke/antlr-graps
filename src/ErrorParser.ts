/*
 * This file is released under the MIT license.
 * Copyright (c) 2016, 2017, Mike Lischke
 *
 * See LICENSE file for more info.
 */

"use strict";

import * as path from "path";

import { DiagnosticEntry, DiagnosticType } from "../index";
import { SourceContext } from "./SourceContext";

/**
 * ANTLR uses ST templates for generating messages. We use the "antlr" message format which is generated from
 * the following template rules:
 *   location(file, line, column) ::= "<file>:<line>:<column>:"
 *   message(id, text) ::= "(<id>) <text>"
 *   report(location, message, type) ::= "<type>(<message.id>): <location> <message.text>"
 *   wantsSingleLineMessage() ::= "false"
 */

export class ErrorParser {
	private static errorPattern = /(\w+)\s*\((\d+)\):\s*([^:]*):(\d*):(\d*):\s*(.+)/;
	private static errorCodeToPattern: Map<number, RegExp> = new Map([
		[8, /grammar name (\w+)/],
		[56, /:\s+(\w+)/],
		[57, /rule (\w+) in non-local ref (\w+)/],
		[63, /reference (\w+) in (\w+)/],
		[64, /parameter (\w+) of rule (\w+) is not accessible in this scope: (\w+)/],
		[65, /attribute (\w+) for rule (\w+) in (\w+)/],
		[66, /attribute (\w+) isn't a valid property in (\w+)/],
		[67, /reference (\w+) in (\w+)/],
		[69, /label (\w+)/],
		[70, /label (\w+)/],
		[72, /label (\w+)/],
		[73, /label (\w+)/],
		[74, /label (\w+)/],
		[75, /label (\w+)[^:]+: (\w+)/],
		[76, /value (\w+)/],
		[79, /reference: (\w+)/],
		[80, /rule (\w+)/],
		[84, /value (\w+)/],
		[94, /of (\w+)/],
		[106, /rule (\w+)/],
		[108, /name (\w+)/],
		[110, /grammar (\w+)/],
		[111, /import \w+ grammar (\w+)/],
		[113, /import \w+ grammar (\w+)/],
		[160, /file (\w+)/],
		[118, /alt (\w+)/],
		[122, /rule (\w+)/],
		[123, /alt label (\w+) redefined in rule (\w+), originally in rule (\w+)/],
		[124, /label (\w+) conflicts with rule (\w+)/],

		[125, /of token (\w+)/],
		[126, /grammar: (\w+)/],
		[128, /actions: (\$\w+)/],
		[130, /label (\w+)/],
		[131, /block \(\)(\w+)/],
		[132, /rule (\w+)/],
		[133, /rule (\w+)/],
		[134, /symbol (\w+)/],
		//[134, /rule reference (\w+)/], Duplicate error code.
		[135, /label (\w+)/],
		[136, /value (\w+)/],
		[137, /value (\w+)/],
		[138, /parameter (\w+)/],
		[139, /parameter (\w+)/],
		[140, /local (\w+)/],
		[141, /local (\w+)/],
		[142, /local (\w+)/],
		[143, /local (\w+)/],
		[144, /sets: (\w+)/],
		[145, /mode (\w+)/],
		[146, /rule (\w+)/],
		[147, /rule (\w+)/],
		[148, /rule (\w+)/],
		[149, /command (\w+)/],
		[150, /command (\w+)/],
		[151, /command (\w+)/],
		[153, /rule (\w+)/],
		[154, /rule (\w+)/],
		[155, /rule (\w+)/],
		[156, /sequence (\w+)/],
		[158, /rule (\w+)/],
		[159, /name (\w+)/],
		[161, /channel (\w+)/],
		[162, /channel (\w+)/],
		[169, /rule (\w+)/],
		[170, /mode (\w+)/],
		[171, /name (\w+)/],
		[172, /name (\w+)/],
		[173, /name (\w+)/],
		[174, /empty: (\w+)/],
		[175, /(\w+) is not/],
		[176, /(\w+) is not/],
		[177, /(\w+) is not/],
		[178, /command (\w+)/],
		[179, /commands (\w+)/],
		[180, /in set (\w+)/],
		[181, /parser: ('[^']+'\.\.'[^']+')/],
		[182, /range: (\w+)/],
	]);

	constructor(private contexts: Set<SourceContext>) {
		contexts.forEach(context => {
			context.diagnostics.length = 0; // Remove all diagnostics we found ourselve. We use ANTLR generated ones now.
		})
	}

    /**
     * Converts errors genrated by the ANTLR tool into our diagnostics structure for reporting.
     */
	public convertErrorsToDiagnostics(text: string): boolean {
		let lines = text.split("\n");
		for (let line of lines) {
			if (line.length > 0) {
				let matches = ErrorParser.errorPattern.exec(line);
				if (!matches) {
					// If we find something that doesn't conform to an ANTLR error we got probably
					// another unexpected error (crash in ANTLR, execution problem etc.).
					// Return a flag to indicate that.
					return false;
				} else {
					let fileName = matches[3];

					// Find the context this error belongs to.
					let context: SourceContext | undefined;
					for (let candidate of this.contexts) {
						if (path.basename(candidate.fileName) === fileName) {
							context = candidate;
							break;
						}
					}
					if (!context) {
						continue;
					}

					let errorCode = Number(matches[2]);
					let errorText = matches[6];

					// The error message contains positioning information if only a single symbol is causing
					// the problem. For many error messages, however, there are multiple symbols involved (e.g. indirect left
					// recursion) or non-symbol related problems occured (e.g. grammar name doesn't match file name).
					// For all these cases we need to scan the error message for details.
					if (matches[4].length > 0) {
						let range = {
							start: { row: Number(matches[4]), column: Number(matches[5]) },
							end: { row: Number(matches[4]), column: Number(matches[5]) + 1 }
						};

						switch (errorCode) {
							case 8: // "grammar name <arg> and file name <arg2> differ", ErrorSeverity.ERROR
							case 56: // "reference to undefined rule: <arg>", ErrorSeverity.ERROR
							case 57: // "reference to undefined rule <arg> in non-local ref <arg3>", ErrorSeverity.ERROR
							case 63: // "unknown attribute reference <arg> in <arg2>", ErrorSeverity.ERROR
							case 64: // "parameter <arg> of rule <arg2> is not accessible in this scope: <arg3>", ErrorSeverity.ERROR
							case 65: // "unknown attribute <arg> for rule <arg2> in <arg3>", ErrorSeverity.ERROR
							case 66: // "attribute <arg> isn't a valid property in <arg2>", ErrorSeverity.ERROR
							case 67: // "missing attribute access on rule reference <arg> in <arg2>", ErrorSeverity.ERROR
							case 75: // "label <arg> type mismatch with previous definition: <arg2>", ErrorSeverity.ERROR
							case 79: // "missing argument(s) on rule reference: <arg>", ErrorSeverity.ERROR
							case 84: // "unsupported option value <arg>=<arg2>", ErrorSeverity.WARNING
							case 94: // "redefinition of <arg> action", ErrorSeverity.ERROR
							case 105: // "reference to undefined grammar in rule reference: <arg>.<arg2>", ErrorSeverity.ERROR
							case 106: // "rule <arg2> is not defined in grammar <arg>", ErrorSeverity.ERROR
							case 108: // "token name <arg> is already defined", ErrorSeverity.WARNING
							case 110: // "can't find or load grammar <arg>", ErrorSeverity.ERROR
							case 111: // "<arg.typeString> grammar <arg.name> cannot import <arg2.typeString> grammar <arg2.name>", ErrorSeverity.ERROR
							case 113: // "<arg.typeString> grammar <arg.name> and imported <arg2.typeString> grammar <arg2.name> both generate <arg2.recognizerName>", ErrorSeverity.ERROR
							case 118: // deprecated, "all operators of alt <arg> of left-recursive rule must have same associativity", ErrorSeverity.WARNING
							case 122: // "rule <arg>: must label all alternatives or none", ErrorSeverity.ERROR
							case 123: // "rule alt label <arg> redefined in rule <arg2>, originally in rule <arg3>", ErrorSeverity.ERROR
							case 125: // "implicit definition of token <arg> in parser", ErrorSeverity.WARNING
							case 126: // "cannot create implicit token for string literal in non-combined grammar: <arg>", ErrorSeverity.ERROR
							case 128: // "attribute references not allowed in lexer actions: $<arg>", ErrorSeverity.ERROR
							case 130: // "label <arg> assigned to a block which is not a set", ErrorSeverity.ERROR
							case 131: // "greedy block ()<arg> contains wildcard; the non-greedy syntax ()<arg>? may be preferred", ErrorSeverity.WARNING
							case 132: // "action in lexer rule <arg> must be last element of single outermost alt", ErrorSeverity.ERROR
							case 133: // "->command in lexer rule <arg> must be last element of single outermost alt", ErrorSeverity.ERROR
							case 134: // "symbol <arg> conflicts with generated code in target language or runtime", ErrorSeverity.ERROR
							//case 134: // "rule reference <arg> is not currently supported in a set", ErrorSeverity.ERROR
							case 135: // "cannot assign a value to list label <arg>", ErrorSeverity.ERROR
							case 136: // "return value <arg> conflicts with rule with same name", ErrorSeverity.ERROR
							case 137: // "return value <arg> conflicts with token with same name", ErrorSeverity.ERROR
							case 138: // "parameter <arg> conflicts with rule with same name", ErrorSeverity.ERROR
							case 139: // "parameter <arg> conflicts with token with same name", ErrorSeverity.ERROR
							case 140: // "local <arg> conflicts with rule with same name", ErrorSeverity.ERROR
							case 141: // "local <arg> conflicts with rule token same name", ErrorSeverity.ERROR
							case 142: // "local <arg> conflicts with parameter with same name", ErrorSeverity.ERROR
							case 143: // "local <arg> conflicts with return value with same name", ErrorSeverity.ERROR
							case 144: // "multi-character literals are not allowed in lexer sets: <arg>", ErrorSeverity.ERROR
							case 145: // "lexer mode <arg> must contain at least one non-fragment rule", ErrorSeverity.ERROR
							case 146: // "non-fragment lexer rule <arg> can match the empty string", ErrorSeverity.WARNING
							case 147: // "left recursive rule <arg> must contain an alternative which is not left recursive", ErrorSeverity.ERROR
							case 148: // "left recursive rule <arg> contains a left recursive alternative which can be followed by the empty string", ErrorSeverity.ERROR
							case 149: // "lexer command <arg> does not exist or is not supported by the current target", ErrorSeverity.ERROR
							case 150: // "missing argument for lexer command <arg>", ErrorSeverity.ERROR
							case 151: // "lexer command <arg> does not take any arguments", ErrorSeverity.ERROR
							case 153: // "rule <arg> contains a closure with at least one alternative that can match an empty string", ErrorSeverity.ERROR
							case 154: // "rule <arg> contains an optional block with at least one alternative that can match an empty string", ErrorSeverity.WARNING
							case 155: // "rule <arg> contains a lexer command with an unrecognized constant value; lexer interpreters may produce incorrect output", ErrorSeverity.WARNING
							case 156: // "invalid escape sequence <arg>", ErrorSeverity.WARNING
							case 158: // "fragment rule <arg> contains an action or command which can never be executed", ErrorSeverity.WARNING
							case 159: // "cannot declare a rule with reserved name <arg>", ErrorSeverity.ERROR
							case 160: // "cannot find tokens file <arg>", ErrorSeverity.ERROR
							case 161: // "channel <arg> conflicts with token with same name", ErrorSeverity.ERROR
							case 162: // "channel <arg> conflicts with mode with same name", ErrorSeverity.ERROR
							case 169: // "rule <arg> is left recursive but doesn't conform to a errorPattern ANTLR can handle", ErrorSeverity.ERROR
							case 170: // "mode <arg> conflicts with token with same name", ErrorSeverity.ERROR
							case 171: // "cannot use or declare token with reserved name <arg>", ErrorSeverity.ERROR
							case 172: // "cannot use or declare channel with reserved name <arg>", ErrorSeverity.ERROR
							case 173: // "cannot use or declare mode with reserved name <arg>", ErrorSeverity.ERROR
							case 174: // "string literals and sets cannot be empty: <arg>", ErrorSeverity.ERROR
							case 175: // "<arg> is not a recognized token name", ErrorSeverity.ERROR
							case 176: // "<arg> is not a recognized mode name", ErrorSeverity.ERROR
							case 177: // "<arg> is not a recognized channel name", ErrorSeverity.ERROR
							case 178: // "duplicated command <arg>", ErrorSeverity.WARNING
							case 179: // "incompatible commands <arg> and <arg2>", ErrorSeverity.WARNING
							case 180: // "chars <arg> used multiple times in set <arg2>", ErrorSeverity.WARNING
							case 181: // "token ranges not allowed in parser: <arg>..<arg2>", ErrorSeverity.ERROR
							case 182: { // "unicode property escapes not allowed in lexer charset range: <arg>", ErrorSeverity.ERROR
								let matches = ErrorParser.errorCodeToPattern.get(errorCode)!.exec(errorText);
								if (matches) {
									if (matches.length > 2) {
										// Multiple symbols in the message.
										let symbols: string[] = [];
										for (let i = 1; i < symbols.length; ++i) { // Not the first entry
											symbols.push(matches[i]);
										};
										this.addDiagnosticsForSymbols(symbols, errorText, DiagnosticType.Error, context);
										continue;
									}
									range.end.column += matches[1].length - 1; // -1 for the +1 we use as default.
								}
								break;
							}

							case 50: { // "syntax error: <arg>", ErrorSeverity.ERROR
								// All kinds of syntax errors. No need to create dozens of error patterns,
								// but instead look for a quoted string which usually denotes the input char(s) that
								// caused the trouble.
								let matches = /\(missing '[^']+'\)?[^']+'([^']+)'/.exec(errorText);
								if (matches) {
									range.end.column += matches[1].length - 1; // -1 for the +1 we use as default.
								}
								break;
							}

							case 69: // "label <arg> conflicts with rule with same name", ErrorSeverity.ERROR
							case 70: // "label <arg> conflicts with token with same name", ErrorSeverity.ERROR
							case 72: // "label <arg> conflicts with parameter with same name", ErrorSeverity.ERROR
							case 73: // "label <arg> conflicts with return value with same name", ErrorSeverity.ERROR
							case 74: // "label <arg> conflicts with local with same name", ErrorSeverity.ERROR
							case 76: // "return value <arg> conflicts with parameter with same name", ErrorSeverity.ERROR
							case 80:  // "rule <arg> has no defined parameters", ErrorSeverity.ERROR
							case 124: { // "rule alt label <arg> conflicts with rule <arg2>", ErrorSeverity.ERROR
								let matches = ErrorParser.errorCodeToPattern.get(errorCode)!.exec(errorText);
								if (matches) {
									// We're adding two entries here: one for each symbol.
									this.addDiagnosticsForSymbols([matches[1]], errorText, DiagnosticType.Warning, context);
									range.end.column += matches[1].length - 1;
								}
								break;
							}

							case 83: { // "unsupported option <arg>", ErrorSeverity.WARNING
								let matches = /unsupported option (\w+)/.exec(errorText);
								if (matches) {
									range.end.column += matches[1].length - 1;
								}
								break;
							}

							case 105: { // "reference to undefined grammar in rule reference: <arg>.<arg2>", ErrorSeverity.ERROR
								let matches = /reference: (\w+).(\w+)/.exec(errorText);
								if (matches) {
									range.end.column += matches[1].length + matches[2].length;
								}
								break;
							}

							case 109: // "options ignored in imported grammar <arg>", ErrorSeverity.WARNING
								range.end.column += "options".length - 1;
								break;

							case 202: { // "tokens {A; B;} syntax is now tokens {A, B} in ANTLR 4", ErrorSeverity.WARNING
								let enclosingRange = context.enclosingRangeForSymbol(range.start.column, range.start.row, true);
								if (enclosingRange) {
									range = enclosingRange;
								}
								break;
							}

							case 157: // "rule <arg> contains an assoc terminal option in an unrecognized location", ErrorSeverity.WARNING
								range.end.column += "assoc".length - 1;
								break;

							case 204: // "{...}?=> explicitly gated semantic predicates are deprecated in ANTLR 4; use {...}? instead", ErrorSeverity.WARNING
								range.end.column += 7; // Arbitrary length, we have no info how long the predicate is.
								break;

							case 205: // "(...)=> syntactic predicates are not supported in ANTLR 4", ErrorSeverity.ERROR
								range.end.column += 1; // Just the arrow.
								break;

							default: {
								let info = context.infoForSymbolAtPosition(range.start.column, range.start.row, false);
								if (info) {
									range.end.column += info.name.length - 1;
								}
								break;
							}
						}

						let error: DiagnosticEntry = {
							type: (matches[1] == "error") ? DiagnosticType.Error : DiagnosticType.Warning,
							message: errorText,
							range: range
						}
						context.diagnostics.push(error);
					} else {
						switch (errorCode) {
							case 1: // "cannot write file <arg>: <arg2>", ErrorSeverity.ERROR
							case 2: // "unknown command-line option <arg>", ErrorSeverity.ERROR
							case 4: // "error reading tokens file <arg>: <arg2>", ErrorSeverity.ERROR
							case 5: // "directory not found: <arg>", ErrorSeverity.ERROR
							case 6: // "output directory is a file: <arg>", ErrorSeverity.ERROR
							case 7: // "cannot find or open file: <arg><if(exception&&verbose)>; reason: <exception><endif>", ErrorSeverity.ERROR
							case 9: // "invalid -Dname=value syntax: <arg>", ErrorSeverity.ERROR
							case 10: // "warning treated as error", ErrorSeverity.ERROR_ONE_OFF
							case 11: // "error reading imported grammar <arg> referenced in <arg2>", ErrorSeverity.ERROR
							case 20: // "internal error: <arg> <arg2><if(exception&&verbose)>: <exception><stackTrace; separator=\"\\n\"><endif>", ErrorSeverity.ERROR
							case 21: // ".tokens file syntax error <arg>:<arg2>", ErrorSeverity.ERROR
							case 22: // "template error: <arg> <arg2><if(exception&&verbose)>: <exception><stackTrace; separator=\"\\n\"><endif>", ErrorSeverity.WARNING
							case 30: // "can't find code generation templates: <arg>", ErrorSeverity.ERROR
							case 31: // "ANTLR cannot generate <arg> code as of version "+ Tool.VERSION, ErrorSeverity.ERROR_ONE_OFF
							case 32: // "code generation template <arg> has missing, misnamed, or incomplete arg list; missing <arg2>", ErrorSeverity.ERROR
							case 33: // "missing code generation template <arg>", ErrorSeverity.ERROR
							case 34: // "no mapping to template name for output model class <arg>", ErrorSeverity.ERROR
							case 35: // "<arg3> code generation target requires ANTLR <arg2>; it can't be loaded by the current ANTLR <arg>", ErrorSeverity.ERROR
							case 54: // "repeated grammar prequel spec (options, tokens, or import); please merge", ErrorSeverity.ERROR
							case 99: // "<if(arg2.implicitLexerOwner)>implicitly generated <endif>grammar <arg> has no rules", ErrorSeverity.ERROR
								this.addGenericDiagnosis(errorText, DiagnosticType.Error, context);
								break;

							case 119: { // "The following sets of rules are mutually left-recursive <arg:{c| [<c:{r|<r.name>}; separator=\", \">]}; separator=\" and \">", ErrorSeverity.ERROR
								let matches = /\[([^\]]+)]/.exec(errorText);
								if (matches) {
									let symbols = matches[1].split(",");
									this.addDiagnosticsForSymbols(symbols, errorText, DiagnosticType.Error, context);
								}
								break;
							}

							default:
								this.addGenericDiagnosis(`[Internal Error] Unhandled error message (code ${errorCode}, message: ${errorText}\n"
								  "Please file a bug report at https://github.com/mike-lischke/vscode-antlr4/issues)`,
									DiagnosticType.Error, context);
								break;
						}
					}
				}
			}
		}
		return true;
	}

	private addDiagnosticsForSymbols(symbols: string[], text: string, type: DiagnosticType, context: SourceContext) {
		for (let symbol of symbols) {
			let info = context.getSymbolInfo(symbol.trim());
			if (info) {
				let error: DiagnosticEntry = {
					type: type,
					message: text,
					range: info.definition!.range
				}
				context.diagnostics.push(error);
			}
		}
	}

	private addGenericDiagnosis(text: string, type: DiagnosticType, context: SourceContext) {
		let error: DiagnosticEntry = {
			type: type,
			message: text,
			range: { start: { column: 0, row: 1 }, end: { column: 0, row: 1 } }
		}
		context.diagnostics.push(error);
	}
};
