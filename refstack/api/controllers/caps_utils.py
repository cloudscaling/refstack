import json
from oslo_config import cfg
from oslo_log import log
import pecan
import requests
import requests_cache

from refstack import db

LOG = log.getLogger(__name__)
CONF = cfg.CONF

# Cached requests will expire after 10 minutes.
requests_cache.install_cache(cache_name='github_cache',
                             backend='memory',
                             expire_after=600)


def load_schema(url):
    """Returns json file by version"""
    try:
        response = requests.get(url)
        LOG.debug("Response Status: %s / Used Requests Cache: %s" %
                  (response.status_code,
                   getattr(response, 'from_cache', False)))
        if response.status_code == 200:
            return response.json()

        LOG.warning('Github returned non-success HTTP '
                    'code: %s for url %s' % (response.status_code, url))
    except requests.exceptions.RequestException as e:
        LOG.warning('An error occurred trying to get GitHub '
                    'capability file (%s) contents: %s' % (url, e))
    return None


def get_capability(target, version):
    target_programs = get_target_programs()
    for ctarget in target_programs:
        if ctarget['targetProgram'] != target:
            continue
        result = load_schema(ctarget['urls'][version])
        if not result:
            pecan.abort(500, 'Schema file could not be loaded')
        return result
    return None


def get_capability_tests(target, version):
    """Returns list of tests for version.json and target"""
    full_list = get_capability(target, version)
    version = full_list['schema'].split('.')

    # 2. filter tests by target
    targets = set()
    if target != 'platform':
        targets.add(target)
    else:
        p = full_list['platform']
        targets = set().union(p['required']).union(p['advisory'])
    components = full_list['components']
    caps = set()
    for c in components:
        if c not in targets:
            continue
        cv = components[c]
        caps = caps.union(cv['required']).union(cv['advisory'])
    json_caps = full_list['capabilities']
    tests = set()
    for json_cap in json_caps:
        if json_cap not in caps:
            continue
        cv = json_caps[json_cap]
        try:
            if int(version[0]) <= 1 and int(version[1]) <= 2:
                for test in cv['tests']:
                    tests.add(test)
            else:
                for test in cv['tests']:
                    test_prop = cv['tests'][test]
                    test_name = test
                    if 'idempotent_id' in test_prop:
                        test_name += '[' + test_prop['idempotent_id'] + ']'
                    tests.add(test_name)
        except AttributeError:
            LOG.exception(str(cv['tests']))
            raise

    return tests


def get_target_programs():
    result = dict()
    schemas = db.get_schemas()
    for schema in schemas:
        data = schema['cached_data']
        if not data:
            data = _load_targets_data(schema['url'])
            if not data:
                continue
            schema['cached_data'] = json.dumps(data)
            db.update_schema(schema)
        else:
            data = json.loads(data)

        targets = data['target_programs']
        for target in targets:
            result.setdefault(
                target,
                {'targetProgram': target,
                 'description': targets[target]['description'],
                 'versions': list(),
                 'urls': dict()})
            result[target]['versions'].append(data['id'])
            result[target]['urls'][data['id']] = schema['url']

    return [result[k] for k in result]


def _load_targets_data(url):
    schema = load_schema(url)
    if not schema:
        return None
    version = schema['schema'].split('.')
    targets = dict()
    if int(version[0]) < 2 and int(version[1]) < 5:
        targets['platform'] = {'description': 'OpenStack Powered Platform'}
        targets['compute'] = {'description': 'OpenStack Powered Compute'}
        targets['object'] = {'description': 'OpenStack Powered Object Storage'}
    else:
        items = schema['target_programs']
        for item in items:
            targets[item] = {'description': items[item]['description']}

    return {'id': schema['id'], 'target_programs': targets}
