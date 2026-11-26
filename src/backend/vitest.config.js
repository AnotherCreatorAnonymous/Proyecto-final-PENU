const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  root: '../..',
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    globals: true,
  },
});
