#!/usr/bin/env python3
"""
GitHub Actions Monitor & Auto-Debug System
Monitors workflow runs, analyzes failures, and suggests/applies fixes automatically.
"""

import os
import json
import requests
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GitHubActionsMonitor:
    def __init__(self, repo: str, token: str):
        self.repo = repo
        self.token = token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Load error patterns
        self.error_patterns = self.load_error_patterns()
    
    def load_error_patterns(self) -> Dict:
        """Load known error patterns and their fixes"""
        patterns_file = os.path.join(os.path.dirname(__file__), 'error-patterns.json')
        try:
            with open(patterns_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Error patterns file not found: {patterns_file}")
            return {}
    
    def get_recent_workflow_runs(self, hours: int = 24) -> List[Dict]:
        """Get workflow runs from the last N hours"""
        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat() + 'Z'
        
        url = f"{self.base_url}/repos/{self.repo}/actions/runs"
        params = {
            'per_page': 50,
            'created': f'>={since}'
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get('workflow_runs', [])
        except requests.RequestException as e:
            logger.error(f"Failed to fetch workflow runs: {e}")
            return []
    
    def get_workflow_jobs(self, run_id: int) -> List[Dict]:
        """Get jobs for a specific workflow run"""
        url = f"{self.base_url}/repos/{self.repo}/actions/runs/{run_id}/jobs"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json().get('jobs', [])
        except requests.RequestException as e:
            logger.error(f"Failed to fetch jobs for run {run_id}: {e}")
            return []
    
    def get_job_logs(self, job_id: int) -> str:
        """Get logs for a specific job"""
        url = f"{self.base_url}/repos/{self.repo}/actions/jobs/{job_id}/logs"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Failed to fetch logs for job {job_id}: {e}")
            return ""
    
    def analyze_error(self, logs: str, workflow_name: str) -> Optional[Dict]:
        """Analyze error logs and suggest fixes"""
        for pattern_name, pattern_data in self.error_patterns.items():
            for error_pattern in pattern_data.get('patterns', []):
                if re.search(error_pattern, logs, re.IGNORECASE | re.MULTILINE):
                    return {
                        'error_type': pattern_name,
                        'description': pattern_data.get('description', ''),
                        'fix': pattern_data.get('fix', ''),
                        'auto_fixable': pattern_data.get('auto_fixable', False),
                        'workflow_name': workflow_name
                    }
        
        # If no known pattern found, try to extract error from logs
        error_lines = []
        for line in logs.split('\n'):
            if any(keyword in line.lower() for keyword in ['error', 'failed', 'rejected']):
                error_lines.append(line.strip())
        
        if error_lines:
            return {
                'error_type': 'unknown',
                'description': 'Unknown error detected',
                'error_details': error_lines[:5],  # First 5 error lines
                'fix': 'Manual investigation required',
                'auto_fixable': False,
                'workflow_name': workflow_name
            }
        
        return None
    
    def monitor_workflows(self) -> Dict:
        """Monitor workflows and return analysis results"""
        logger.info(f"Monitoring workflows for repo: {self.repo}")
        
        runs = self.get_recent_workflow_runs()
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_runs': len(runs),
            'failed_runs': 0,
            'successful_runs': 0,
            'errors_found': [],
            'summary': {}
        }
        
        workflow_stats = {}
        
        for run in runs:
            workflow_name = run.get('name', 'Unknown')
            conclusion = run.get('conclusion')
            
            # Update stats
            if workflow_name not in workflow_stats:
                workflow_stats[workflow_name] = {'total': 0, 'failed': 0, 'success': 0}
            
            workflow_stats[workflow_name]['total'] += 1
            
            if conclusion == 'failure':
                results['failed_runs'] += 1
                workflow_stats[workflow_name]['failed'] += 1
                
                # Analyze failed run
                logger.info(f"Analyzing failed run: {workflow_name} (ID: {run['id']})")
                jobs = self.get_workflow_jobs(run['id'])
                
                for job in jobs:
                    if job.get('conclusion') == 'failure':
                        logs = self.get_job_logs(job['id'])
                        error_analysis = self.analyze_error(logs, workflow_name)
                        
                        if error_analysis:
                            error_analysis.update({
                                'run_id': run['id'],
                                'job_id': job['id'],
                                'job_name': job.get('name', 'Unknown'),
                                'run_url': run.get('html_url', ''),
                                'created_at': run.get('created_at', '')
                            })
                            results['errors_found'].append(error_analysis)
            
            elif conclusion == 'success':
                results['successful_runs'] += 1
                workflow_stats[workflow_name]['success'] += 1
        
        results['summary'] = workflow_stats
        return results
    
    def generate_report(self, results: Dict) -> str:
        """Generate a human-readable report"""
        report = []
        report.append("# 🔍 GitHub Actions Monitoring Report")
        report.append(f"**Generated:** {results['timestamp']}")
        report.append(f"**Repository:** {self.repo}")
        report.append("")
        
        # Summary
        report.append("## 📊 Summary")
        report.append(f"- **Total Runs:** {results['total_runs']}")
        report.append(f"- **✅ Successful:** {results['successful_runs']}")
        report.append(f"- **❌ Failed:** {results['failed_runs']}")
        
        if results['total_runs'] > 0:
            success_rate = (results['successful_runs'] / results['total_runs']) * 100
            report.append(f"- **📈 Success Rate:** {success_rate:.1f}%")
        
        report.append("")
        
        # Workflow breakdown
        if results['summary']:
            report.append("## 🔧 Workflow Breakdown")
            for workflow, stats in results['summary'].items():
                success_rate = (stats['success'] / stats['total']) * 100 if stats['total'] > 0 else 0
                status_emoji = "✅" if success_rate >= 80 else "⚠️" if success_rate >= 50 else "❌"
                report.append(f"- **{status_emoji} {workflow}:** {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Errors found
        if results['errors_found']:
            report.append("")
            report.append("## 🚨 Errors Found")
            
            for i, error in enumerate(results['errors_found'], 1):
                report.append(f"### {i}. {error['workflow_name']} - {error['error_type']}")
                report.append(f"**Job:** {error['job_name']}")
                report.append(f"**Description:** {error['description']}")
                
                if error.get('error_details'):
                    report.append("**Error Details:**")
                    for detail in error['error_details']:
                        report.append(f"```\n{detail}\n```")
                
                report.append(f"**Fix:** {error['fix']}")
                report.append(f"**Auto-fixable:** {'✅ Yes' if error['auto_fixable'] else '❌ No'}")
                report.append(f"**Run URL:** {error['run_url']}")
                report.append("")
        else:
            report.append("")
            report.append("## 🎉 No Errors Found!")
            report.append("All workflows are running successfully.")
        
        return "\n".join(report)

def main():
    """Main function to run the monitor"""
    repo = os.getenv('GITHUB_REPOSITORY', 'thubv/kilocode')
    token = os.getenv('GITHUB_TOKEN')
    
    if not token:
        logger.error("GITHUB_TOKEN environment variable is required")
        return
    
    monitor = GitHubActionsMonitor(repo, token)
    results = monitor.monitor_workflows()
    report = monitor.generate_report(results)
    
    # Print report
    print(report)
    
    # Save results to file
    with open('workflow-monitor-results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save report to file
    with open('workflow-monitor-report.md', 'w') as f:
        f.write(report)
    
    logger.info("Monitoring complete. Results saved to workflow-monitor-results.json and workflow-monitor-report.md")

if __name__ == "__main__":
    main()
