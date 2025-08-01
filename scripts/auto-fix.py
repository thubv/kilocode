#!/usr/bin/env python3
"""
Auto-Fix System for GitHub Actions
Automatically applies fixes for known workflow issues.
"""

import os
import json
import re
import subprocess
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class AutoFixer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.workflows_path = os.path.join(repo_path, ".github", "workflows")
        
        # Load error patterns
        patterns_file = os.path.join(os.path.dirname(__file__), 'error-patterns.json')
        with open(patterns_file, 'r') as f:
            self.error_patterns = json.load(f)
    
    def apply_workflow_fix(self, workflow_file: str, error_type: str) -> bool:
        """Apply automatic fix to a workflow file"""
        if error_type not in self.error_patterns:
            logger.error(f"Unknown error type: {error_type}")
            return False
        
        pattern_data = self.error_patterns[error_type]
        if not pattern_data.get('auto_fixable', False):
            logger.info(f"Error type '{error_type}' is not auto-fixable")
            return False
        
        workflow_fixes = pattern_data.get('workflow_fixes', {})
        if workflow_file not in workflow_fixes:
            logger.info(f"No specific fix available for {workflow_file}")
            return False
        
        fix_config = workflow_fixes[workflow_file]
        workflow_path = os.path.join(self.workflows_path, workflow_file)
        
        if not os.path.exists(workflow_path):
            logger.error(f"Workflow file not found: {workflow_path}")
            return False
        
        try:
            with open(workflow_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Apply search and replace fixes
            if 'search' in fix_config and 'replace' in fix_config:
                content = content.replace(fix_config['search'], fix_config['replace'])
            
            # Add timeout if specified
            if 'add_timeout' in fix_config:
                timeout_line = f"    {fix_config['add_timeout']}"
                # Add timeout after 'runs-on' line
                content = re.sub(
                    r'(\s+runs-on:\s+[^\n]+\n)',
                    f'\\1{timeout_line}\n',
                    content
                )
            
            # Add steps if specified
            if 'add_step' in fix_config:
                step_config = fix_config['add_step']
                step_yaml = f"""      - name: {step_config['name']}
        run: {step_config['run']}
"""
                
                if step_config.get('position') == 'before_install':
                    # Add before npm install or similar
                    content = re.sub(
                        r'(\s+- name:.*install.*\n)',
                        f'{step_yaml}\\1',
                        content,
                        flags=re.IGNORECASE
                    )
            
            # Add retry logic if specified
            if 'add_retry' in fix_config:
                retry_config = fix_config['add_retry']
                retry_yaml = f"""      - name: Install dependencies with retry
        uses: {retry_config['uses']}
        with:
          timeout_minutes: {retry_config['with']['timeout_minutes']}
          max_attempts: {retry_config['with']['max_attempts']}
          command: {retry_config['with']['command']}
"""
                
                # Replace npm install step with retry version
                content = re.sub(
                    r'\s+- name:.*install.*\n\s+run:\s+npm install.*\n',
                    retry_yaml,
                    content,
                    flags=re.IGNORECASE
                )
            
            # Only write if content changed
            if content != original_content:
                with open(workflow_path, 'w') as f:
                    f.write(content)
                
                logger.info(f"Applied fix for '{error_type}' to {workflow_file}")
                return True
            else:
                logger.info(f"No changes needed for {workflow_file}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to apply fix to {workflow_file}: {e}")
            return False
    
    def create_fix_branch(self, error_type: str, workflow_files: List[str]) -> str:
        """Create a new branch for the fix"""
        branch_name = f"auto-fix/{error_type}-{int(datetime.now().timestamp())}"
        
        try:
            subprocess.run(['git', 'checkout', '-b', branch_name], 
                         cwd=self.repo_path, check=True, capture_output=True)
            logger.info(f"Created fix branch: {branch_name}")
            return branch_name
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create branch: {e}")
            return ""
    
    def commit_fixes(self, error_type: str, workflow_files: List[str]) -> bool:
        """Commit the applied fixes"""
        try:
            # Add changed files
            for workflow_file in workflow_files:
                workflow_path = os.path.join(self.workflows_path, workflow_file)
                subprocess.run(['git', 'add', workflow_path], 
                             cwd=self.repo_path, check=True)
            
            # Create commit message
            pattern_data = self.error_patterns[error_type]
            commit_msg = f"auto-fix: {pattern_data['description']}\n\n"
            commit_msg += f"Applied automatic fix for: {error_type}\n"
            commit_msg += f"Affected workflows: {', '.join(workflow_files)}\n"
            commit_msg += f"Fix: {pattern_data['fix']}"
            
            subprocess.run(['git', 'commit', '-m', commit_msg], 
                         cwd=self.repo_path, check=True)
            
            logger.info(f"Committed fixes for {error_type}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to commit fixes: {e}")
            return False
    
    def apply_fixes(self, errors: List[Dict]) -> Dict:
        """Apply fixes for a list of errors"""
        results = {
            'fixes_applied': 0,
            'fixes_failed': 0,
            'manual_fixes_needed': 0,
            'details': []
        }
        
        # Group errors by type and workflow
        error_groups = {}
        for error in errors:
            error_type = error['error_type']
            workflow_name = error['workflow_name']
            
            if error_type not in error_groups:
                error_groups[error_type] = set()
            error_groups[error_type].add(workflow_name)
        
        # Apply fixes for each error type
        for error_type, workflow_files in error_groups.items():
            workflow_files = list(workflow_files)
            
            if error_type not in self.error_patterns:
                results['fixes_failed'] += 1
                results['details'].append({
                    'error_type': error_type,
                    'status': 'failed',
                    'reason': 'Unknown error type'
                })
                continue
            
            pattern_data = self.error_patterns[error_type]
            
            if not pattern_data.get('auto_fixable', False):
                results['manual_fixes_needed'] += 1
                results['details'].append({
                    'error_type': error_type,
                    'status': 'manual_required',
                    'reason': 'Not auto-fixable',
                    'manual_steps': pattern_data.get('manual_steps', [])
                })
                continue
            
            # Try to apply fixes
            fixes_applied = []
            for workflow_file in workflow_files:
                if self.apply_workflow_fix(workflow_file, error_type):
                    fixes_applied.append(workflow_file)
            
            if fixes_applied:
                # Create branch and commit fixes
                branch_name = self.create_fix_branch(error_type, fixes_applied)
                if branch_name and self.commit_fixes(error_type, fixes_applied):
                    results['fixes_applied'] += 1
                    results['details'].append({
                        'error_type': error_type,
                        'status': 'fixed',
                        'branch': branch_name,
                        'workflows': fixes_applied
                    })
                else:
                    results['fixes_failed'] += 1
                    results['details'].append({
                        'error_type': error_type,
                        'status': 'failed',
                        'reason': 'Failed to commit fixes'
                    })
            else:
                results['fixes_failed'] += 1
                results['details'].append({
                    'error_type': error_type,
                    'status': 'failed',
                    'reason': 'No fixes could be applied'
                })
        
        return results

def main():
    """Main function for auto-fix"""
    import sys
    from datetime import datetime
    
    if len(sys.argv) < 2:
        print("Usage: python auto-fix.py <monitor-results.json>")
        sys.exit(1)
    
    results_file = sys.argv[1]
    
    try:
        with open(results_file, 'r') as f:
            monitor_results = json.load(f)
    except FileNotFoundError:
        logger.error(f"Results file not found: {results_file}")
        sys.exit(1)
    
    errors = monitor_results.get('errors_found', [])
    if not errors:
        logger.info("No errors found to fix")
        return
    
    auto_fixer = AutoFixer()
    fix_results = auto_fixer.apply_fixes(errors)
    
    # Print results
    print(f"Auto-fix Results:")
    print(f"- Fixes Applied: {fix_results['fixes_applied']}")
    print(f"- Fixes Failed: {fix_results['fixes_failed']}")
    print(f"- Manual Fixes Needed: {fix_results['manual_fixes_needed']}")
    
    for detail in fix_results['details']:
        print(f"\n{detail['error_type']}: {detail['status']}")
        if detail.get('branch'):
            print(f"  Branch: {detail['branch']}")
        if detail.get('reason'):
            print(f"  Reason: {detail['reason']}")

if __name__ == "__main__":
    main()
