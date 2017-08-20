import {Volume} from './volume';
import {expect} from 'chai';
import * as fs from 'fs';
const memfs = require('./index');
import {fsSyncMethods, fsAsyncMethods} from 'fs-monkey/lib/util/lists';


describe('memfs', () => {
    it('Exports Volume constructor', () => {
        expect(typeof memfs.Volume).to.equal('function');
        expect(memfs.Volume).to.equal(Volume);
    });
    it('Exports constants', () => {
        expect(memfs.F_OK).to.equal((fs as any).F_OK);
        expect(memfs.R_OK).to.equal((fs as any).R_OK);
        expect(memfs.W_OK).to.equal((fs as any).W_OK);
        expect(memfs.X_OK).to.equal((fs as any).X_OK);
        expect(memfs.constants).to.eql(fs.constants);
    });
    it('Exports constructors', () => {
        expect(typeof memfs.Stats).to.equal('function');
        expect(typeof memfs.ReadStream).to.equal('function');
        expect(typeof memfs.WriteStream).to.equal('function');
        expect(typeof memfs.FSWatcher).to.equal('function');
        expect(typeof memfs.StatWatcher).to.equal('function');
    });
    it('Exports _toUnixTimestamp', () => {
        expect(typeof memfs._toUnixTimestamp).to.equal('function');
    });
    it('Exports all Node\'s filesystem API methods', () => {
        for(let method of fsSyncMethods) {
            expect(typeof memfs[method]).to.equal('function');
        }
        for(let method of fsAsyncMethods) {
            expect(typeof memfs[method]).to.equal('function');
        }
    });
});