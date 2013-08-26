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


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
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
    

    describe("SLOC counting", function () {

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
        it("ignore newline at EOF", function () {
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
//        it("count line starting in single-line block comment", function () { // FIXME BUG
//            var code =
//                "foo();\n" +
//                "/* comment */ bar();\n" +
//                "baz();";
//            expectCount(code, 3, 3);
//        });
        it("count code sandwiched between single-line block comment", function () {
            var code =
                "foo();\n" +
                "/* comment */ bar(); /* comment B */\n" +
                "baz();";
//            expectCount(code, 3, 3);
            expectUnsupported(code);
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
//            expectCount(code, 3, 2);
            expectUnsupported();
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
//            expectCount(code, 5, 3);
            expectUnsupported(code);
        });
        it("count line starting with end of block comment", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "   comment 2\n" +
                "   comment 3 */ bar();\n" +
                "baz();";
//            expectCount(code, 5, 3);
            expectUnsupported(code);
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
//            expectCount(code, 7, 3);
            expectUnsupported(code);
        });
        
        it("ignore entire block comment inside string", function () {
            var code =
                "foo();\n" +
                "bar('/* foo */');\n" +
                "baz();\n";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
        });
        it("ignore block comment start inside string", function () {
            var code =
                "foo();\n" +
                "bar('/* foo');\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar('/* foo'); /* real comment */\n" +
                "realCode();\n" +
                "/* comment 1\n" +
                "   comment 2 */\n" +
                "baz();";
//            expectCount(code, 6, 4);
            expectUnsupported(code);
        });
        it("ignore block comment end inside string", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "bar('*/');\n" +
                "   comment 2\n" +
                "   comment 3 */\n" +
                "baz();";
//            expectCount(code, 6, 2);
            expectUnsupported(code);
        });
        it("understand escaped quotes", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "bar('\\'*/');\n" +
                "   comment 2\n" +
                "   comment 3 */\n" +
                "baz();";
//            expectCount(code, 6, 2);
            expectUnsupported(code);
            
            code = code.replace(/'/g, '"');
//            expectCount(code, 6, 2);
            expectUnsupported(code);
        });
        it("don't misunderstand nested differing quotes", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "bar('\"*/');\n" +
                "   comment 2\n" +
                "   comment 3 */\n" +
                "baz();";
//            expectCount(code, 6, 2);
            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "/* comment 1\n" +
                "bar(\"'*/\");\n" +
                "   comment 2\n" +
                "   comment 3 */\n" +
                "baz();";
//            expectCount(code, 6, 2);
            expectUnsupported(code);
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
//            expectCount(code, 3, 2);
            expectUnsupported(code);
        });
        it("ignore block comment start inside line comment", function () {
            var code =
                "foo();\n" +
                "bar();  // comment 1 /* still comment 1\n" +
                "realCode();\n" +
                "baz();";
//            expectCount(code, 6, 2);
            expectUnsupported(code);
        });
        it("*don't* ignore block comment end inside line comment", function () {
            var code =
                "foo();\n" +
                "/* comment 1\n" +
                "  // comment 2 */\n" +
                "baz();";
            expectCount(code, 4, 2);
        });
        
        
        it("ignore block comment start inside regexp", function () {
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
        
        
        it("flag code with unclosed block comment", function () {
            var code;
//            code =
//                "foo();\n" +
//                "/* comment 1\n" +
//                "realCode();\n" +
//                "baz();";
//            expectUnsupported(code);
            
            code =
                "foo();\n" +
                "bar();  /* comment 1\n" +
                "realCode('*/');\n" +
                "baz();";
            expectUnsupported(code);
        });
        it("flag code with unexpected block comment end", function () {
//            var code =
//                "foo();\n" +
//                "bar();*/\n" +
//                "baz();";
//            expectUnsupported(code);
        });
        it("flag code with unclosed string", function () {
            var code;
//            code =
//                "foo('string);\n" +
//                "realCode();\n" +
//                "baz();";
//            expectUnsupported(code);
            
//            code =
//                "foo(\"string);\n" +
//                "realCode();\n" +
//                "baz();";
//            expectUnsupported(code);
            
//            code =
//                "foo('string);\n" +
//                "realCode(');\n" +
//                "baz();";
//            expectUnsupported(code);
            
//            code =
//                "foo(\"string);\n" +
//                "realCode(\");\n" +
//                "baz();";
//            expectUnsupported(code);
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
        it("flag code with unclosed regexp", function () {
//            var code =
//                "foo(/string);\n" +
//                "realCode();\n" +
//                "baz();";
//            expectUnsupported(code);
        });
        
    }); // top-level describe()
    
});
