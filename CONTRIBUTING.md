# Contributing to Booktifier

Thanks for taking the time to contribute.

## Reporting a bug

Search [existing issues](https://github.com/EgorIakimov/booktifier/issues) first. When opening a new issue, include your browser, device, the steps to reproduce, and the expected result. Share a small synthetic EPUB when a sample is needed. Keep passwords, tokens, email addresses, and private books out of issue reports.

## Submitting a change

Open a pull request describing the problem and resulting behavior. Include relevant issue links and explain how you checked the change. For UI changes, check both languages and narrow screens. For EPUB changes, verify that the resulting archive opens and that chapters and illustrations are preserved.

To check syntax locally, run:

```sh
python3 -m py_compile app/server.py app/epub.py
node --check app/static/app.js
node --check app/static/templates.js
node --check app/static/i18n.js
```

Run the application through its normal upload and export flow before submitting. For a larger feature, open an issue to discuss the approach.
