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
    
    // Brackets modules
    var DocumentManager         = brackets.getModule("document/DocumentManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        FileIndexManager        = brackets.getModule("project/FileIndexManager"),
        StatusBar               = brackets.getModule("widgets/StatusBar"),
        Async                   = brackets.getModule("utils/Async"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        Menus                   = brackets.getModule("command/Menus"),
        CommandManager          = brackets.getModule("command/CommandManager");
    
    
    /* E.g., for Brackets core source:
            /extensions/dev/       (want to exclude any personal code...)
            /thirdparty/
            /3rdparty/
            /node_modules/
            /widgets/bootstrap-
            /unittest-files/
            /spec/JSUtils-test-files/
            /perf/OpenFile-perf-files/
     */
    var filterStrings = [];
    
    function filter(fileInfo) {
        var path = fileInfo.fullPath;
        var i;
        for (i = 0; i < filterStrings.length; i++) {
            if (path.indexOf(filterStrings[i]) !== -1) {
                return false;
            }
        }
        return true;
    }
    
    
    /** Quick way to bail early from _countSloc() */
    function Unsupported(msg, lineNum) { this.message = msg; this.lineNum = lineNum; }
    Unsupported.prototype = new Error();
    
    
    /**
     * Counts lines of code in given text.
     * @return {{total: number, sloc: number}}
     */
    function _countSloc(text) {
        // TODO: split on /\r\n/g so we can call getText(true) for speed?
        var lines = text.split("\n");
        
        var codeLines = 0;
        var inBlockComment = false;
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
    
    
    /**
     * Finds all JS files, loads all those that pass the filter(), counts lines, and shows final
     * result in a dialog.
     */
    function countAllFiles() {
        var totalLines = 0,
            totalSloc = 0,
            totalBytes = 0,
            totalFiles = 0;
        
        var warnings = [];
        
        // Code based on FileIndexManager & a bit of JSUtils
        
        StatusBar.showBusyIndicator(true);
        FileIndexManager.getFileInfoList("all")
            .done(function (fileListResult) {
                
                var jsFiles = fileListResult.filter(function (fileInfo) {
                    return (/\.js$/i).test(fileInfo.fullPath);
                });
                
                Async.doInParallel(jsFiles, function (fileInfo) {
                    var result = new $.Deferred();
                    
                    if (!filter(fileInfo)) {
                        result.resolve();
                    } else {
                        // Search one file
                        DocumentManager.getDocumentForPath(fileInfo.fullPath)
                            .done(function (doc) {
                                var text = doc.getText();
                                
                                try {
                                    var lineCounts = _countSloc(text);
                                    totalLines += lineCounts.total;
                                    totalSloc += lineCounts.sloc;
                                    totalBytes += text.length;
                                    totalFiles++;
                                        
                                } catch (err) {
                                    if (err instanceof Unsupported) {
                                        warnings.push({ reason: err.message, fullPath: fileInfo.fullPath, lineNum: err.lineNum });
                                    } else {
                                        var wrap = new Error("Rethrowing: " + err.message);
                                        wrap.innerException = err;
                                        throw wrap;
                                    }
                                }
                                
                                result.resolve();
                            })
                            .fail(function (error) {
                                // Error reading this file
                                // Resolve anyway so we can still do a partial count
                                warnings.push({ reason: "Unable to read file", fullPath: fileInfo.fullPath });
                                result.resolve();
                            });
                    }
                    return result.promise();
                })
                    .always(function () {
                        StatusBar.hideBusyIndicator();
                    })
                    .done(function () {
                        // Done processing all files: show results
                        var totalKb = Math.round(totalBytes / 1024);
                        var message = "<div style='-webkit-user-select:text; cursor: auto'>";
                        
                        message +=
                            "Scanned " + totalFiles + " .js files (" + totalKb + " KB).<br>" +
                            "Raw total lines: " + totalLines + "<br>" +
                            "<b>Lines of code: " + totalSloc + "</b>&nbsp; (excluding whitespace & comments)";
                        
                        if (warnings.length) {
                            message += "<div style='border:1px solid #dfb200; background-color: #fffad8; margin-top:20px; padding:10px; max-height:250px; overflow:auto'>";
                            warnings.forEach(function (warning) {
                                message += "Ignored '" + warning.fullPath + "': " + warning.reason + " at line " + (warning.lineNum + 1) + "<br>";
                            });
                            message += "</div>";
                        }
                        
                        message += "</div>";
                        
                        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "JavaScript Lines of Code", message)
                            .done(function () { EditorManager.focusEditor(); });
                    });
            });
    }
    
    function beginCount() {
        var $textarea;
        var message = "Exclude files/folders containing any of these substrings:<br><textarea id='sloc-excludes' style='width:400px;height:160px'>";
        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "JavaScript Lines of Code", message)
            .done(function (btnId) {
                if (btnId === Dialogs.DIALOG_BTN_OK) {  // as opposed so dialog's "X" button
                    var substrings = $textarea.val();
                    filterStrings = substrings.split("\n");
                    filterStrings = filterStrings.map(function (substr) {
                        return substr.trim();
                    });
                    filterStrings = filterStrings.filter(function (substr) {
                        return substr !== "";
                    });
                    
                    countAllFiles();
                }
            });
        
        // store now since it'll be orphaned by the time done() handler runs
        $textarea = $("#sloc-excludes");
        
        // prepopulate with last-used filter within session
        // TODO: save/restore last-used string in prefs
        $textarea.val(filterStrings.join("\n"));
        $textarea.focus();
    }
    
    
    
    // Register command
    var COMMAND_ID = "pflynn.count_sloc";
    CommandManager.register("Lines of JS Code Count", COMMAND_ID, beginCount);
    
    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuItem(COMMAND_ID, null, Menus.LAST);
});
