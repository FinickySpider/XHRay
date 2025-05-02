module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'type-enum': [
        2,
        'always',
        [
          'feat',
          'fix',
          'docs',
          'style',
          'refactor',
          'perf',
          'test',
          'build',
          'ci',
          'chore',
          'revert'
        ]
      ],
      'scope-enum': [
        2,
        'always',
        [
          'telemetry',
          'panels',
          'settings',
          'matchers',
          'storage',
          'docs',
          'build',
          'ci'
        ]
      ],
      'type-case': [2, 'always', 'lower-case'],
      'scope-case': [2, 'always', 'kebab-case'],
      'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
      'subject-empty': [2, 'never'],
      'subject-full-stop': [2, 'never', '.']
    }
  };
  