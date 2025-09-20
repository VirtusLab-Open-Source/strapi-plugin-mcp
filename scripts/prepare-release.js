#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Release preparation script that:
 * 1. Takes a git commit hash as input
 * 2. Analyzes commits since the specified commit using conventional commits
 * 3. Computes the next semver version
 * 4. Updates package.json with the new version
 * 5. Runs pnpm install
 * 6. Stages package.json and pnpm-lock.yaml
 * 7. Automatically commits the changes
 * 8. Optionally creates a git tag
 */

class ReleasePreparator {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.currentVersion = this.getCurrentVersion();
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      console.error('Error reading package.json:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get the latest git tag (assumes semantic versioning)
   */
  getLatestTag() {
    try {
      const tags = execSync('git tag -l --sort=-version:refname', { encoding: 'utf8' }).trim();
      const tagList = tags.split('\n').filter(tag => tag.match(/^\d+\.\d+\.\d+/));
      return tagList[0] || 'v0.0.0';
    } catch (error) {
      console.warn('No previous tags found, starting from v0.0.0');
      return 'v0.0.0';
    }
  }

  /**
   * Get commits between two references
   */
  getCommitsSince(fromRef, toRef) {
    try {
      const command = `git log ${fromRef}..${toRef} --pretty=format:"%H|%s" --no-merges`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      
      if (!output) {
        return [];
      }

      return output.split('\n').map(line => {
        const [hash, message] = line.split('|');
        return { hash, message };
      });
    } catch (error) {
      console.error('Error getting commits:', error.message);
      process.exit(1);
    }
  }

  /**
   * Parse conventional commit message
   */
  parseConventionalCommit(message) {
    // Regex to match conventional commit format: type(scope)!: subject
    const conventionalCommitRegex = /^(feat|fix|docs|refactor|test|chore|build|ci|perf|style|revert)(\([^)]+\))?(!)?: (.+)$/;
    const match = message.match(conventionalCommitRegex);

    if (!match) {
      return null; // Invalid conventional commit format
    }

    const [, type, scope, breakingChangeMarker, subject] = match;
    const isBreakingChange = !!breakingChangeMarker;

    return {
      type,
      scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
      isBreakingChange,
      subject,
      raw: message
    };
  }

  /**
   * Determine version bump type based on conventional commits
   */
  determineVersionBump(commits) {
    let hasFeat = false;
    let hasFix = false;
    let hasBreaking = false;

    const validCommits = [];

    for (const commit of commits) {
      const parsed = this.parseConventionalCommit(commit.message);
      
      if (!parsed) {
        console.log(`Ignoring invalid commit: ${commit.hash.slice(0, 7)} - ${commit.message}`);
        continue;
      }

      validCommits.push({ ...commit, parsed });

      if (parsed.isBreakingChange) {
        hasBreaking = true;
      } else if (parsed.type === 'feat') {
        hasFeat = true;
      } else if (parsed.type === 'fix') {
        hasFix = true;
      }
    }

    console.log(`Analyzed ${validCommits.length} valid commits (ignored ${commits.length - validCommits.length} invalid)`);

    if (hasBreaking) {
      return { type: 'major', commits: validCommits };
    } else if (hasFeat) {
      return { type: 'minor', commits: validCommits };
    } else if (hasFix) {
      return { type: 'patch', commits: validCommits };
    } else {
      return { type: 'patch', commits: validCommits }; // Default to patch for other changes
    }
  }

  /**
   * Increment version based on semver rules
   */
  incrementVersion(version, bumpType, isBeta = false, betaNumber = null) {
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
    const match = version.replace(/^v/, '').match(versionRegex);

    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    let [, major, minor, patch, prerelease] = match;
    major = Number(major);
    minor = Number(minor);
    patch = Number(patch);

    // If creating a beta version
    if (isBeta) {
      let newBetaNumber;
      
      // If a specific beta number is provided
      if (betaNumber !== null) {
        newBetaNumber = betaNumber;
      } 
      // If current version is already a beta and no specific number provided
      else if (prerelease && prerelease.startsWith('beta.')) {
        const currentBetaNumber = parseInt(prerelease.split('.')[1]) || 0;
        newBetaNumber = currentBetaNumber + 1;
      } 
      // Creating first beta version
      else {
        newBetaNumber = 1;
      }

      // Only bump the base version if we're not already on a beta or if specific beta number is provided
      if (!prerelease || !prerelease.startsWith('beta.') || betaNumber !== null) {
        switch (bumpType) {
          case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
          case 'minor':
            minor += 1;
            patch = 0;
            break;
          case 'patch':
            patch += 1;
            break;
          default:
            throw new Error(`Unknown bump type: ${bumpType}`);
        }
      }

      return `${major}.${minor}.${patch}-beta.${newBetaNumber}`;
    }

    // Regular version increment (non-beta)
    switch (bumpType) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
      default:
        throw new Error(`Unknown bump type: ${bumpType}`);
    }

    return `${major}.${minor}.${patch}`;
  }

  /**
   * Update package.json with new version
   */
  updatePackageJson(newVersion) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      packageJson.version = newVersion;
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated package.json version to ${newVersion}`);
    } catch (error) {
      console.error('Error updating package.json:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run pnpm install
   */
  runPnpmInstall() {
    try {
      console.log('Running pnpm install...');
      execSync('pnpm install', { stdio: 'inherit' });
      console.log('pnpm install completed successfully');
    } catch (error) {
      console.error('Error running pnpm install:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stage files for commit
   */
  stageFiles() {
    try {
      console.log('Staging package.json and pnpm-lock.yaml...');
      execSync('git add package.json pnpm-lock.yaml');
      console.log('Files staged successfully');
    } catch (error) {
      console.error('Error staging files:', error.message);
      process.exit(1);
    }
  }

  /**
   * Commit the staged changes
   */
  commitChanges(version) {
    try {
      const commitMessage = `chore: version ${version}`;
      console.log(`Creating commit: ${commitMessage}`);
      execSync(`git commit -m "${commitMessage}"`);
      console.log('Commit created successfully');
      return commitMessage;
    } catch (error) {
      console.error('Error creating commit:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create a git tag
   */
  createTag(version) {
    try {
      const tagName = `v${version}`;
      console.log(`Creating tag: ${tagName}`);
      execSync(`git tag ${tagName}`);
      console.log('Tag created successfully');
      return tagName;
    } catch (error) {
      console.error('Error creating tag:', error.message);
      process.exit(1);
    }
  }

  /**
   * Main execution method
   */
  async prepare(commitHash, options = {}) {
    const { autoTag = false, isBeta = false, betaNumber = null } = options;
    
    console.log(`Preparing release analyzing commits from ${commitHash} to HEAD`);
    console.log(`Current version: ${this.currentVersion}`);
    console.log(`Release type: ${isBeta ? (betaNumber ? `beta.${betaNumber}` : 'beta') : 'stable'}`);
    console.log(`Auto-tagging: ${autoTag ? 'enabled' : 'disabled'}`);

    // Get commits from the specified commit to HEAD (latest commit)
    const commits = this.getCommitsSince(commitHash, 'HEAD');
    
    if (commits.length === 0) {
      console.log('No new commits found since the specified commit. Nothing to release.');
      return;
    }

    console.log(`Found ${commits.length} commits since ${commitHash}`);

    // Analyze commits and determine version bump
    const { type: bumpType, commits: validCommits } = this.determineVersionBump(commits);
    
    if (validCommits.length === 0) {
      console.log('No valid conventional commits found. Cannot determine version bump.');
      process.exit(1);
    }

    console.log(`Version bump type: ${bumpType}`);

    // Calculate new version
    const newVersion = this.incrementVersion(this.currentVersion, bumpType, isBeta, betaNumber);
    console.log(`New version: ${newVersion}`);

    // Show commit summary
    console.log('\nCommits included in this release:');
    validCommits.forEach(commit => {
      const type = commit.parsed.type;
      const scope = commit.parsed.scope ? `(${commit.parsed.scope})` : '';
      const breaking = commit.parsed.isBreakingChange ? '!' : '';
      console.log(`  ${commit.hash.slice(0, 7)} ${type}${scope}${breaking}: ${commit.parsed.subject}`);
    });

    // Update package.json
    this.updatePackageJson(newVersion);

    // Run pnpm install
    this.runPnpmInstall();

    // Stage files
    this.stageFiles();

    // Commit changes automatically
    const commitMessage = this.commitChanges(newVersion);

    // Create tag if requested
    let tagName = null;
    if (autoTag) {
      tagName = this.createTag(newVersion);
    }

    console.log(`\nRelease completed successfully!`);
    console.log(`Version updated from ${this.currentVersion} to ${newVersion}`);
    console.log(`Commit created: ${commitMessage}`);
    
    if (autoTag) {
      console.log(`Tag created: ${tagName}`);
      console.log(`\nNext steps:`);
      console.log(`  git push origin main`);
      console.log(`  git push origin ${tagName}`);
    } else {
      console.log(`\nNext steps:`);
      console.log(`  git push origin main`);
      console.log(`  git tag v${newVersion}  # Create tag manually if needed`);
      console.log(`  git push origin v${newVersion}  # Push tag if created`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const commitHash = args[0];
  const autoTag = args.includes('--tag');
  
  // Parse beta argument - could be --beta or --beta=N or --beta N
  let isBeta = false;
  let betaNumber = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--beta') {
      isBeta = true;
      // Check if next argument is a number
      if (i + 1 < args.length && /^\d+$/.test(args[i + 1])) {
        betaNumber = parseInt(args[i + 1]);
      }
    } else if (arg.startsWith('--beta=')) {
      isBeta = true;
      const numberPart = arg.split('=')[1];
      if (/^\d+$/.test(numberPart)) {
        betaNumber = parseInt(numberPart);
      } else {
        console.error(`Invalid beta number: ${numberPart}. Must be a positive integer.`);
        process.exit(1);
      }
    }
  }

  if (!commitHash) {
    console.error('Usage: node prepare-release.js <commit-hash> [--tag] [--beta[=N]]');
    console.error('Example: node prepare-release.js abc1234');
    console.error('Example: node prepare-release.js abc1234 --tag');
    console.error('Example: node prepare-release.js abc1234 --beta');
    console.error('Example: node prepare-release.js abc1234 --beta=2');
    console.error('Example: node prepare-release.js abc1234 --beta 3 --tag');
    console.error('');
    console.error('Options:');
    console.error('  --tag        Automatically create a git tag after committing');
    console.error('  --beta[=N]   Create a beta release (e.g., 1.0.0-beta.1)');
    console.error('               Optionally specify beta number (e.g., --beta=2 for 1.0.0-beta.2)');
    process.exit(1);
  }

  // Validate that we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Not in a git repository');
    process.exit(1);
  }

  // Validate commit hash exists
  try {
    execSync(`git rev-parse --verify ${commitHash}`, { stdio: 'ignore' });
  } catch (error) {
    console.error(`Error: Commit hash ${commitHash} not found`);
    process.exit(1);
  }

  const preparator = new ReleasePreparator();
  await preparator.prepare(commitHash, { autoTag, isBeta, betaNumber });
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = ReleasePreparator;
