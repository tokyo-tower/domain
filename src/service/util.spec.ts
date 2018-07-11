// tslint:disable:no-implicit-dependencies

/**
 * util service test
 * @ignore
 */

import * as azureStorage from 'azure-storage';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as ttts from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('utilService.uploadFile()', () => {
    it('azure-storageのcreateContainerIfNotExistsからエラーが発生すればエラーになるはず', async () => {
        const err = new Error('err');
        const fakeBlobService = { createContainerIfNotExists: sandbox.stub().yields(err) };
        sandbox.mock(azureStorage).expects('createBlobService').once().returns(fakeBlobService);

        const result = await ttts.service.util.uploadFile(<any>{})().catch((e) => e);
        assert.equal(result, err);
        sandbox.verify();
    });

    it('azure-storageのcreateBlockBlobFromTextからエラーが発生すればエラーになるはず', async () => {
        const err = new Error('err');
        const fakeBlobService = {
            createContainerIfNotExists: sandbox.stub().yields(null),
            createBlockBlobFromText: sandbox.stub().yields(err)
        };
        sandbox.mock(azureStorage).expects('createBlobService').once().returns(fakeBlobService);

        const result = await ttts.service.util.uploadFile(<any>{})().catch((e) => e);
        assert.equal(result, err);
        sandbox.verify();
    });

    it('azure-storageからエラーがなければエラーにならないはず(expiryDateがない場合)', async () => {
        const fakeBlobService = {
            createContainerIfNotExists: sandbox.stub().yields(null),
            createBlockBlobFromText: sandbox.stub().yields(null, {}),
            generateSharedAccessSignature: sandbox.stub().returns('token'),
            getUrl: sandbox.stub().returns('finalResult')
        };
        sandbox.mock(azureStorage).expects('createBlobService').once().returns(fakeBlobService);

        const result = await ttts.service.util.uploadFile(<any>{})();
        assert.equal(result, 'finalResult');
        sandbox.verify();
    });

    it('azure-storageからエラーがなければエラーにならないはず(expiryDateがある場合)', async () => {
        const fakeBlobService = {
            createContainerIfNotExists: sandbox.stub().yields(null),
            createBlockBlobFromText: sandbox.stub().yields(null, {}),
            generateSharedAccessSignature: sandbox.stub().returns('token'),
            getUrl: sandbox.stub().returns('finalResult')
        };
        sandbox.mock(azureStorage).expects('createBlobService').once().returns(fakeBlobService);

        const result = await ttts.service.util.uploadFile(<any>{expiryDate: new Date()})();
        assert.equal(result, 'finalResult');
        sandbox.verify();
    });
});
