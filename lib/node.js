"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var process_1 = require("./process");
var constants_1 = require("./constants");
var events_1 = require("events");
var S_IFMT = constants_1.constants.S_IFMT, S_IFDIR = constants_1.constants.S_IFDIR, S_IFREG = constants_1.constants.S_IFREG, S_IFBLK = constants_1.constants.S_IFBLK, S_IFCHR = constants_1.constants.S_IFCHR, S_IFLNK = constants_1.constants.S_IFLNK, S_IFIFO = constants_1.constants.S_IFIFO, S_IFSOCK = constants_1.constants.S_IFSOCK, O_APPEND = constants_1.constants.O_APPEND;
exports.SEP = '/';
/**
 * Node in a file system (like i-node, v-node).
 */
var Node = (function (_super) {
    __extends(Node, _super);
    function Node(ino, perm) {
        if (perm === void 0) { perm = 438; }
        var _this = _super.call(this) || this;
        // User ID and group ID.
        _this.uid = process_1.default.getuid();
        _this.gid = process_1.default.getgid();
        _this.atime = new Date;
        _this.mtime = new Date;
        _this.ctime = new Date;
        // data: string = '';
        _this.buf = null;
        _this.perm = 438; // Permissions `chmod`, `fchmod`
        _this.mode = S_IFREG; // S_IFDIR, S_IFREG, etc.. (file by default?)
        // Number of hard links pointing at this Node.
        _this.nlink = 1;
        // Steps to another node, if this node is a symlink.
        _this.symlink = null;
        _this.perm = perm;
        _this.ino = ino;
        return _this;
    }
    Node.prototype.getString = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return this.getBuffer().toString(encoding);
    };
    Node.prototype.setString = function (str) {
        // this.setBuffer(Buffer.from(str, 'utf8'));
        this.buf = Buffer.from(str, 'utf8');
        this.touch();
    };
    Node.prototype.getBuffer = function () {
        if (!this.buf)
            this.setBuffer(Buffer.allocUnsafe(0));
        return Buffer.from(this.buf); // Return a copy.
    };
    Node.prototype.setBuffer = function (buf) {
        this.buf = Buffer.from(buf); // Creates a copy of data.
        this.touch();
    };
    Node.prototype.getSize = function () {
        return this.buf ? this.buf.length : 0;
    };
    Node.prototype.setModeProperty = function (property) {
        this.mode = (this.mode & ~S_IFMT) | property;
    };
    Node.prototype.setIsFile = function () {
        this.setModeProperty(S_IFREG);
    };
    Node.prototype.setIsDirectory = function () {
        this.setModeProperty(S_IFDIR);
    };
    Node.prototype.setIsSymlink = function () {
        this.setModeProperty(S_IFLNK);
    };
    Node.prototype.isFile = function () {
        return (this.mode & S_IFMT) === S_IFREG;
    };
    Node.prototype.isDirectory = function () {
        return (this.mode & S_IFMT) === S_IFDIR;
    };
    Node.prototype.isSymlink = function () {
        // return !!this.symlink;
        return (this.mode & S_IFMT) === S_IFLNK;
    };
    Node.prototype.makeSymlink = function (steps) {
        this.symlink = steps;
        this.setIsSymlink();
    };
    Node.prototype.write = function (buf, off, len, pos) {
        if (off === void 0) { off = 0; }
        if (len === void 0) { len = buf.length; }
        if (pos === void 0) { pos = 0; }
        if (!this.buf)
            this.buf = Buffer.allocUnsafe(0);
        if (pos + len > this.buf.length) {
            var newBuf = Buffer.allocUnsafe(pos + len);
            this.buf.copy(newBuf, 0, 0, this.buf.length);
            this.buf = newBuf;
        }
        buf.copy(this.buf, pos, off, off + len);
        this.touch();
        return len;
    };
    // Returns the number of bytes read.
    Node.prototype.read = function (buf, off, len, pos) {
        if (off === void 0) { off = 0; }
        if (len === void 0) { len = buf.byteLength; }
        if (pos === void 0) { pos = 0; }
        if (!this.buf)
            this.buf = Buffer.allocUnsafe(0);
        var actualLen = len;
        if (actualLen > buf.byteLength) {
            actualLen = buf.byteLength;
        }
        if (actualLen + pos > this.buf.length) {
            actualLen = this.buf.length - pos;
        }
        this.buf.copy(buf, off, pos, pos + actualLen);
        return actualLen;
    };
    Node.prototype.truncate = function (len) {
        if (len === void 0) { len = 0; }
        if (!len)
            this.buf = Buffer.allocUnsafe(0);
        else {
            if (!this.buf)
                this.buf = Buffer.allocUnsafe(0);
            if (len <= this.buf.length) {
                this.buf = this.buf.slice(0, len);
            }
            else {
                var buf = Buffer.allocUnsafe(0);
                this.buf.copy(buf);
                buf.fill(0, len);
            }
        }
        this.touch();
    };
    Node.prototype.chmod = function (perm) {
        this.perm = perm;
        this.touch();
    };
    Node.prototype.chown = function (uid, gid) {
        this.uid = uid;
        this.gid = gid;
        this.touch();
    };
    Node.prototype.touch = function () {
        this.mtime = new Date;
        this.emit('change', this);
    };
    Node.prototype.canRead = function (uid, gid) {
        if (uid === void 0) { uid = process_1.default.getuid(); }
        if (gid === void 0) { gid = process_1.default.getgid(); }
        if (this.perm & 4 /* IROTH */) {
            return true;
        }
        if (gid === this.gid) {
            if (this.perm & 32 /* IRGRP */) {
                return true;
            }
        }
        if (uid === this.uid) {
            if (this.perm & 256 /* IRUSR */) {
                return true;
            }
        }
        return false;
    };
    Node.prototype.canWrite = function (uid, gid) {
        if (uid === void 0) { uid = process_1.default.getuid(); }
        if (gid === void 0) { gid = process_1.default.getgid(); }
        if (this.perm & 2 /* IWOTH */) {
            return true;
        }
        if (gid === this.gid) {
            if (this.perm & 16 /* IWGRP */) {
                return true;
            }
        }
        if (uid === this.uid) {
            if (this.perm & 128 /* IWUSR */) {
                return true;
            }
        }
        return false;
    };
    Node.prototype.del = function () {
        this.emit('delete', this);
    };
    Node.prototype.toJSON = function () {
        return {
            ino: this.ino,
            uid: this.uid,
            gid: this.gid,
            atime: this.atime.getTime(),
            mtime: this.mtime.getTime(),
            ctime: this.ctime.getTime(),
            perm: this.perm,
            mode: this.mode,
            nlink: this.nlink,
            symlink: this.symlink,
            data: this.getString(),
        };
    };
    return Node;
}(events_1.EventEmitter));
exports.Node = Node;
/**
 * Represents a hard link that points to an i-node `node`.
 */
var Link = (function (_super) {
    __extends(Link, _super);
    function Link(vol, parent, name) {
        var _this = _super.call(this) || this;
        _this.parent = null;
        _this.children = {};
        // Path to this node as Array: ['usr', 'bin', 'node'].
        _this.steps = [];
        // "i-node" of this hard link.
        _this.node = null;
        // "i-node" number of the node.
        _this.ino = 0;
        // Number of children.
        _this.length = 0;
        _this.vol = vol;
        _this.parent = parent;
        _this.steps = parent ? parent.steps.concat([name]) : [name];
        return _this;
    }
    Link.prototype.setNode = function (node) {
        this.node = node;
        this.ino = node.ino;
    };
    Link.prototype.getNode = function () {
        return this.node;
    };
    Link.prototype.createChild = function (name, node) {
        if (node === void 0) { node = this.vol.createNode(); }
        var link = new Link(this.vol, this, name);
        link.setNode(node);
        if (node.isDirectory()) {
            // link.setChild('.', link);
            // link.getNode().nlink++;
            // link.setChild('..', this);
            // this.getNode().nlink++;
        }
        this.setChild(name, link);
        return link;
    };
    Link.prototype.setChild = function (name, link) {
        if (link === void 0) { link = new Link(this.vol, this, name); }
        this.children[name] = link;
        link.parent = this;
        this.length++;
        this.emit('child:add', link, this);
        return link;
    };
    Link.prototype.deleteChild = function (link) {
        delete this.children[link.getName()];
        this.length--;
        this.emit('child:delete', link, this);
    };
    Link.prototype.getChild = function (name) {
        return this.children[name];
    };
    Link.prototype.getPath = function () {
        return this.steps.join(exports.SEP);
    };
    Link.prototype.getName = function () {
        return this.steps[this.steps.length - 1];
    };
    // del() {
    //     const parent = this.parent;
    //     if(parent) {
    //         parent.deleteChild(link);
    //     }
    //     this.parent = null;
    //     this.vol = null;
    // }
    /**
     * Walk the tree path and return the `Link` at that location, if any.
     * @param steps {string[]} Desired location.
     * @param stop {number} Max steps to go into.
     * @param i {number} Current step in the `steps` array.
     * @returns {any}
     */
    Link.prototype.walk = function (steps, stop, i) {
        if (stop === void 0) { stop = steps.length; }
        if (i === void 0) { i = 0; }
        if (i >= steps.length)
            return this;
        if (i >= stop)
            return this;
        var step = steps[i];
        var link = this.getChild(step);
        if (!link)
            return null;
        return link.walk(steps, stop, i + 1);
    };
    Link.prototype.toJSON = function () {
        for (var ch in this.children) {
            console.log('ch', ch);
        }
        return {
            steps: this.steps,
            ino: this.ino,
            children: Object.keys(this.children),
        };
    };
    return Link;
}(events_1.EventEmitter));
exports.Link = Link;
/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 */
var File = (function () {
    /**
     * Open a Link-Node pair. `node` is provided separately as that might be a different node
     * rather the one `link` points to, because it might be a symlink.
     * @param link
     * @param node
     * @param flags
     * @param fd
     */
    function File(link, node, flags, fd) {
        /**
         * Hard link that this file opened.
         * @type {any}
         */
        this.link = null;
        /**
         * Reference to a `Node`.
         * @type {Node}
         */
        this.node = null;
        /**
         * A cursor/offset position in a file, where data will be written on write.
         * User can "seek" this position.
         */
        this.position = 0;
        this.link = link;
        this.node = node;
        this.flags = flags;
        this.fd = fd;
    }
    File.prototype.getString = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return this.node.getString();
    };
    File.prototype.setString = function (str) {
        this.node.setString(str);
    };
    File.prototype.getBuffer = function () {
        return this.node.getBuffer();
    };
    File.prototype.setBuffer = function (buf) {
        this.node.setBuffer(buf);
    };
    File.prototype.getSize = function () {
        return this.node.getSize();
    };
    File.prototype.truncate = function (len) {
        this.node.truncate(len);
    };
    File.prototype.seekTo = function (position) {
        this.position = position;
    };
    File.prototype.stats = function () {
        return Stats.build(this.node);
    };
    File.prototype.write = function (buf, offset, length, position) {
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = buf.length; }
        if (typeof position !== 'number')
            position = this.position;
        if (this.flags & O_APPEND)
            position = this.getSize();
        var bytes = this.node.write(buf, offset, length, position);
        this.position = position + bytes;
        return bytes;
    };
    File.prototype.read = function (buf, offset, length, position) {
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = buf.byteLength; }
        if (typeof position !== 'number')
            position = this.position;
        var bytes = this.node.read(buf, offset, length, position);
        this.position = position + bytes;
        return bytes;
    };
    File.prototype.chmod = function (perm) {
        this.node.chmod(perm);
    };
    File.prototype.chown = function (uid, gid) {
        this.node.chown(uid, gid);
    };
    return File;
}());
exports.File = File;
/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
var Stats = (function () {
    function Stats() {
        // User ID and group ID.
        this.uid = 0;
        this.gid = 0;
        this.rdev = 0;
        this.blksize = 4096;
        this.ino = 0;
        this.size = 0;
        this.blocks = 1;
        this.atime = null;
        this.mtime = null;
        this.ctime = null;
        this.birthtime = null;
        this.atimeMs = 0.0;
        this.mtimeMs = 0.0;
        this.ctimeMs = 0.0;
        this.birthtimeMs = 0.0;
        this.dev = 0;
        this.mode = 0;
        this.nlink = 0;
    }
    Stats.build = function (node) {
        var stats = new Stats;
        var uid = node.uid, gid = node.gid, atime = node.atime, mtime = node.mtime, ctime = node.ctime, mode = node.mode, ino = node.ino;
        stats.uid = uid;
        stats.gid = gid;
        stats.atime = atime;
        stats.mtime = mtime;
        stats.ctime = ctime;
        stats.birthtime = ctime;
        stats.atimeMs = atime.getTime();
        stats.mtimeMs = mtime.getTime();
        var ctimeMs = ctime.getTime();
        stats.ctimeMs = ctimeMs;
        stats.birthtimeMs = ctimeMs;
        stats.size = node.getSize();
        stats.mode = node.mode;
        stats.ino = node.ino;
        stats.nlink = node.nlink;
        return stats;
    };
    Stats.prototype._checkModeProperty = function (property) {
        return (this.mode & S_IFMT) === property;
    };
    Stats.prototype.isDirectory = function () {
        return this._checkModeProperty(S_IFDIR);
    };
    Stats.prototype.isFile = function () {
        return this._checkModeProperty(S_IFREG);
    };
    Stats.prototype.isBlockDevice = function () {
        return this._checkModeProperty(S_IFBLK);
    };
    Stats.prototype.isCharacterDevice = function () {
        return this._checkModeProperty(S_IFCHR);
    };
    Stats.prototype.isSymbolicLink = function () {
        return this._checkModeProperty(S_IFLNK);
    };
    Stats.prototype.isFIFO = function () {
        return this._checkModeProperty(S_IFIFO);
    };
    Stats.prototype.isSocket = function () {
        return this._checkModeProperty(S_IFSOCK);
    };
    return Stats;
}());
exports.Stats = Stats;