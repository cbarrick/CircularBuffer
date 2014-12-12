'use strict';

/* global describe, it */
var CircularBuffer = require('./');
var expect = require('chai').expect;

function bufferEquals(lhs, rhs, offset1, offset2, size) {
	if (offset1 === undefined && offset2 === undefined && size === undefined) {
		if (lhs.length !== rhs.length) return false;
	}
	var slice1 = (offset1 === undefined && size === undefined) ? lhs : lhs.slice(offset1 || 0, size || lhs.length);
	var slice2 = (offset2 === undefined && size === undefined) ? rhs : rhs.slice(offset2 || 0, size || rhs.length);
	for (var idx = 0; idx < slice1.length; ++idx) {
		if (slice1[idx] !== slice2[idx]) return false;
	}
	return true;
}

describe('CircularBuffer', function () {

	// Throughout these specs, the internal state of the buffer is diagramed in the margins.
	// Underscores show empty cells, periods show the read point, pipes show the write point.


	it('is circular', function () {
		var buffer = new CircularBuffer({size:6});     // -> [.|______]
		buffer.write('foo');                           // -> [.foo|___]
		expect(buffer.peek()).to.equal('foo');         //
		buffer.write('bar');                           // -> [.foobar|]
		expect(buffer.peek()).to.equal('foobar');      //
		buffer.read(3);                                // -> [___.bar|]
		expect(buffer.peek()).to.equal('bar');         //
		buffer.write('baz');                           // -> [baz|.bar]
		expect(buffer.peek()).to.equal('barbaz');      //
		expect(buffer.size).to.equal(6);               // Constant size shows circular nature
	});


	describe('constructor', function () {
		it('allows setting the initial size', function () {
			var buffer1 = new CircularBuffer();           //
			expect(buffer1.size).to.equal(512);           // The default size is 1/2 kB
			var buffer2 = new CircularBuffer({size:4});   // Set the size with the `size` option
			expect(buffer2.size).to.equal(4);             //
		});

		it('allows setting the default encoding', function () {
			var utf8 = new Buffer('test', 'utf8');
			var utf16 = new Buffer('test', 'utf16le');

			var buffer1 = new CircularBuffer();           // The default encoding is utf8
			buffer1.write('test');                        //
			var content1 = buffer1.peek('buffer');        //
			expect(bufferEquals(content1, utf8));                //

			var buffer2 = new CircularBuffer({encoding:'utf16le'});
			buffer2.write('test');                        //
			var content2 = buffer2.peek('buffer');        //
			expect(bufferEquals(content2, utf16));               //
		});
	});


	describe('#length', function () {
		it('reports the length of the content', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			expect(buffer.length).to.equal(0);            //
			buffer.write('foo');                          // -> [.foo|_]
			expect(buffer.length).to.equal(3);            //
			buffer.write('bar');                          // -> [.foobar|__]
			expect(buffer.length).to.equal(6);            //
		});
	});


	describe('#size', function () {
		it('reports the size of the backing buffer', function () {
			var buffer = new CircularBuffer({size:3});    // -> [.|___]
			expect(buffer.size).to.equal(3);              //
			buffer.write('foo');                          // -> [.foo|]
			expect(buffer.size).to.equal(3);              //
			buffer.write('bar');                          // -> [.foobar|]
			expect(buffer.size).to.equal(6);              // Size was expanded to hold 6 bytes
		});
	});


	describe('#peek([n], [encoding])', function () {
		it('returns the first `n` bytes as a string', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			var content = buffer.peek(3);                 // -> [.foo|_] (state does not change)
			expect(content).to.equal('foo');              // Returns a string
		});

		it('returns the first `n` bytes as a Buffer', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			var content1 = buffer.peek(3, 'buffer');      // -> [.foo|_]
			expect(content1).to.be.instanceof(Buffer);    // Returns a buffer
			expect(content1.toString()).to.equal('foo');  // when `encoding === "buffer"`
			var content2 = buffer.peek(3, null);          // -> [.foo|_]
			expect(content2).to.be.instanceof(Buffer);    // Returns a buffer
			expect(content2.toString()).to.equal('foo');  // when `encoding === null`
		});

		it('does not consume the bytes', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			var first = buffer.peek(3);                   // -> [.foo|_] (state does not change)
			var second = buffer.peek(3);                  // -> [.foo|_] (state does not change)
			expect(first).to.equal('foo');                // Both peeks are the same because
			expect(second).to.equal('foo');               // nothing was changed
		});

		it('is multibyte character safe', function () {
			var buffer = new CircularBuffer({size:5, encoding:'utf8'});
			buffer.write('€');                            // -> [.0xE2,0x82,0xAC,|0x__,0x__]
			buffer.write('¢');                            // -> [.0xE2,0x82,0xAC,0xC2,0xA2|]

			// Only peek bytes if `n` is big enough to read the full character.
			// The euro symbol is 3 bytes and the cent symbol is 2 bytes.
			expect(buffer.peek(1)).to.equal('');          // The euro symbol is 3 bytes long
			expect(buffer.peek(2)).to.equal('');          // So it shouldn't be returned
			expect(buffer.peek(3)).to.equal('€');         // Unless at least 3 bytes are seen
			expect(buffer.peek(4)).to.equal('€');         // Same with the cent symbol
			expect(buffer.peek(5)).to.equal('€¢');        // Which is 2 bytes long
		});
	});


	describe('#read([n], [encoding])', function () {
		it('returns the first `n` bytes as a string', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			var content = buffer.read(3);                 // -> [___.|_]
			expect(content).to.equal('foo');              // Returns a string
		});

		it('returns the first `n` bytes as a Buffer', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			var content1 = buffer.read(3, 'buffer');      // -> [.|____]
			expect(content1).to.be.instanceof(Buffer);    // Returns a buffer
			expect(content1.toString()).to.equal('foo');  // when `encoding === "buffer"`
			buffer.write('foo');                          // -> [.foo|_]
			var content2 = buffer.read(3, null);          // -> [.|____]
			expect(content2).to.be.instanceof(Buffer);    // Returns a buffer
			expect(content2.toString()).to.equal('foo');  // when `encoding === null`
		});

		it('consumes the bytes that are read', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			buffer.write('foo');                          // -> [.foo|_]
			expect(buffer.length).to.equal(3);            //
			buffer.read(3);                               // -> [___.|_]
			expect(buffer.length).to.equal(0);            // The bytes are consumed on read
		});

		it('is multibyte character safe', function () {
			var buffer = new CircularBuffer({size:5, encoding:'utf8'});
			buffer.write('€');                            // -> [.0xE2,0x82,0xAC,|0x__,0x__]
			buffer.write('¢');                            // -> [.0xE2,0x82,0xAC,0xC2,0xA2|]

			// Only consume bytes if `n` is big enough to read the full character.
			// The euro symbol is 3 bytes and the cent symbol is 2 bytes.
			expect(buffer.read(1)).to.equal('');          // -> [.0xE2,0x82,0xAC,0xC2,0xA2|]
			expect(buffer.read(2)).to.equal('');          // -> [.0xE2,0x82,0xAC,0xC2,0xA2|]
			expect(buffer.read(3)).to.equal('€');         // -> [0x__,0x__,0x__,.0xC2,0xA2|]
			expect(buffer.read(1)).to.equal('');          // -> [0x__,0x__,0x__,.0xC2,0xA2|]
			expect(buffer.read(2)).to.equal('¢');         // -> [0x__,0x__,0x__,0x__,0x__.|]
		});
	});


	describe('#copy(targetBuffer, [targetStart], [sourceStart], [sourceEnd])', function () {
		it('copies content into a regular Buffer', function () {
			var buffer = new CircularBuffer({size:11});    // -> [.|___________]
			buffer.write('hello world');                   // -> [.hello world|]
			var hello = new Buffer(5);                     //
			buffer.copy(hello, null, null, 5);             // `sourceStart` and `targetStart`
			expect(hello.toString()).to.equal('hello');    // default to 0
			var world = new Buffer(5);                     //
			buffer.copy(world, 0, 6, Infinity);            // out-of-bounds arguments are set to
			expect(world.toString()).to.equal('world');    // their defaults
		});

		it('returns the number of bytes copied', function () {
			var buffer = new CircularBuffer({size:11});    // -> [.|___________]
			buffer.write('hello world');                   // -> [.hello world|]
			var hello = new Buffer(5);                     //
			var len1 = buffer.copy(hello, null, null, 5);  //
			expect(len1).to.equal(5);                      //
			var world = new Buffer(5);                     //
			var len2 = buffer.copy(world, 0, 6, Infinity); //
			expect(len2).to.equal(5);                      //
		});
	});


	describe('#slice([start, [end]], [encoding])', function () {
		it('returns a portion of the buffer from `start` to `end` as a string', function () {
			var buffer = new CircularBuffer({size:12});    // -> [.|____________]
			buffer.write('hello world');                   // -> [.hello world|_]
			var hello = buffer.slice(null, 5);             // `start` defaults to 0
			expect(hello).to.equal('hello');               //
			var world = buffer.slice(6);                   // `end` defaults to `buffer.length`
			expect(world).to.equal('world');               //
			var helloworld = buffer.slice();               // `slice()` with no arguments
			expect(helloworld).to.equal('hello world');    // is like `peek()`
		});

		it('returns a portion of the buffer from `start` to `end` as a Buffer', function () {
			var buffer = new CircularBuffer({size:12});    // -> [.|____________]
			buffer.write('hello world');                   // -> [.hello world|_]
			var hello = buffer.slice(0, 5, 'buffer');      //
			expect(hello).to.be.instanceof(Buffer);        //
			expect(hello.toString()).to.equal('hello');    //
			var world = buffer.slice(6, null, 'buffer');   //
			expect(world).to.be.instanceof(Buffer);        //
			expect(world.toString()).to.equal('world');    //
		});

		it('is multibyte character safe', function () {
			var buffer = new CircularBuffer({size:5, encoding:'utf8'});
			buffer.write('€');                            // -> [.0xE2,0x82,0xAC,|0x__,0x__]
			buffer.write('¢');                            // -> [.0xE2,0x82,0xAC,0xC2,0xA2|]

			// If `start` or `end` is in the middle of a multibyte character,
			// round down to the start of that character.
			// The euro symbol is 3 bytes and the cent symbol is 2 bytes.
			expect(buffer.slice(0,1)).to.equal('');
			expect(buffer.slice(0,2)).to.equal('');
			expect(buffer.slice(0,3)).to.equal('€');
			expect(buffer.slice(1,3)).to.equal('€');
			expect(buffer.slice(2,3)).to.equal('€');
		});
	});


	describe('#expand()', function () {
		it('doubles the amount of memory used by the buffer', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			expect(buffer.size).to.equal(4);              //
			buffer.expand();                              // -> [.|________]
			expect(buffer.size).to.equal(8);              //
		});

		it('is called automatically when writing to a full buffer', function () {
			var buffer = new CircularBuffer({size:5});    // -> [.|_____]
			buffer.write('hello');                        // -> [.hello|]
			expect(buffer.size).to.equal(5);              //
			buffer.write(' ');                            // -> [.hello |____]
			expect(buffer.size).to.equal(10);             // size was doubled
			buffer.write('world');                        // -> [.hello world|_________]
			expect(buffer.size).to.equal(20);             // size was doubled again
			expect(buffer.peek()).to.equal('hello world');
		});
	});


	describe('#shrink()', function () {
		it('compacts the memory used to the smallest multiple of the initial size', function () {
			var buffer = new CircularBuffer({size:5});    // -> [.|_____]
			buffer.write('hello');                        // -> [.hello|]
			expect(buffer.size).to.equal(5);              //
			buffer.write(' ');                            // -> [.hello |____]
			expect(buffer.size).to.equal(10);             // doubled
			buffer.write('world');                        // -> [.hello world|________]
			expect(buffer.size).to.equal(20);             // doubled again
			buffer.shrink();                              // -> [.hello world|____]
			expect(buffer.size).to.equal(15);             // size is shrunk to a multiple of 5
			expect(buffer.peek()).to.equal('hello world');
		});
	});


	describe('#write(chunk, [encoding])', function () {
		it('accepts strings', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			expect(buffer.length).to.equal(0);            //
			expect(buffer.peek()).to.equal('');           //
			buffer.write('foo');                          // -> [.foo|_]
			expect(buffer.peek()).to.equal('foo');        //
			buffer.write('bar');                          // -> [.foobar|__]
			expect(buffer.peek()).to.equal('foobar');     //
		});

		it('accepts buffers', function () {
			var buffer = new CircularBuffer({size:4});    // -> [.|____]
			var toBeWritten;                              //
			expect(buffer.length).to.equal(0);            //
			expect(buffer.peek()).to.equal('');           //
			toBeWritten = new Buffer('foo');              //
			buffer.write(toBeWritten);                    // -> [.foo|_]
			expect(buffer.peek()).to.equal('foo');        //
			toBeWritten = new Buffer('bar');              //
			buffer.write(toBeWritten);                    // -> [.foobar|__]
			expect(buffer.peek()).to.equal('foobar');     //
		});
	});


	describe('#writeBack(chunk, [encoding])', function () {
		it('accepts strings', function () {
			var buffer = new CircularBuffer({size:6});    // -> [.|______]
			expect(buffer.length).to.equal(0);            //
			expect(buffer.peek()).to.equal('');           //
			buffer.writeBack('bar');                      // -> [|___.bar]
			expect(buffer.peek()).to.equal('bar');        //
			buffer.writeBack('foo');                      // -> [|.foobar]
			expect(buffer.peek()).to.equal('foobar');     //
		});

		it('accepts buffers', function () {
			var buffer = new CircularBuffer({size:6});    // -> [.|______]
			var toBeWritten;                              //
			expect(buffer.length).to.equal(0);            //
			expect(buffer.peek()).to.equal('');           //
			toBeWritten = new Buffer('bar');              //
			buffer.writeBack(toBeWritten);                // -> [|___.bar]
			expect(buffer.peek()).to.equal('bar');        //
			toBeWritten = new Buffer('foo');              //
			buffer.writeBack(toBeWritten);                // -> [|.foobar]
			expect(buffer.peek()).to.equal('foobar');     //
		});
	});

	describe('#getStream()', function () {
		it('returns a stream interface for the buffer', function (callback) {
			var stream1 = new CircularBuffer().getStream();
			var stream2 = new CircularBuffer().getStream();
			stream1.pipe(stream2);
			stream1.write('hello', function () {
				expect(stream2.read()).to.equal('hello');
				process.nextTick(callback);
			});
		});
	});

	it('should deal with read-then-expand', function() {
		var buffer = new CircularBuffer({ size: 2, encoding: 'buffer' });
		var buf = new Buffer([1,2,3,4]);
		buffer.write(buf.slice(0, 2));
		buffer.read(1);
		buffer.write(buf.slice(2, 4));
		expect(buf.slice(1, 4).toString('hex')).to.equal(buffer.toString('hex'));
	});
});
