import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [{
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                },
                project: './tsconfig.json',
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                ...globals.browser,
                React: 'readonly',
                JSX: 'readonly',
                process: 'readonly',
                // Next.js specific globals
                Image: 'readonly',
                Link: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // TypeScript rules
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'off', // Allows for better inference in Next.js

            // Enforce CSS variable usage for colors
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['**/tailwindcss/**'],
                            message: 'Use CSS variables instead of direct Tailwind color classes. Use bg-primary instead of bg-blue-500, text-secondary instead of text-gray-600, etc.'
                        }
                    ]
                }
            ],

            // // Next.js specific rules
            // 'react/react-in-jsx-scope': 'off', // Not needed in Next.js
            // 'jsx-a11y/anchor-is-valid': 'off', // Next.js Link component handles this

            // // Error rules (no warnings)
            // 'no-console': 'error',
            // 'no-debugger': 'error',
            // 'prefer-const': 'error',
            // 'no-var': 'error',

            // // Formatting rules
            // indent: ['error', 2],
            // 'comma-spacing': ['error', {
            //     before: false,
            //     after: true
            // }],
            // quotes: ['error', 'single', {
            //     avoidEscape: true
            // }],
            // semi: ['error', 'always'],
            // 'object-curly-spacing': ['error', 'always'],
            // 'array-bracket-spacing': ['error', 'never'],
            // 'space-in-parens': ['error', 'never'],
            // 'space-before-blocks': ['error', 'always'],
            // 'space-before-function-paren': ['error', 'never'],
            // 'space-infix-ops': ['error'],
            // 'key-spacing': ['error', {
            //     beforeColon: false,
            //     afterColon: true
            // }],
            // 'brace-style': ['error', '1tbs', {
            //     allowSingleLine: true
            // }],
            // 'comma-dangle': ['error', 'always-multiline'],
            // 'eol-last': ['error', 'always'],
            // 'func-call-spacing': ['error', 'never'],

            // // Next.js font handling
            // 'new-cap': [
            //     'error',
            //     {
            //         newIsCap: true,
            //         capIsNew: false, // Allow capitalized functions without new
            //         newIsCapExceptions: [],
            //         capIsNewExceptions: [
            //             'Inter',
            //             'Roboto',
            //             'Arial',
            //             'Helvetica',
            //             'Georgia',
            //             'Merriweather',
            //         ], // Next.js font functions
            //     },
            // ],

            // 'no-multiple-empty-lines': ['error', {
            //     max: 1,
            //     maxEOF: 0
            // }],
            // 'no-trailing-spaces': 'error',
            // 'padded-blocks': ['error', 'never'],
        },
    },
    // Next.js app directory specific config
    {
        files: ['app/**/*.{ts,tsx}'],
        rules: {
            'import/prefer-default-export': 'off',
            'react/function-component-definition': 'off',
        },
    },
    {
        files: ['app/**/page.tsx'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ExpressionStatement > Literal[value="use client"]',
                    message: '"use client" is not allowed in page.tsx files. Move logic to a client.tsx file as per /utils/supabase/README.md',
                },
            ],
        },
    },
    prettier,
];