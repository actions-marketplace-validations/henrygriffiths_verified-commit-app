import * as core from "@actions/core";
import * as github from "@actions/github";
import { JSEncrypt } from 'jsencrypt';
import https from 'node:https';
import fs from 'fs';

try {
    const appID = core.getInput('app-id');
    const appKey = core.getInput('app-key');

    var repository = core.getInput('repository');
    if (repository.length == 0) {
        repository = `${github.context.repo.owner}/${github.context.repo.repo}`;
    }

    var baseRef = core.getInput('baseref');
    if (baseRef.length == 0) {
        baseRef = github.context.ref;
    }
    baseRef = parseref(baseRef);

    var ref = core.getInput('ref');
    if (ref.length == 0) {
        ref = baseRef;
    } else {
        ref = parseref(ref);
    }


    const files = core.getInput('files');
    const commitmsg = core.getInput('commitmsg');

    const now = parseInt(new Date().getTime() / 1000);
    const iat = now - 60;
    const exp = now + 600;
    const header = b64enc('{"typ":"JWT","alg":"RS256"}');
    const payload = b64enc(`{"iat":${iat},"exp":${exp},"iss":${appID}}`);
    const signature = b64enc(signDataWithRSA(`${header}.${payload}`, appKey));
    const jwt = `${header}.${payload}.${signature}`;

    var req;
    var options = {
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'User-Agent': github.context.repo.owner,
            'Accept': 'application/vnd.github+json',
        },
        json: true,
    };
    req = await httpsreq(`https://api.github.com/repos/${repository}/installation`, 'GET', options);
    const app_install_id = req.res.id;

    req = await httpsreq(`https://api.github.com/app/installations/${app_install_id}/access_tokens`, 'POST', options);
    const app_token = req.res.token;
    options.headers.Authorization = `Bearer ${app_token}`;

    req = await httpsreq(`https://api.github.com/repos/${repository}/git/ref/${ref.replace('refs/', '')}`, 'GET', options);
    var ref_exists;
    if ( typeof req.res.ref !== 'undefined' && req.res.ref) {
        ref_exists = true;
    } else {
        ref_exists = false;
    }

    req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/${baseRef}`, 'GET', options);
    const base_sha = req.res.object.sha;

    var tree = {'base_tree': base_sha, tree: []};
    const files_split = files.split('\n');
    for ( let i = 0; i < files_split.length; i++ ) {
        const filename = files_split[i];

        const file_data = {'content': fs.readFileSync(filename).toString('base64'), 'encoding': 'base64'};
        
        req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/blobs`, 'POST', options, JSON.stringify(file_data));
        tree.tree.push({'path': filename, 'sha': req.res.sha, 'mode': '100644', 'type': 'blob'});
    }

    req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/trees`, 'POST', options, JSON.stringify(tree));
    const commit_data = {'message': commitmsg, 'tree': req.res.sha, 'parents': [base_sha]};
    
    req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/commits`, 'POST', options, JSON.stringify(commit_data));
    const commit_sha = req.res.sha;

    

    if (ref_exists == true) {
        const ref_data = {'sha': commit_sha, 'force': true};
        req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/${ref}`, 'PATCH', options, JSON.stringify(ref_data));
    } else {
        const ref_data = {'ref': ref, 'sha': commit_sha};
        req = await retryhttpsreq(`https://api.github.com/repos/${repository}/git/refs`, 'POST', options, JSON.stringify(ref_data));
    }

    core.info(`Pushed ${commit_sha} to ${ref}`);
} catch (error) {
  core.setFailed(error.message);
}


function parseref(ref) {
    if (!(ref.toLowerCase().startsWith('refs/tags/') || ref.toLowerCase().startsWith('refs/heads/') || ref.toLowerCase().startsWith('refs/remotes/'))) {
        if (ref.toLowerCase().startsWith('refs/')) {
            ref = ref.replace('refs/', '');
        }
        ref = `refs/heads/${ref}`;
    }
    return ref;
}

function b64enc(str) {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/\n/g, '');
}

function signDataWithRSA(data, privateKey) {
    const encrypt = new JSEncrypt();
    encrypt.setPrivateKey(privateKey);
    return atob(encrypt.signSha256(data));
}

function retryhttpsreq(url, method, options, data) {
    return new Promise((async (resolve, reject) => {
        for (let i = 1; i <= 20; i++) {
            try {
                req = await httpsreq(url, method, options, data);
                if (req.code >= 200 && req.code < 300) {
                    resolve(req);
                    return;
                } else {
                    throw req.code;
                }
            } catch (error) {
                if (i < 3) {
                    await new Promise(r => setTimeout(r, 10000));
                } else {
                    throw error;
                }
            };
        };
    }));
}

function httpsreq(url, method, options, data) {
    options.method = method;
    return new Promise(((resolve, reject) => {
        const request = https.request(url, options, (res) => {
            res.setEncoding('utf8');
            let returnData = '';
            res.on('data', (chunk) => {
                returnData += chunk;
            });
            res.on('end', () => {
                var status_code = parseInt(res.statusCode);
                resolve({'code': status_code, 'res': JSON.parse(returnData)});
            });
            res.on('error', (error) => {
                throw error;
            });
            });
        if ((method == 'POST' || method == 'PATCH') && data) {
            request.write(data);
        }
        request.end();
    }));
}
