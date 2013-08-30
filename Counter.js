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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
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
        
        function unsupported(msg, lineNum) {
            throw new Unsupported(msg, lineNum === undefined ? lines.length - 1 : lineNum);
        }
        
        var codeLines = 0;
        var inBlockComment = false;
        var inString = false;
        var stringDelim;
        lines.forEach(function (line, lineNum) {
            
            var i;
            var sawCode = false;
            for (i = 0; i < line.length; i++) {
                var c = line[i];
                if (inBlockComment) {
                    if (c === "/" && line[i - 1] === "*") {
                        inBlockComment = false;
                    }
                } else if (inString) {
                    sawCode = true;
                    if (c === stringDelim) {
                        inString = false;
                    } else if (c === "\\") {
                        i++;  // skip next char (escaped char)
                    }
                } else {
                    // ignore all whitespace
                    if (c !== " " && c !== "\t") {
                        // opening of string
                        if (c === "\"" || c === "'") {
                            sawCode = true;
                            inString = true;
                            stringDelim = c;
                        } else if (c === "/") {
                            // opening of comment - MAYBE
                            if (line[i + 1] === "*") {
                                inBlockComment = true;
                                i++;  // (no point in looking at the "*" again)
                            } else if (line[i + 1] === "/") {
                                break;  // rest of line is a line comment
                            } else {
                                sawCode = true;
                                
                                // A "/" also might be the start of a regexp literal. Detecting regexps is INSANELY difficult in JS
                                // and basically requires fully parsing the code. We care because, like a string literal, the regexp
                                // could contain strings like /* or " that we'd misinterpret. (Detecting where a regexp ENDS is no
                                // mean feat either, btw).
                                // So, we cheat: we only care about the rest of the line if it might contain something that affects
                                // how we count LATER lines. All other cases are unambiguous without us knowing whether a regexp is
                                // present or not.
                                if (line.indexOf("/*", i + 1) !== -1) {
                                    unsupported("Potential block comment start following potential regular expression on same line", lineNum);
                                } else if (line.indexOf("\"", i + 1) !== -1 || line.indexOf("'", i + 1) !== -1) {
                                    if (line[line.length - 1] === "\\") {
                                        unsupported("Potential multi-line string literal following potential regular expression on same line", lineNum);
                                    }
                                }
                                break;  // ignore rest of line since we're not sure if it's a regexp and if so, where it ends
                            }
                        } else {
                            sawCode = true;
                            
                            // mainly as a self-check, error out if we see a block-comment close when we think we're not in a block comment
                            if (c === "*" && line[i + 1] === "/") {
                                unsupported("Unexpected */ when not in a block comment", lineNum);
                            }
                        }
                    }
                }
            }
            if (sawCode) {
                codeLines++;
            }
            if (inString && line[line.length - 1] !== "\\") {
                unsupported("Unclosed string at end of line", lineNum);
            }
        });
        
        if (inBlockComment) {
            unsupported("Unclosed block comment at end of file");
        } else if (inString) {
            unsupported("Unclosed string at end of file");
        }
            
        return { total: lines.length, sloc: codeLines };
    }
    
   
    exports.countSloc   = countSloc;
    exports.Unsupported = Unsupported;
});