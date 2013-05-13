JS Source Lines of Code (SLOC) Counter for Brackets
===================================================
Counts the number of JavaScript files, lines, and lines of code (excluding whitespace/comments) in your project. You can exclude
third-party code such as jQuery by specifying file / folder names.

To get started, just choose _View > Lines of Code Count_.

_Limitations:_ currently uses a fairly quick and dirty way to check for comments. In cases where this simple implementation can't
be sure whether code is a comment or not, the file will be omitted from the count and you'll see a warning at the end.

How to Install
==============
SLOC Counter is an extension for [Brackets](https://github.com/adobe/brackets/), a new open-source code editor for the web.

To use SLOC Counter:

1. Choose _File > Install Extension_
2. Enter this URL: _https://github.com/peterflynn/sloc-brackets_
3. Click _Install_!


### License
MIT-licensed -- see `main.js` for details.

### Compatibility
Brackets Sprint 15 or newer (or Adobe Edge Code Preview 2 or newer).