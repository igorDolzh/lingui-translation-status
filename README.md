# lingui-translation-status

Checks what translations are missing in the current PR

## How to use

```yaml
name: lingui-translation-status

on:
  push:
    # Only run workflow for pushes to specific branches
    branches:
      - master
    # Only run workflow when matching files are changed
    paths:
      - "src/locales/*/messages.po"

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: igorDolzh/lingui-translation-status@v0.0.1
        with:
          # Api token for the Lokalise account
          # with read/write access to the project
          format: json

          # The relative file path where language files will be found
          file-path: src/locales/%LANG_ISO%/messages.po
```
