#!/bin/bash

# Upstream Sync Helper Script
# Usage: ./upstream-sync.sh [command] [options]

set -e

# Configuration
UPSTREAM_REPO="${UPSTREAM_REPO:-Kilo-Org/kilocode}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Upstream Sync Helper Script

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    check           Check upstream status and conflicts
    sync            Perform upstream sync
    force-sync      Force sync with conflict resolution
    rollback        Rollback to previous state
    setup           Setup upstream remote
    status          Show current sync status
    help            Show this help message

OPTIONS:
    --upstream REPO     Upstream repository (default: $UPSTREAM_REPO)
    --branch BRANCH     Target branch (default: $TARGET_BRANCH)
    --strategy STRATEGY Conflict resolution strategy (ours|theirs|manual)
    --dry-run          Show what would be done without executing
    --verbose          Enable verbose output

EXAMPLES:
    $0 check                                    # Check upstream status
    $0 sync                                     # Sync with upstream
    $0 force-sync --strategy theirs             # Force sync accepting upstream changes
    $0 rollback                                 # Rollback last sync
    $0 setup --upstream MyOrg/my-fork          # Setup different upstream

EOF
}

# Setup upstream remote
setup_upstream() {
    log_info "Setting up upstream remote: $UPSTREAM_REPO"
    
    cd "$REPO_ROOT"
    
    if git remote get-url upstream >/dev/null 2>&1; then
        log_info "Upstream remote exists, updating URL"
        git remote set-url upstream "https://github.com/$UPSTREAM_REPO.git"
    else
        log_info "Adding upstream remote"
        git remote add upstream "https://github.com/$UPSTREAM_REPO.git"
    fi
    
    log_info "Fetching from upstream..."
    git fetch upstream
    git fetch upstream --tags
    
    log_success "Upstream remote setup completed"
    git remote -v | grep upstream
}

# Check upstream status
check_upstream() {
    log_info "Checking upstream status..."
    
    cd "$REPO_ROOT"
    setup_upstream
    
    current_commit=$(git rev-parse HEAD)
    upstream_commit=$(git rev-parse upstream/$TARGET_BRANCH)
    
    echo
    log_info "Current commit:  $current_commit"
    log_info "Upstream commit: $upstream_commit"
    echo
    
    if [ "$current_commit" = "$upstream_commit" ]; then
        log_success "Repository is up to date with upstream"
        return 0
    fi
    
    commits_behind=$(git rev-list --count HEAD..upstream/$TARGET_BRANCH)
    commits_ahead=$(git rev-list --count upstream/$TARGET_BRANCH..HEAD)
    
    log_warning "Repository is out of sync:"
    echo "  - Commits behind upstream: $commits_behind"
    echo "  - Commits ahead of upstream: $commits_ahead"
    echo
    
    if [ $commits_behind -gt 0 ]; then
        log_info "Recent upstream commits:"
        git log --oneline upstream/$TARGET_BRANCH -$commits_behind
        echo
    fi
    
    # Check for conflicts
    log_info "Checking for potential merge conflicts..."
    git checkout $TARGET_BRANCH >/dev/null 2>&1
    
    if git merge --no-commit --no-ff upstream/$TARGET_BRANCH >/dev/null 2>&1; then
        log_success "No merge conflicts detected"
        git merge --abort >/dev/null 2>&1
    else
        log_warning "Potential merge conflicts detected"
        git merge --abort >/dev/null 2>&1
        
        # Try to identify conflicted files
        git merge upstream/$TARGET_BRANCH >/dev/null 2>&1 || true
        conflicted_files=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
        git merge --abort >/dev/null 2>&1
        
        if [ -n "$conflicted_files" ]; then
            log_warning "Potentially conflicted files:"
            echo "$conflicted_files" | sed 's/^/  - /'
        fi
    fi
}

# Perform sync
sync_upstream() {
    local dry_run=${1:-false}
    local strategy=${2:-manual}
    
    log_info "Starting upstream sync..."
    
    cd "$REPO_ROOT"
    setup_upstream
    
    # Create backup
    backup_branch="backup-before-sync-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup branch: $backup_branch"
    
    if [ "$dry_run" = "false" ]; then
        git checkout -b $backup_branch
        git push origin $backup_branch
        git checkout $TARGET_BRANCH
    else
        log_info "[DRY RUN] Would create backup branch: $backup_branch"
    fi
    
    # Check for conflicts first
    if git merge --no-commit --no-ff upstream/$TARGET_BRANCH >/dev/null 2>&1; then
        git merge --abort >/dev/null 2>&1
        log_success "No conflicts detected, proceeding with merge"
        
        if [ "$dry_run" = "false" ]; then
            git merge upstream/$TARGET_BRANCH
            git push origin $TARGET_BRANCH
            git push origin --tags
            log_success "Sync completed successfully"
        else
            log_info "[DRY RUN] Would merge upstream changes"
        fi
    else
        git merge --abort >/dev/null 2>&1
        log_warning "Merge conflicts detected"
        
        if [ "$strategy" = "manual" ]; then
            log_error "Manual conflict resolution required. Use --strategy option or resolve manually."
            return 1
        fi
        
        log_info "Applying conflict resolution strategy: $strategy"
        
        if [ "$dry_run" = "false" ]; then
            if [ "$strategy" = "theirs" ]; then
                git merge -X theirs upstream/$TARGET_BRANCH
            elif [ "$strategy" = "ours" ]; then
                git merge -X ours upstream/$TARGET_BRANCH
            fi
            
            git push origin $TARGET_BRANCH
            git push origin --tags
            log_success "Force sync completed with strategy: $strategy"
        else
            log_info "[DRY RUN] Would apply $strategy strategy"
        fi
    fi
}

# Rollback function
rollback_sync() {
    log_info "Rolling back last sync..."
    
    cd "$REPO_ROOT"
    
    # Find backup branches
    backup_branches=$(git branch -r | grep "origin/backup-before" | head -5)
    
    if [ -z "$backup_branches" ]; then
        log_error "No backup branches found for rollback"
        return 1
    fi
    
    log_info "Available backup branches:"
    echo "$backup_branches" | sed 's/^/  /'
    
    # Use most recent backup
    latest_backup=$(echo "$backup_branches" | head -1 | sed 's/origin\///' | xargs)
    
    log_warning "Rolling back to: $latest_backup"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout $TARGET_BRANCH
        git reset --hard origin/$latest_backup
        git push --force-with-lease origin $TARGET_BRANCH
        log_success "Rollback completed"
    else
        log_info "Rollback cancelled"
    fi
}

# Show status
show_status() {
    log_info "Repository Status:"
    echo
    
    cd "$REPO_ROOT"
    
    echo "Current branch: $(git branch --show-current)"
    echo "Current commit: $(git rev-parse --short HEAD)"
    echo
    
    if git remote get-url upstream >/dev/null 2>&1; then
        echo "Upstream remote: $(git remote get-url upstream)"
        
        # Check if we can reach upstream
        if git ls-remote upstream >/dev/null 2>&1; then
            log_success "Upstream remote is accessible"
        else
            log_warning "Cannot access upstream remote"
        fi
    else
        log_warning "No upstream remote configured"
    fi
    
    echo
    git status --porcelain | head -10
}

# Parse command line arguments
COMMAND=""
DRY_RUN=false
STRATEGY="manual"
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        check|sync|force-sync|rollback|setup|status|help)
            COMMAND="$1"
            shift
            ;;
        --upstream)
            UPSTREAM_REPO="$2"
            shift 2
            ;;
        --branch)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        --strategy)
            STRATEGY="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Enable verbose mode
if [ "$VERBOSE" = "true" ]; then
    set -x
fi

# Execute command
case $COMMAND in
    check)
        check_upstream
        ;;
    sync)
        sync_upstream $DRY_RUN $STRATEGY
        ;;
    force-sync)
        sync_upstream $DRY_RUN $STRATEGY
        ;;
    rollback)
        rollback_sync
        ;;
    setup)
        setup_upstream
        ;;
    status)
        show_status
        ;;
    help|"")
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
