#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Changelog generation script that:
 * 1. Gets all commits from git history
 * 2. Identifies releases by chore commits containing "release"
 * 3. Groups commits between releases
 * 4. Parses conventional commits
 * 5. Generates a structured CHANGELOG.md file
 */

/**
 * Get all commits from git history
 */
function getAllCommits() {
  try {
    const command = 'git log --pretty=format:"%H|%s|%ad|%an" --date=short --no-merges';
    const output = execSync(command, { encoding: 'utf8' }).trim();

    if (!output) {
      return [];
    }

    return output.split('\n').map((line) => {
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return [];
  }
}

/**
 * Check if a commit is a release commit (chore type starting with "version")
 */
function isReleaseCommit(commit) {
  const parsed = parseConventionalCommit(commit.message);
  return (
    parsed &&
    parsed.type === 'chore' &&
    parsed.subject &&
    parsed.subject.toLowerCase().startsWith('version')
  );
}

/**
 * Extract version from release commit message
 */
function extractVersionFromReleaseCommit(commit) {
  // Look for version patterns like v1.2.3, 1.2.3, 1.2.3-beta.1, etc.
  // This regex captures standard semver including prereleases like beta, alpha, rc
  const versionMatch = commit.message.match(
    /v?(\d+\.\d+\.\d+(?:-(?:beta|alpha|rc)\.?\d*)?(?:-[a-zA-Z0-9.-]*)?)/
  );
  if (versionMatch) {
    return versionMatch[1];
  }

  // Fallback: try to extract just from the subject part for "chore: version X.Y.Z" format
  const parsed = parseConventionalCommit(commit.message);
  if (parsed && parsed.subject) {
    const subjectVersionMatch = parsed.subject.match(
      /version\s+v?(\d+\.\d+\.\d+(?:-(?:beta|alpha|rc)\.?\d*)?(?:-[a-zA-Z0-9.-]*)?)/i
    );
    if (subjectVersionMatch) {
      return subjectVersionMatch[1];
    }
  }

  return 'Unknown';
}

/**
 * Parse conventional commit message
 */
function parseConventionalCommit(message) {
  // Regex to match conventional commit format: type(scope)!: subject
  const conventionalCommitRegex =
    /^(feat|fix|docs|refactor|test|chore|build|ci|perf|style|revert)(\([^)]+\))?(!)?: (.+)$/;
  const match = message.match(conventionalCommitRegex);

  if (!match) {
    return null; // Not a conventional commit
  }

  const [, type, scope, breakingChangeMarker, subject] = match;
  const isBreakingChange = !!breakingChangeMarker;

  return {
    type,
    scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
    isBreakingChange,
    subject,
    raw: message,
  };
}

/**
 * Group commits by type
 */
function groupCommitsByType(commits) {
  const groups = {
    breaking: [],
    features: [],
    fixes: [],
    docs: [],
    refactor: [],
    performance: [],
    chore: [],
    other: [],
  };

  commits.forEach((commit) => {
    const parsed = parseConventionalCommit(commit.message);

    if (!parsed) {
      groups.other.push({ ...commit, parsed: null });
      return;
    }

    const commitWithParsed = { ...commit, parsed };

    if (parsed.isBreakingChange) {
      groups.breaking.push(commitWithParsed);
    } else {
      switch (parsed.type) {
        case 'feat':
          groups.features.push(commitWithParsed);
          break;
        case 'fix':
          groups.fixes.push(commitWithParsed);
          break;
        case 'docs':
          groups.docs.push(commitWithParsed);
          break;
        case 'refactor':
          groups.refactor.push(commitWithParsed);
          break;
        case 'perf':
          groups.performance.push(commitWithParsed);
          break;
        case 'test':
        case 'chore':
        case 'build':
        case 'ci':
        case 'style':
        case 'revert':
          groups.chore.push(commitWithParsed);
          break;
        default:
          groups.other.push(commitWithParsed);
      }
    }
  });

  return groups;
}

/**
 * Group commits into releases based on release commits
 */
function groupCommitsByReleases(commits) {
  const releases = [];
  let currentRelease = {
    version: 'Unreleased',
    date: null,
    commits: [],
  };

  const chronologicalCommits = commits;

  chronologicalCommits.forEach((commit) => {
    if (isReleaseCommit(commit)) {
      // If we have commits in current release, save it
      if (currentRelease.commits.length > 0) {
        releases.push(currentRelease);
      }

      // Start new release
      currentRelease = {
        version: extractVersionFromReleaseCommit(commit),
        date: commit.date,
        commits: [commit], // Include the release commit itself
      };
    } else {
      currentRelease.commits.push(commit);
    }
  });

  // Add the last release (or unreleased if no release commits found)
  if (currentRelease.commits.length > 0) {
    releases.push(currentRelease);
  }

  // Return in reverse order (newest first)
  return releases.reverse();
}

/**
 * Format commit for changelog
 */
function formatCommit(commit) {
  if (!commit.parsed) {
    return `- ${commit.message} ([${commit.hash.slice(0, 7)}](../../commit/${commit.hash}))`;
  }

  const { scope, subject } = commit.parsed;
  const scopeText = scope ? `**${scope}**: ` : '';
  return `- ${scopeText}${subject} ([${commit.hash.slice(0, 7)}](../../commit/${commit.hash}))`;
}

/**
 * Generate changelog section for a release
 */
function generateReleaseSection(release) {
  // Filter out release commits from the commit list for grouping
  const nonReleaseCommits = release.commits.filter((commit) => !isReleaseCommit(commit));
  const groups = groupCommitsByType(nonReleaseCommits);
  let section = '';

  // Release header
  if (release.version === 'Unreleased') {
    section += `## [Unreleased]\n\n`;
  } else {
    section += `## [${release.version}] (${release.date})\n\n`;
  }

  // Breaking changes (most important)
  if (groups.breaking.length > 0) {
    section += '### 💥 BREAKING CHANGES\n\n';
    groups.breaking.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Features
  if (groups.features.length > 0) {
    section += '### ✨ Features\n\n';
    groups.features.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Bug fixes
  if (groups.fixes.length > 0) {
    section += '### 🐛 Bug Fixes\n\n';
    groups.fixes.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Documentation
  if (groups.docs.length > 0) {
    section += '### 📚 Documentation\n\n';
    groups.docs.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Refactoring
  if (groups.refactor.length > 0) {
    section += '### ♻️ Code Refactoring\n\n';
    groups.refactor.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Performance improvements
  if (groups.performance.length > 0) {
    section += '### ⚡ Performance Improvements\n\n';
    groups.performance.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Chore/maintenance (but exclude release commits)
  const nonReleaseChoreCommits = groups.chore.filter((commit) => !isReleaseCommit(commit));
  if (nonReleaseChoreCommits.length > 0) {
    section += '### 🧹 Chore\n\n';
    nonReleaseChoreCommits.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  // Other commits (non-conventional)
  if (groups.other.length > 0) {
    section += '### 📦 Other Changes\n\n';
    groups.other.forEach((commit) => {
      section += formatCommit(commit) + '\n';
    });
    section += '\n';
  }

  return section;
}

/**
 * Generate the complete changelog
 */
function generateChangelog() {
  console.log('Generating changelog...');

  const allCommits = getAllCommits();

  if (allCommits.length === 0) {
    console.log('No commits found.');
    return '# Changelog\n\nNo commits found.\n';
  }

  const releases = groupCommitsByReleases(allCommits);

  console.log(
    `Found ${releases.length} release${releases.length !== 1 ? 's' : ''} (including unreleased changes)`
  );

  let changelog = '# Changelog\n\n';
  changelog += 'All notable changes to this project will be documented in this file.\n\n';
  changelog += 'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\n';
  changelog +=
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n';

  // Generate sections for each release
  releases.reverse().forEach((release) => {
    // Only include releases that have commits (excluding just the release commit itself)
    const nonReleaseCommits = release.commits.filter((commit) => !isReleaseCommit(commit));
    if (nonReleaseCommits.length > 0 || release.version === 'Unreleased') {
      changelog += generateReleaseSection(release);
    }
  });

  return changelog;
}

/**
 * Write changelog to file
 */
function writeChangelog(outputPath = path.join(process.cwd(), 'CHANGELOG.md')) {
  try {
    const changelogContent = generateChangelog();
    fs.writeFileSync(outputPath, changelogContent);
    console.log(`Changelog generated successfully: ${outputPath}`);

    // Show summary
    const lines = changelogContent.split('\n');
    const releases = lines.filter((line) => line.startsWith('## [')).length;
    console.log(`Generated changelog with ${releases} release${releases !== 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Error generating changelog:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node generate-changelog.js [--output=path]');
    console.log('');
    console.log('Generates a CHANGELOG.md file based on conventional commits.');
    console.log('Releases are identified by chore commits starting with "version".');
    console.log('');
    console.log('Options:');
    console.log('  --output=PATH    Specify output file path (default: CHANGELOG.md)');
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-changelog.js');
    console.log('  node generate-changelog.js --output=docs/CHANGELOG.md');
    console.log('');
    console.log('Release identification:');
    console.log(
      '  - Commits with type "chore" and subject starting with "version" are treated as releases'
    );
    console.log('  - Supports both stable and beta versions');
    console.log('  - Examples:');
    console.log('    * "chore: version 1.2.3"');
    console.log('    * "chore: version 1.2.3-beta.1"');
    console.log('    * "chore(repo): version 2.0.0-beta.2"');
    return;
  }

  // Validate that we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Not in a git repository');
    process.exit(1);
  }

  const outputPath = outputFile
    ? path.resolve(outputFile)
    : path.join(process.cwd(), 'CHANGELOG.md');
  writeChangelog(outputPath);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = {};
