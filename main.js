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
    
    // Brackets modules
    var DocumentManager         = brackets.getModule("document/DocumentManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        StatusBar               = brackets.getModule("widgets/StatusBar"),
        Async                   = brackets.getModule("utils/Async"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        Menus                   = brackets.getModule("command/Menus"),
        CommandManager          = brackets.getModule("command/CommandManager");
    
    // Extension modules
    var Counter                 = require("Counter");
    
    
    /* E.g., for Brackets core-team-owned source:
            /extensions/dev/       (want to exclude any personal code...)
            /thirdparty/
            /3rdparty/
            /node_modules/
            /widgets/bootstrap-
            /unittest-files/
            /spec/JSUtils-test-files/
            /perf/OpenFile-perf-files/
            
        For Brackets runtime source:
            /extensions/dev/
            /node_modules/      (although leave out to include the Brackets-node process too)
            /unittest-files/
            /brackets/test/
            /unittests.js
            /unittest-files/
            /test/
     */
    var filterStrings = [];
    
    function filter(file) {
        var path = file.fullPath;
        var i;
        for (i = 0; i < filterStrings.length; i++) {
            if (path.indexOf(filterStrings[i]) !== -1) {
                return false;
            }
        }
        return true;
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
        ProjectManager.getAllFiles()
            .done(function (fileListResult) {
                
                var jsFiles = fileListResult.filter(function (file) {
                    return (/\.js$/i).test(file.fullPath);
                });
                
                Async.doInParallel(jsFiles, function (file) {
                    var result = new $.Deferred();
                    
                    if (!filter(file)) {
                        result.resolve();
                    } else {
                        // Search one file
                        DocumentManager.getDocumentForPath(file.fullPath)
                            .done(function (doc) {
                                var text = doc.getText();
                                
                                try {
                                    var lineCounts = Counter.countSloc(text);
                                    totalLines += lineCounts.total;
                                    totalSloc += lineCounts.sloc;
                                    totalBytes += text.length;
                                    totalFiles++;
                                        
                                } catch (err) {
                                    if (err instanceof Counter.Unsupported) {
                                        warnings.push({ reason: err.message, fullPath: file.fullPath, lineNum: err.lineNum });
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
                                warnings.push({ reason: "Unable to read file", fullPath: file.fullPath });
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
        var message = "Exclude files/folders containing any of these substrings:<br><textarea id='sloc-excludes' style='width:400px;height:160px'></textarea>";
        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "JavaScript Lines of Code", message)
            .done(function (btnId) {
                if (btnId === Dialogs.DIALOG_BTN_OK) {  // as opposed so dialog's "X" button
                    var substrings = $textarea.val();
                    filterStrings = substrings.split("\n");
                    filterStrings = filterStrings.map(function (substr) {
                        return substr.trim();
                    }).filter(function (substr) {
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
    CommandManager.register("Count Lines of Code", COMMAND_ID, beginCount);
    
    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuItem(COMMAND_ID, null, Menus.LAST);
});