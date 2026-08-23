const tsJest = require('ts-jest').default;

const instance = tsJest.createTransformer({
  tsconfig: {
    target: 'ES2022',
    module: 'CommonJS',
    allowJs: true,
    skipLibCheck: true,
  },
  diagnostics: false,
});

module.exports = {
  process(src, filename, config) {
    const fixed = src.replace(/import\.meta\.url/g, 'require("url").pathToFileURL(__filename).href');
    return instance.process(fixed, filename, config);
  },
};
