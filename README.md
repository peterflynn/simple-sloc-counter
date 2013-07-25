JS Lines of Code Counter (SLOC) for Brackets
============================================
Counts the number of JavaScript files, lines, and lines of code (excluding whitespace/comments) in your project. You can exclude
third-party code such as jQuery by specifying file / folder names.

To get started, just choose _View > Lines of Code Count_.

_Limitations:_ currently uses a fairly quick and dirty way to check for comments. In cases where this simple implementation can't
be sure whether code is a comment or not, the file will be omitted from the count and you'll see a warning at the end.

How to Install
==============
SLOC Counter is an extension for [Brackets](https://github.com/adobe/brackets/), a new open-source code editor for the web.

To install extensions:

1. Choose _File > Extension Manager_ and select the _Available_ tab
2. Search for this extension
3. Click _Install_!


### License
MIT-licensed -- see `main.js` for details.

### Compatibility
Brackets Sprint 15 or newer (or Adobe Edge Code Preview 2 or newer).