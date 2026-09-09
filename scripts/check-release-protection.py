#!/usr/bin/env python3
"""Fail closed unless the signing environment requires human review and tag-only refs."""
import json
import os
import subprocess

def validate(environment, policies):
    rules=environment.get('protection_rules',[])
    if not any(r.get('type')=='required_reviewers' and r.get('reviewers') for r in rules):
        raise ValueError('release-signing must require an explicit reviewer; signing is blocked')
    branch=environment.get('deployment_branch_policy') or {}
    if not branch.get('custom_branch_policies'): raise ValueError('Require explicit release-tag policy')
    actual=policies.get('branch_policies',[])
    if not actual or any(p.get('type')!='tag' or p.get('name')!='v*' for p in actual):
        raise ValueError('Only v* tags may enter the signing environment')

if __name__=='__main__':
    repo=os.environ.get('GITHUB_REPOSITORY','creative-it-Software-Consulting-e-U/merkzeug')
    base=f'repos/{repo}/environments/release-signing'
    try:
        environment=json.loads(subprocess.check_output(['gh','api',base],text=True))
        policies=json.loads(subprocess.check_output(['gh','api',base+'/deployment-branch-policies'],text=True))
        validate(environment,policies)
    except (ValueError,subprocess.CalledProcessError) as error: raise SystemExit(f'Release protection check failed: {error}')
    print('Signing environment requires reviewer approval and permits only version tags.')
