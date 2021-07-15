import base64
import json
import requests
from cwt import COSEKey


def get_eu_public_keys_nl():
    r = requests.get('https://verifier-api.coronacheck.nl/v4/verifier/public_keys')
    r.raise_for_status()
    eu_keys = json.loads(base64.b64decode(r.json()['payload']))['eu_keys']
    public_keys = []
    for kid, dscs in eu_keys.items():
        for dsc in dscs:
            for alg in ['ES256', 'PS256']:
                try:
                    public_keys.append(COSEKey.from_pem(f'-----BEGIN PUBLIC KEY-----\n{dsc["subjectPk"]}\n-----END PUBLIC KEY-----', kid=base64.b64decode(kid), alg=alg))
                except ValueError:
                    pass
    return public_keys


def get_eu_public_keys():
    return get_eu_public_keys_nl()
