# nimbus-devtools

Nimbus Dev Tools is a browser extension for Firefox that aims to help developers
design and debug experiments on the [Nimbus experimentation platform][nimbus].


[nimbus]: https://experimenter.services.mozilla.com/nimbus/


## Building

Building is done with `npm`:

```
npm install
npm run build
```

This will generate `web-ext-artifacts/nimbus-devtools.xpi`. This extension
cannot be distributed because it requires privileged permissions.

## Development

You will need a copy of [Firefox Nightly][nightly] to develop this extension.

To build the addon for local development, run:

```
npm install
npm run watch
```

This will launch a copy of Firefox Nightly with the extension automatically
loaded. Any changes to source files will cause the addon to be rebuilt and
reloaded in the browser.


[nightly]: https://www.mozilla.org/en-CA/firefox/channel/desktop/


### NPM Scripts

**`build`**:
Build the addon for distribution.

**`clean`**:
Clean all build artifacts and caches.

**`lint`**:
Run linters (`eslint`, `tsc`, `web-ext lint`) on the source.

**`fmt`**:
Format the source code with prettier.

**`fix`**:
Automatically fix any linting and formatting errors.

**`watch`**:
Run the watch server which builds the extension and loads it into Firefox
Nightly.

**`web-ext`**:
Run the installed copy of `web-ext`.
