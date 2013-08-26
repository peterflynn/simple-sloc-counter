/*
 * Copyright (c) 2013 Peter Flynn, Adobe Systems Incorporated, and other contributors.
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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";
    
    /** Quick way to bail early from countSloc() */
    function Unsupported(msg, lineNum) {
        var ret = new Error(msg);
        Error.captureStackTrace(this, Unsupported);
        ret.message = msg;
        ret.lineNum = lineNum;
        return ret;
    }
    Unsupported.prototype = Error.prototype;
    
    
    /**
     * Counts lines of code in given text.
     * @return {{total: number, sloc: number}}
     */
    function countSloc(text) {
        // TODO: split on /\r\n/g so we can call getText(true) for speed?
        var lines = text.split("\n");
        
        var codeLines = 0;
        var inBlockComment = false;
        var inString = false;
        lines.forEach(function (line, lineNum) {
            function unsupported(msg) {
                throw new Unsupported(msg, lineNum);
            }
            
            if (inBlockComment) {
                var commentEnd = line.indexOf("*/");
                if (commentEnd !== -1) {
                    inBlockComment = false;
                    if (line.substr(commentEnd + 2).trim() !== "") {
                        unsupported("Code on same line as end of multi-line block comment");
                    }
                }
            } else {
                if (line.match(/^\s*$/)) {
                    // whitespace
                } else if (line.match(/^\s*\/\//)) {
                    // line comment
                } else if (line.indexOf("/*") !== -1) {
                    var commentStart = line.indexOf("/*");
                    var beforeCommentStart = line.substring(0, commentStart);
                    if (beforeCommentStart.trim() !== "") {
                        codeLines++;  // block comment after some code still counts as a line of code: e.g. 'foo(); /* call foo */'
                        if (beforeCommentStart.indexOf("\"") !== -1 || beforeCommentStart.indexOf("'") !== -1) {
                            unsupported("Block comment token that may be inside a string literal");
                        }
                        if (line.indexOf("*/") === -1) {
                            unsupported("Code on same line as start of multi-line block comment");
                        }
                        
                    }
                    if (line.indexOf("*/") === -1) {
                        inBlockComment = true;
                    }
                    if (line.indexOf("//") !== -1) {
                        unsupported("Mixing block and line comments on one line");
                    }
                    if (line.indexOf("/*", commentStart + 2) !== -1) {
                        unsupported("Multiple block comments per line");
                    }
                } else {
                    codeLines++;
                }
            }
        });
        
            
        return { total: lines.length, sloc: codeLines };
    }
    
   
    exports.countSloc   = countSloc;
    exports.Unsupported = Unsupported;
});