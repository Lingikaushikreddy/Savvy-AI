# Contributing to Savvy AI

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Savvy AI. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report.
- **Check existing issues** to avoid duplicates.
- **Use the Bug Report Template** to ensure detailed information is provided (Steps to reproduce, Expected behavior, Screenshots).

### Suggesting Enhancements
- **Open a Discussion** or an Issue with the `enhancement` label.
- Describe the feature in detail and why it would be useful.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code follows the existing style (we use Prettier/ESLint).
5. Format your commit messages clearly.

## Style Guide

### TypeScript / JavaScript
- **Indent**: 2 spaces
- **Semi**: False (No semicolons)
- **Quotes**: Single quotes
- We follow the [Standard JS](https://standardjs.com/) style, enforced via ESLint.

### React
- Functional Components with Hooks.
- Avoid large components; break them down into smaller `src/components/` files.

## Project Structure
- `electron/`: Main process code (Backend logic).
- `src/`: Renderer process code (UI).

## Need Help?
Feel free to ask questions in the Discussions tab on GitHub!
