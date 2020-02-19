module.exports = {
  'env': {
    'browser': true,
    'node': false,
    'commonjs': false,
    'es6': true,
    'mocha': true,
  },
  'extends': ['google'],
  'globals': {
    'Atomics': 'readonly',
    'SharedArrayBuffer': 'readonly',
  },
  'parserOptions': {
    'ecmaVersion': 2018,
    'sourceType': 'module',
  },
  'rules': {
    'max-len': [1, {'code': 120, 'tabWidth': 2}],
    "indent": ["error", 2],
    'require-jsdoc': ['warn', {
      'require': {
        'FunctionDeclaration': false,
        'MethodDefinition': false,
        'ClassDeclaration': false,
        'ArrowFunctionExpression': false,
        'FunctionExpression': false
      }
    }],
    "no-invalid-this": [0],
    "quote-props": [0],
    "new-cap": "off",
    "no-unused-vars": [
      "warn",
      {
        "args": "none"
      }
    ],
    "comma-dangle": [1],
  },
};
