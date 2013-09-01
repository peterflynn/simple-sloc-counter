/*
 * Copyright (c) 2013 Peter Flynn.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4 */
/*global define, describe, it, expect, beforeEach, afterEach, waitsFor, runs, brackets, waitsForDone */

define(function (require, exports, module) {
    "use strict";

    // Extension module to test
    var Counter = require("Counter");
    
    
    function expectCount(code, total, sloc) {
        var result = Counter.countSloc(code);
        expect(result.total).toBe(total);
        expect(result.sloc).toBe(sloc);
    }
    
    function expectUnsupported(code) {
        try {
            var result = Counter.countSloc(code);
            expect(false).toBe(true);
        } catch (ex) {
            expect(ex instanceof Counter.Unsupported).toBe(true);
        }
    }
    

    describe("[pf] SLOC counting", function () {

        it("handle empty files", function () {
            var code = "";
            expectCount(code, 1, 0);
        });
        
        it("count simple SLOC", function () {
            var code =
                "foo();\n" +
                "bar();\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("don't count newline at EOF", function () {
            var code =
                "foo();\n" +
                "bar();\n";
            expectCount(code, 3, 2);
        });
        
        it("ignore blank lines", function () {
            var code =
                "foo();\n" +
                "\n" +
                "bar();\n" +
                "    \n" +
                "baz();";
            expectCount(code, 5, 3);
        });
        it("ignore entirely blank files", function () {
            var code =
                "\n" +
                "\n" +
                "    \n" +
                "    \n";
            expectCount(code, 5, 0);
        });
        
        it("count line ending in line comment", function () {
            var code =
                "foo();\n" +
                "bar();  // comment\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("ignore lone line comment", function () {
            var code =
                "foo();\n" +
                "  // comment\n" +
                "baz();";
            expectCount(code, 3, 2);
        });
        
        
        it("count line ending in single-line block comment", function () {
            var code =
                "foo();\n" +
                "bar();  /* comment */\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("count line starting in single-line block comment", function () {
            var code =
                "foo();\n" +
                "/* comment */ bar();\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("count code sandwiched between single-line block comment", function () {
            var code =
                "foo();\n" +
                "/* comment */ bar(); /* comment B */\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("ignore single-line block comment", function () {
            var code =
                "foo();\n" +
                "  /* comment */\n" +
                "baz();";
            expectCount(code, 3, 2);
        });
        it("ignore pair of block comments on 1 line", function () {
            var code =
                "foo();\n" +
                "/* comment 1 */ /* comment 2 */\n" +
                "baz();";
            expectCount(code, 3, 2);
        });
        it("ignore two-line block comment", function () {
            var code =
                "foo();\n" +
                "  /* comment 1\n" +
                "     comment 2 */\n" +
                "baz();";
            expectCount(code, 4, 2);
        });
        it("ignore N-line block comment", function () {
            var code =
                "foo();\n" +
                "  /* comment 1\n" +
                "     comment 2\n" +
                "     comment 3 */\n" +
                "baz();";
            expectCount(code, 5, 2);
        });
        
        it("count line ending in start of block comment", function () {
            var code =
                "foo();\n" +
                "bar();  /* comment 1\n" +
                "   comment 2\n" +
                "   comment 3 */\n" +
                "baz();";
            expectCount(code, 5, 3);
        });
        it("count line starting with end of block comment", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "   comment 2\n" +
                "   comment 3 */ bar();\n" +
                "baz();";
            expectCount(code, 5, 3);
        });
        it("count line sandwiched between block comments", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "   comment 2\n" +
                "   comment 3 */ bar(); /* comment 1B\n" +
                "   comment 2B\n" +
                "   comment 3B */\n" +
                "baz();";
            expectCount(code, 7, 3);
        });
        
        it("ignore entire block comment inside string", function () {
            var code =
                "foo();\n" +
                "bar('/* foo */');\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("ignore block comment start inside string", function () {
            var code =
                "foo();\n" +
                "bar('/* foo');\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
            expectCount(code, 6, 4);
            
            code =
                "foo();\n" +
                "bar('/* foo'); /* real comment */\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
            expectCount(code, 6, 4);
        });
        it("find block comment end inside 'string'", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "bar('...*/\n" +
                "baz1();\n" +
                "baz2('*/')\n" +
                "baz3();";
            expectCount(code, 6, 4);
        });
        it("understand escaped quotes", function () {
            var code =
                "foo();\n" +
                "bar('\\'/*');\n" +
                "realCode();\n" +
                " /* comment 2\n" +
                "    comment 3 */\n" +
                "baz();";
            expectCount(code, 6, 4);
            
            code = code.replace(/'/g, '"');
            expectCount(code, 6, 4);
        });
        it("don't misunderstand nested differing quotes", function () {
            var code =
                "foo();\n" +
                "bar('\"/*');\n" +
                "realCode();\n" +
                " /* comment 2\n" +
                "    comment 3 */\n" +
                "baz();";
            expectCount(code, 6, 4);
            
            code =
                "foo();\n" +
                "bar(\"'/*\");\n" +
                "realCode();\n" +
                " /* comment 2\n" +
                "    comment 3 */\n" +
                "baz();";
            expectCount(code, 6, 4);
        });
        
        it("ignore block comment start inside block comment", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "/* comment 2\n" +
                "   comment 3\n" +
                "   comment 4 */\n" +
                "baz();";
            expectCount(code, 6, 2);
        });
        it("ignore block comment start inside block comment, single-line", function () {
            var code =
                "foo();\n" +
                "/* comment 1 /* still comment 1 */\n" +
                "baz();";
            expectCount(code, 3, 2);
        });
        it("ignore block comment start inside line comment", function () {
            var code =
                "foo();\n" +
                "bar();  // comment 1 /* still comment 1\n" +
                "realCode();\n" +
                "baz();";
            expectCount(code, 4, 4);
        });
        it("*don't* ignore block comment end inside line comment", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "  // comment 2 */\n" +
                "baz();";
            expectCount(code, 4, 2);
        });
        
        
        it("ignore quote inside regexp", function () {
            // Actually just flagged for now (due to /*), since regexps aren't really supported
            var code;
            code =
                "foo();\n" +
                "bar(/'/); /* comment 1\n" +
                "  comment 2\n" +
                "  comment 3 */\n" +
                "baz();";
//            expectCount(code, 5, 3);
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar(/'/); /* ' comment 1\n" +
                "  comment 2\n" +
                "  comment 3 */\n" +
                "baz();";
//            expectCount(code, 5, 3);
            expectUnsupported(code);
        });
        it("ignore block comment start inside regexp", function () {
            // Actually just flagged for now (due to /*), since regexps aren't really supported
            var code;
            code =
                "foo();\n" +
                "bar(/\\/* foo/); /* real comment */\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar(/\\/* foo/);\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
        });
        it("ignore escaped regexp end", function () {
            // Actually just flagged for now (due to /*), since regexps aren't really supported
            var code;
            code =
                "foo();\n" +
                "bar(/xyz\\/xyz\\/* foo/); /* real comment */\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
          
            code =
                "foo();\n" +
                "bar(/xyz\\/xyz\\/* foo/);\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
        });
        
        
        // Regular expressions ----------------------------------------------------------------------------------------
        
        // We can't parse regexps correctly, so we need to reliably warn whenever the code after a (non-comment) "/"
        // is important for understanding subsequent lines.
        
        it("flag block comment start after possible regexp", function () {
            var code;
            code =
                "foo();\n" +
                "bar(/xyz/); /* real comment */\n" +
                "baz();";
            expectUnsupported(code);
            
            code =  // expected false positive
                "foo();\n" +
                "bar(1/3); /* real comment */\n" +
                "baz();";
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar(/xyz/); /* real comment\n" +
                " comment 2 */\n" +
                "baz();";
            expectUnsupported(code);
        });
        it("flag string start after possible regexp only if line ends in ", function () {
            var code;
            code =
                "foo();\n" +
                "bar(/xyz/); baz(' string\\\n" +
                " still string');\n" +
                "last();";
            expectUnsupported(code);
            
            code = code.replace(/'/g, "\"");
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar(/xyz/); baz('string');\n" +
                "last();";
            expectCount(code, 3, 3);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 3, 3);
            
            code =  // expected regexp false positive
                "foo();\n" +
                "bar(1/3); baz(' string\\\n" +
                " still string');\n" +
                "last();";
            expectUnsupported(code);
            
            code = code.replace(/'/g, "\"");
            expectUnsupported(code);
            
            code =  // expected regexp false positive
                "foo();\n" +
                "bar(1/3); baz('string');\n" +
                "last();";
            expectCount(code, 3, 3);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 3, 3);
            
            code =  // inside regexp
                "foo();\n" +
                "bar(/'/); \\\n" +
                " still string');\n" +
                "last();";
            expectUnsupported(code);
            
            code = code.replace(/'/g, "\"");
            expectUnsupported(code);
            
            code =  // inside regexp
                "foo();\n" +
                "bar(/'/);\n" +
                "last();";
            expectCount(code, 3, 3);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 3, 3);
        });
        it("don't flag string BEFORE regexp", function () {
            var code;
            code =
                "foo();\n" +
                "bar('abc'); baz(/xyz/);\n" +
                "last();";
            expectCount(code, 3, 3);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 3, 3);
        });
        it("don't flag block comment BEFORE regexp", function () {
            var code;
            code =
                "foo();\n" +
                "/* comment */ baz(/xyz/);\n" +
                "last();";
            expectCount(code, 3, 3);
        });
        it("don't flag block unexpected block comment end inside regexp", function () {
            var code;
            code =
                "foo();\n" +
                "baz(/.*/);\n" +
                "last();";
            expectCount(code, 3, 3);
        });
        it("don't flag line comment start after possible regexp", function () {
            var code =
                "foo();\n" +
                "bar(/xyz/); // comment\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("don't flag possible regexps inside comments", function () {
            var code;
            code =
                "foo();\n" +
                "bar(); /* real /comment/ /* */\n" +
                "baz();";
            expectCount(code, 3, 3);
            
            code =
                "foo();\n" +
                "bar(); /* comment 1\n" +
                "  comment /2/ /*\n" +
                "  comment 3 */\n" +
                "baz();";
            expectCount(code, 5, 3);
            
            code =
                "foo();\n" +
                "bar(); // real /line/ comment /*\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
        it("don't flag possible regexps inside strings", function () {
            var code;
            code =
                "foo();\n" +
                "bar('string /content/ here'); /* foo */\n" +
                "baz();";
            expectCount(code, 3, 3);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 3, 3);
            
            code =
                "foo();\n" +
                "bar('string \\\n" +
                "  /content/ here'); /* foo */\n" +
                "baz();";
            expectCount(code, 4, 4);
            
            code = code.replace(/'/g, "\"");
            expectCount(code, 4, 4);
        });
        
        
        // Sanity checks ----------------------------------------------------------------------------------------------
        
        it("flag code with unclosed block comment", function () {
            var code;
            code =
                "foo();\n" +
                "/* comment 1\n" +
                "realCode();\n" +
                "baz();";
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar();  /* comment 1\n" +
                "realCode('*/');\n" +
                "baz();";
            expectUnsupported(code);
        });
        it("flag code with unexpected block comment end", function () {
            var code =
                "foo();\n" +
                "bar();*/\n" +
                "baz();";
            expectUnsupported(code);
        });
        it("flag code with unclosed string", function () {
            var code;
            code =
                "foo('string);\n" +
                "realCode();\n" +
                "baz();";
            expectUnsupported(code);
            
            code =
                "foo(\"string);\n" +
                "realCode();\n" +
                "baz();";
            expectUnsupported(code);
            
            code =
                "foo('string);\n" +
                "realCode(');\n" +
                "baz();";
            expectUnsupported(code);
            
            code =
                "foo(\"string);\n" +
                "realCode(\");\n" +
                "baz();";
            expectUnsupported(code);
        });
        it("don't mis-flag code with ES5 string wrap", function () {
            var code;
            code =
                "foo('string\\\n" +
                "still string');\n" +
                "baz();";
            expectCount(code, 3, 3);
            
            code =
                "foo(\"string\\\n" +
                "still string\");\n" +
                "baz();";
            expectCount(code, 3, 3);
        });
//        it("flag code with unclosed regexp", function () { -- regexps not really supported, see flagging cases above
//            var code =
//                "foo(/string);\n" +
//                "realCode();\n" +
//                "baz();";
//            expectUnsupported(code);
//        });
        
    }); // top-level describe()
    
});
