
# Contributing to XHRay – Telemetry Correlator

Thank you for considering contributing to XHRay! This guide outlines the process for contributing to the project.

## 📋 Code of Conduct

Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## 🛠️ Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/FinickySpider/XHRay.git
   cd XHRay
````

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run tests:**

   ```bash
   npm test
   ```

## 📝 Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Examples:

* `feat: add new telemetry parser`
* `fix: resolve issue with data correlation`
* `docs: update README with installation instructions`

## 🚀 Releasing

To create a new release:

1. **Ensure your working directory is clean:**

   ```bash
   git status
   ```

2. **Run the release script:**

   ```bash
   npm run release
   ```

   This will:

   * Bump the version in `package.json` based on commits
   * Generate or update the `CHANGELOG.md`
   * Commit the changes and create a Git tag

3. **Push the changes and tags:**

   ```bash
   git push --follow-tags origin main
   ```

   *Note: Replace `main` with your default branch if different.*

## 🤝 Pull Requests

1. Fork the repository and create your branch from `main`.
2. Ensure your code adheres to the project's coding standards.
3. Include tests for your changes.
4. Submit a pull request with a clear description of your changes.

Thank you for contributing!

