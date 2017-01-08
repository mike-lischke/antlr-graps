// Generated from grammars/ANTLRv4LexBasic.g4 by ANTLR 4.6-SNAPSHOT


import { ATN } from 'antlr4ts/atn/ATN';
import { ATNDeserializer } from 'antlr4ts/atn/ATNDeserializer';
import { CharStream } from 'antlr4ts/CharStream';
import { Lexer } from 'antlr4ts/Lexer';
import { LexerATNSimulator } from 'antlr4ts/atn/LexerATNSimulator';
import { NotNull } from 'antlr4ts/Decorators';
import { Override } from 'antlr4ts/Decorators';
import { RuleContext } from 'antlr4ts/RuleContext';
import { Vocabulary } from 'antlr4ts/Vocabulary';
import { VocabularyImpl } from 'antlr4ts/VocabularyImpl';

import * as Utils from 'antlr4ts/misc/Utils';


export class ANTLRv4LexBasic extends Lexer {
	public static readonly modeNames: string[] = [
		"DEFAULT_MODE"
	];

	public static readonly ruleNames: string[] = [
		"Ws", "Hws", "Vws", "BlockComment", "DocComment", "LineComment", "EscSeq", 
		"EscAny", "UnicodeEsc", "DecimalNumeral", "HexDigit", "DecDigit", "BoolLiteral", 
		"CharLiteral", "SQuoteLiteral", "DQuoteLiteral", "USQuoteLiteral", "NameChar", 
		"NameStartChar", "Int", "Esc", "Colon", "DColon", "SQuote", "DQuote", 
		"LParen", "RParen", "LBrace", "RBrace", "LBrack", "RBrack", "RArrow", 
		"Lt", "Gt", "Equal", "Question", "Star", "Plus", "PlusAssign", "Underscore", 
		"Pipe", "Dollar", "Comma", "Semi", "Dot", "Range", "At", "Pound", "Tilde"
	];

	private static readonly _LITERAL_NAMES: (string | undefined)[] = [
	];
	private static readonly _SYMBOLIC_NAMES: (string | undefined)[] = [
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(ANTLRv4LexBasic._LITERAL_NAMES, ANTLRv4LexBasic._SYMBOLIC_NAMES, []);

	@Override
	@NotNull
	public get vocabulary(): Vocabulary {
		return ANTLRv4LexBasic.VOCABULARY;
	}


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(ANTLRv4LexBasic._ATN, this);
	}

	@Override
	public get grammarFileName(): string { return "ANTLRv4LexBasic.g4"; }

	@Override
	public get ruleNames(): string[] { return ANTLRv4LexBasic.ruleNames; }

	@Override
	public get serializedATN(): string { return ANTLRv4LexBasic._serializedATN; }

	@Override
	public get modeNames(): string[] { return ANTLRv4LexBasic.modeNames; }

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x02\x02\u0130\b\x01"+
		"\x04\x02\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06"+
		"\x04\x07\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r"+
		"\t\r\x04\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t"+
		"\x12\x04\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t"+
		"\x17\x04\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t"+
		"\x1C\x04\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t"+
		"\"\x04#\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04"+
		"+\t+\x04,\t,\x04-\t-\x04.\t.\x04/\t/\x040\t0\x041\t1\x042\t2\x03\x02\x03"+
		"\x02\x05\x02h\n\x02\x03\x03\x03\x03\x03\x04\x03\x04\x03\x05\x03\x05\x03"+
		"\x05\x03\x05\x07\x05r\n\x05\f\x05\x0E\x05u\v\x05\x03\x05\x03\x05\x03\x05"+
		"\x05\x05z\n\x05\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x07\x06\x81\n"+
		"\x06\f\x06\x0E\x06\x84\v\x06\x03\x06\x03\x06\x03\x06\x05\x06\x89\n\x06"+
		"\x03\x07\x03\x07\x03\x07\x03\x07\x07\x07\x8F\n\x07\f\x07\x0E\x07\x92\v"+
		"\x07\x03\b\x03\b\x03\b\x03\b\x03\b\x05\b\x99\n\b\x03\t\x03\t\x03\t\x03"+
		"\n\x03\n\x03\n\x03\n\x03\n\x05\n\xA3\n\n\x05\n\xA5\n\n\x05\n\xA7\n\n\x05"+
		"\n\xA9\n\n\x03\v\x03\v\x03\v\x07\v\xAE\n\v\f\v\x0E\v\xB1\v\v\x05\v\xB3"+
		"\n\v\x03\f\x03\f\x03\r\x03\r\x03\x0E\x03\x0E\x03\x0E\x03\x0E\x03\x0E\x03"+
		"\x0E\x03\x0E\x03\x0E\x03\x0E\x05\x0E\xC2\n\x0E\x03\x0F\x03\x0F\x03\x0F"+
		"\x05\x0F\xC7\n\x0F\x03\x0F\x03\x0F\x03\x10\x03\x10\x03\x10\x07\x10\xCE"+
		"\n\x10\f\x10\x0E\x10\xD1\v\x10\x03\x10\x03\x10\x03\x11\x03\x11\x03\x11"+
		"\x07\x11\xD8\n\x11\f\x11\x0E\x11\xDB\v\x11\x03\x11\x03\x11\x03\x12\x03"+
		"\x12\x03\x12\x07\x12\xE2\n\x12\f\x12\x0E\x12\xE5\v\x12\x03\x13\x03\x13"+
		"\x03\x13\x03\x13\x05\x13\xEB\n\x13\x03\x14\x03\x14\x03\x15\x03\x15\x03"+
		"\x15\x03\x15\x03\x16\x03\x16\x03\x17\x03\x17\x03\x18\x03\x18\x03\x18\x03"+
		"\x19\x03\x19\x03\x1A\x03\x1A\x03\x1B\x03\x1B\x03\x1C\x03\x1C\x03\x1D\x03"+
		"\x1D\x03\x1E\x03\x1E\x03\x1F\x03\x1F\x03 \x03 \x03!\x03!\x03!\x03\"\x03"+
		"\"\x03#\x03#\x03$\x03$\x03%\x03%\x03&\x03&\x03\'\x03\'\x03(\x03(\x03("+
		"\x03)\x03)\x03*\x03*\x03+\x03+\x03,\x03,\x03-\x03-\x03.\x03.\x03/\x03"+
		"/\x03/\x030\x030\x031\x031\x032\x032\x04s\x82\x02\x023\x03\x02\x02\x05"+
		"\x02\x02\x07\x02\x02\t\x02\x02\v\x02\x02\r\x02\x02\x0F\x02\x02\x11\x02"+
		"\x02\x13\x02\x02\x15\x02\x02\x17\x02\x02\x19\x02\x02\x1B\x02\x02\x1D\x02"+
		"\x02\x1F\x02\x02!\x02\x02#\x02\x02%\x02\x02\'\x02\x02)\x02\x02+\x02\x02"+
		"-\x02\x02/\x02\x021\x02\x023\x02\x025\x02\x027\x02\x029\x02\x02;\x02\x02"+
		"=\x02\x02?\x02\x02A\x02\x02C\x02\x02E\x02\x02G\x02\x02I\x02\x02K\x02\x02"+
		"M\x02\x02O\x02\x02Q\x02\x02S\x02\x02U\x02\x02W\x02\x02Y\x02\x02[\x02\x02"+
		"]\x02\x02_\x02\x02a\x02\x02c\x02\x02\x03\x02\r\x04\x02\v\v\"\"\x04\x02"+
		"\f\f\x0E\x0F\x04\x02\f\f\x0F\x0F\n\x02$$))^^ddhhppttvv\x03\x023;\x05\x02"+
		"2;CHch\x03\x022;\x06\x02\f\f\x0F\x0F))^^\x06\x02\f\f\x0F\x0F$$^^\x05\x02"+
		"\xB9\xB9\u0302\u0371\u2041\u2042\x0F\x02C\\c|\xC2\xD8\xDA\xF8\xFA\u0301"+
		"\u0372\u037F\u0381\u2001\u200E\u200F\u2072\u2191\u2C02\u2FF1\u3003\uD801"+
		"\uF902\uFDD1\uFDF2\uFFFF\u0118\x03g\x03\x02\x02\x02\x05i\x03\x02\x02\x02"+
		"\x07k\x03\x02\x02\x02\tm\x03\x02\x02\x02\v{\x03\x02\x02\x02\r\x8A\x03"+
		"\x02\x02\x02\x0F\x93\x03\x02\x02\x02\x11\x9A\x03\x02\x02\x02\x13\x9D\x03"+
		"\x02\x02\x02\x15\xB2\x03\x02\x02\x02\x17\xB4\x03\x02\x02\x02\x19\xB6\x03"+
		"\x02\x02\x02\x1B\xC1\x03\x02\x02\x02\x1D\xC3\x03\x02\x02\x02\x1F\xCA\x03"+
		"\x02\x02\x02!\xD4\x03\x02\x02\x02#\xDE\x03\x02\x02\x02%\xEA\x03\x02\x02"+
		"\x02\'\xEC\x03\x02\x02\x02)\xEE\x03\x02\x02\x02+\xF2\x03\x02\x02\x02-"+
		"\xF4\x03\x02\x02\x02/\xF6\x03\x02\x02\x021\xF9\x03\x02\x02\x023\xFB\x03"+
		"\x02\x02\x025\xFD\x03\x02\x02\x027\xFF\x03\x02\x02\x029\u0101\x03\x02"+
		"\x02\x02;\u0103\x03\x02\x02\x02=\u0105\x03\x02\x02\x02?\u0107\x03\x02"+
		"\x02\x02A\u0109\x03\x02\x02\x02C\u010C\x03\x02\x02\x02E\u010E\x03\x02"+
		"\x02\x02G\u0110\x03\x02\x02\x02I\u0112\x03\x02\x02\x02K\u0114\x03\x02"+
		"\x02\x02M\u0116\x03\x02\x02\x02O\u0118\x03\x02\x02\x02Q\u011B\x03\x02"+
		"\x02\x02S\u011D\x03\x02\x02\x02U\u011F\x03\x02\x02\x02W\u0121\x03\x02"+
		"\x02\x02Y\u0123\x03\x02\x02\x02[\u0125\x03\x02\x02\x02]\u0127\x03\x02"+
		"\x02\x02_\u012A\x03\x02\x02\x02a\u012C\x03\x02\x02\x02c\u012E\x03\x02"+
		"\x02\x02eh\x05\x05\x03\x02fh\x05\x07\x04\x02ge\x03\x02\x02\x02gf\x03\x02"+
		"\x02\x02h\x04\x03\x02\x02\x02ij\t\x02\x02\x02j\x06\x03\x02\x02\x02kl\t"+
		"\x03\x02\x02l\b\x03\x02\x02\x02mn\x071\x02\x02no\x07,\x02\x02os\x03\x02"+
		"\x02\x02pr\v\x02\x02\x02qp\x03\x02\x02\x02ru\x03\x02\x02\x02st\x03\x02"+
		"\x02\x02sq\x03\x02\x02\x02ty\x03\x02\x02\x02us\x03\x02\x02\x02vw\x07,"+
		"\x02\x02wz\x071\x02\x02xz\x07\x02\x02\x03yv\x03\x02\x02\x02yx\x03\x02"+
		"\x02\x02z\n\x03\x02\x02\x02{|\x071\x02\x02|}\x07,\x02\x02}~\x07,\x02\x02"+
		"~\x82\x03\x02\x02\x02\x7F\x81\v\x02\x02\x02\x80\x7F\x03\x02\x02\x02\x81"+
		"\x84\x03\x02\x02\x02\x82\x83\x03\x02\x02\x02\x82\x80\x03\x02\x02\x02\x83"+
		"\x88\x03\x02\x02\x02\x84\x82\x03\x02\x02\x02\x85\x86\x07,\x02\x02\x86"+
		"\x89\x071\x02\x02\x87\x89\x07\x02\x02\x03\x88\x85\x03\x02\x02\x02\x88"+
		"\x87\x03\x02\x02\x02\x89\f\x03\x02\x02\x02\x8A\x8B\x071\x02\x02\x8B\x8C"+
		"\x071\x02\x02\x8C\x90\x03\x02\x02\x02\x8D\x8F\n\x04\x02\x02\x8E\x8D\x03"+
		"\x02\x02\x02\x8F\x92\x03\x02\x02\x02\x90\x8E\x03\x02\x02\x02\x90\x91\x03"+
		"\x02\x02\x02\x91\x0E\x03\x02\x02\x02\x92\x90\x03\x02\x02\x02\x93\x98\x05"+
		"+\x16\x02\x94\x99\t\x05\x02\x02\x95\x99\x05\x13\n\x02\x96\x99\v\x02\x02"+
		"\x02\x97\x99\x07\x02\x02\x03\x98\x94\x03\x02\x02\x02\x98\x95\x03\x02\x02"+
		"\x02\x98\x96\x03\x02\x02\x02\x98\x97\x03\x02\x02\x02\x99\x10\x03\x02\x02"+
		"\x02\x9A\x9B\x05+\x16\x02\x9B\x9C\v\x02\x02\x02\x9C\x12\x03\x02\x02\x02"+
		"\x9D\xA8\x07w\x02\x02\x9E\xA6\x05\x17\f\x02\x9F\xA4\x05\x17\f\x02\xA0"+
		"\xA2\x05\x17\f\x02\xA1\xA3\x05\x17\f\x02\xA2\xA1\x03\x02\x02\x02\xA2\xA3"+
		"\x03\x02\x02\x02\xA3\xA5\x03\x02\x02\x02\xA4\xA0\x03\x02\x02\x02\xA4\xA5"+
		"\x03\x02\x02\x02\xA5\xA7\x03\x02\x02\x02\xA6\x9F\x03\x02\x02\x02\xA6\xA7"+
		"\x03\x02\x02\x02\xA7\xA9\x03\x02\x02\x02\xA8\x9E\x03\x02\x02\x02\xA8\xA9"+
		"\x03\x02\x02\x02\xA9\x14\x03\x02\x02\x02\xAA\xB3\x072\x02\x02\xAB\xAF"+
		"\t\x06\x02\x02\xAC\xAE\x05\x19\r\x02\xAD\xAC\x03\x02\x02\x02\xAE\xB1\x03"+
		"\x02\x02\x02\xAF\xAD\x03\x02\x02\x02\xAF\xB0\x03\x02\x02\x02\xB0\xB3\x03"+
		"\x02\x02\x02\xB1\xAF\x03\x02\x02\x02\xB2\xAA\x03\x02\x02\x02\xB2\xAB\x03"+
		"\x02\x02\x02\xB3\x16\x03\x02\x02\x02\xB4\xB5\t\x07\x02\x02\xB5\x18\x03"+
		"\x02\x02\x02\xB6\xB7\t\b\x02\x02\xB7\x1A\x03\x02\x02\x02\xB8\xB9\x07v"+
		"\x02\x02\xB9\xBA\x07t\x02\x02\xBA\xBB\x07w\x02\x02\xBB\xC2\x07g\x02\x02"+
		"\xBC\xBD\x07h\x02\x02\xBD\xBE\x07c\x02\x02\xBE\xBF\x07n\x02\x02\xBF\xC0"+
		"\x07u\x02\x02\xC0\xC2\x07g\x02\x02\xC1\xB8\x03\x02\x02\x02\xC1\xBC\x03"+
		"\x02\x02\x02\xC2\x1C\x03\x02\x02\x02\xC3\xC6\x051\x19\x02\xC4\xC7\x05"+
		"\x0F\b\x02\xC5\xC7\n\t\x02\x02\xC6\xC4\x03\x02\x02\x02\xC6\xC5\x03\x02"+
		"\x02\x02\xC7\xC8\x03\x02\x02\x02\xC8\xC9\x051\x19\x02\xC9\x1E\x03\x02"+
		"\x02\x02\xCA\xCF\x051\x19\x02\xCB\xCE\x05\x0F\b\x02\xCC\xCE\n\t\x02\x02"+
		"\xCD\xCB\x03\x02\x02\x02\xCD\xCC\x03\x02\x02\x02\xCE\xD1\x03\x02\x02\x02"+
		"\xCF\xCD\x03\x02\x02\x02\xCF\xD0\x03\x02\x02\x02\xD0\xD2\x03\x02\x02\x02"+
		"\xD1\xCF\x03\x02\x02\x02\xD2\xD3\x051\x19\x02\xD3 \x03\x02\x02\x02\xD4"+
		"\xD9\x053\x1A\x02\xD5\xD8\x05\x0F\b\x02\xD6\xD8\n\n\x02\x02\xD7\xD5\x03"+
		"\x02\x02\x02\xD7\xD6\x03\x02\x02\x02\xD8\xDB\x03\x02\x02\x02\xD9\xD7\x03"+
		"\x02\x02\x02\xD9\xDA\x03\x02\x02\x02\xDA\xDC\x03\x02\x02\x02\xDB\xD9\x03"+
		"\x02\x02\x02\xDC\xDD\x053\x1A\x02\xDD\"\x03\x02\x02\x02\xDE\xE3\x051\x19"+
		"\x02\xDF\xE2\x05\x0F\b\x02\xE0\xE2\n\t\x02\x02\xE1\xDF\x03\x02\x02\x02"+
		"\xE1\xE0\x03\x02\x02\x02\xE2\xE5\x03\x02\x02\x02\xE3\xE1\x03\x02\x02\x02"+
		"\xE3\xE4\x03\x02\x02\x02\xE4$\x03\x02\x02\x02\xE5\xE3\x03\x02\x02\x02"+
		"\xE6\xEB\x05\'\x14\x02\xE7\xEB\x042;\x02\xE8\xEB\x05Q)\x02\xE9\xEB\t\v"+
		"\x02\x02\xEA\xE6\x03\x02\x02\x02\xEA\xE7\x03\x02\x02\x02\xEA\xE8\x03\x02"+
		"\x02\x02\xEA\xE9\x03\x02\x02\x02\xEB&\x03\x02\x02\x02\xEC\xED\t\f\x02"+
		"\x02\xED(\x03\x02\x02\x02\xEE\xEF\x07k\x02\x02\xEF\xF0\x07p\x02\x02\xF0"+
		"\xF1\x07v\x02\x02\xF1*\x03\x02\x02\x02\xF2\xF3\x07^\x02\x02\xF3,\x03\x02"+
		"\x02\x02\xF4\xF5\x07<\x02\x02\xF5.\x03\x02\x02\x02\xF6\xF7\x07<\x02\x02"+
		"\xF7\xF8\x07<\x02\x02\xF80\x03\x02\x02\x02\xF9\xFA\x07)\x02\x02\xFA2\x03"+
		"\x02\x02\x02\xFB\xFC\x07$\x02\x02\xFC4\x03\x02\x02\x02\xFD\xFE\x07*\x02"+
		"\x02\xFE6\x03\x02\x02\x02\xFF\u0100\x07+\x02\x02\u01008\x03\x02\x02\x02"+
		"\u0101\u0102\x07}\x02\x02\u0102:\x03\x02\x02\x02\u0103\u0104\x07\x7F\x02"+
		"\x02\u0104<\x03\x02\x02\x02\u0105\u0106\x07]\x02\x02\u0106>\x03\x02\x02"+
		"\x02\u0107\u0108\x07_\x02\x02\u0108@\x03\x02\x02\x02\u0109\u010A\x07/"+
		"\x02\x02\u010A\u010B\x07@\x02\x02\u010BB\x03\x02\x02\x02\u010C\u010D\x07"+
		">\x02\x02\u010DD\x03\x02\x02\x02\u010E\u010F\x07@\x02\x02\u010FF\x03\x02"+
		"\x02\x02\u0110\u0111\x07?\x02\x02\u0111H\x03\x02\x02\x02\u0112\u0113\x07"+
		"A\x02\x02\u0113J\x03\x02\x02\x02\u0114\u0115\x07,\x02\x02\u0115L\x03\x02"+
		"\x02\x02\u0116\u0117\x07-\x02\x02\u0117N\x03\x02\x02\x02\u0118\u0119\x07"+
		"-\x02\x02\u0119\u011A\x07?\x02\x02\u011AP\x03\x02\x02\x02\u011B\u011C"+
		"\x07a\x02\x02\u011CR\x03\x02\x02\x02\u011D\u011E\x07~\x02\x02\u011ET\x03"+
		"\x02\x02\x02\u011F\u0120\x07&\x02\x02\u0120V\x03\x02\x02\x02\u0121\u0122"+
		"\x07.\x02\x02\u0122X\x03\x02\x02\x02\u0123\u0124\x07=\x02\x02\u0124Z\x03"+
		"\x02\x02\x02\u0125\u0126\x070\x02\x02\u0126\\\x03\x02\x02\x02\u0127\u0128"+
		"\x070\x02\x02\u0128\u0129\x070\x02\x02\u0129^\x03\x02\x02\x02\u012A\u012B"+
		"\x07B\x02\x02\u012B`\x03\x02\x02\x02\u012C\u012D\x07%\x02\x02\u012Db\x03"+
		"\x02\x02\x02\u012E\u012F\x07\x80\x02\x02\u012Fd\x03\x02\x02\x02\x19\x02"+
		"gsy\x82\x88\x90\x98\xA2\xA4\xA6\xA8\xAF\xB2\xC1\xC6\xCD\xCF\xD7\xD9\xE1"+
		"\xE3\xEA\x02";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!ANTLRv4LexBasic.__ATN) {
			ANTLRv4LexBasic.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(ANTLRv4LexBasic._serializedATN));
		}

		return ANTLRv4LexBasic.__ATN;
	}

}

