from oslo_config import cfg
from oslo_log import log
import pecan
import requests
import requests_cache

LOG = log.getLogger(__name__)
CONF = cfg.CONF

# Cached requests will expire after 10 minutes.
requests_cache.install_cache(cache_name='github_cache',
                             backend='memory',
                             expire_after=600)


def get_capability(version):
    github_url = ''.join((CONF.api.github_raw_base_url.rstrip('/'),
                      '/', version))
    try:
        response = requests.get(github_url)
        LOG.debug("Response Status: %s / Used Requests Cache: %s" %
                  (response.status_code,
                   getattr(response, 'from_cache', False)))
        if response.status_code == 200:
            return response.json()
        else:
            LOG.warning('Github returned non-success HTTP '
                        'code: %s' % response.status_code)
            pecan.abort(response.status_code)
    except requests.exceptions.RequestException as e:
        LOG.warning('An error occurred trying to get GitHub '
                    'capability file contents: %s' % e)
        pecan.abort(500)


def get_capability_tests(version, target):
    full_list = get_capability(version)

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
