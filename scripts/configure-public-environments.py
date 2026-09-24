#!/usr/bin/env python3
"""Enable reviewed deployment gates after the owner changes visibility separately.

Read-only by default. Never changes visibility, deploys, or approves a deployment.
GitHub Team cannot enable required environment reviewers on a private repository.
"""
import argparse
import json
import subprocess

REPO = 'creative-it-Software-Consulting-e-U/merkzeug'
ENVIRONMENTS = {
    'github-pages': {('branch', 'main')},
    'app-store-assets': {('branch', 'main'), ('tag', 'v*')},
    'release-signing': {('tag', 'v*')},
    'release-publishing': {('tag', 'v*')},
}


def api(path, method='GET', body=None):
    args = ['gh', 'api', path, '--method', method]
    if body is not None:
        args += ['--input', '-']
    return json.loads(subprocess.check_output(
        args, input=json.dumps(body) if body is not None else None, text=True) or '{}')


def validate(environment, policies, expected, reviewer_id):
    reviewers = [r for r in environment.get('protection_rules', [])
                 if r.get('type') == 'required_reviewers']
    if not any(any(x.get('type') == 'User' and x.get('reviewer', {}).get('id') == reviewer_id
                   for x in r.get('reviewers', [])) for r in reviewers):
        raise ValueError('Missing designated maintainer reviewer')
    if not (environment.get('deployment_branch_policy') or {}).get('custom_branch_policies'):
        raise ValueError('Explicit deployment ref policies are required')
    actual = {(p['type'], p['name']) for p in policies.get('branch_policies', [])}
    if actual != expected:
        raise ValueError('Deployment refs differ from the reviewed policy')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    repo = api('repos/' + REPO)
    if repo['private']:
        raise SystemExit('Repository is private. Keep it private until separately authorized; '
                         'required reviewers cannot be activated on the current Team plan.')
    reviewer = api('users/guentherwieser')['id']
    for name, expected in ENVIRONMENTS.items():
        path = f'repos/{REPO}/environments/{name}'
        # Ref restrictions are prepared while private. Refuse unexpected changes.
        policies = api(path + '/deployment-branch-policies')
        actual = {(p['type'], p['name']) for p in policies['branch_policies']}
        if actual != expected:
            raise SystemExit(f'{name}: review unexpected ref restrictions before proceeding')
        if args.apply:
            api(path, 'PUT', {
                'wait_timer': 0, 'prevent_self_review': False,
                'reviewers': [{'type': 'User', 'id': reviewer}],
                'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True},
            })
        validate(api(path), policies, expected, reviewer)
        print(name + ': reviewer and allowed refs verified')
        if api(path).get('can_admins_bypass', True):
            print('  Disable administrator bypass in the environment settings UI; '
                  'the documented REST endpoint does not expose that setting.')
    path = f'repos/{REPO}/actions/permissions/fork-pr-contributor-approval'
    if args.apply:
        api(path, 'PUT', {'approval_policy': 'all_external_contributors'})
    if api(path).get('approval_policy') != 'all_external_contributors':
        raise SystemExit('Approval must be required for every outside contributor')
    print('Outside contributor workflow approval verified; no deployment was started.')


if __name__ == '__main__':
    main()
