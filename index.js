// CircularBuffer - A circular buffer for Node.js
// Copyright (c) 2014, Chris Barrick <cbarrick1@gmail.com>
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//

/// CircularBuffer
/// ==================================================
/// A circular buffer for Node.js with a stream-like read/write interface. For a full stream
/// interface built on CircularBuffer, see [BufferedStream][].
/// [BufferedStream]: #TODO


'use strict';


/// new CircularBuffer([options])
/// --------------------------------------------------
/// Constructs a circular buffer.
///
/// ### Arguments
/// - `options` *(Object)*:
///     - `size` *(Number)*: The initial size of the buffer in bytes. Defaults to 1024.
///     - `encoding` *(String | null)*: The default encoding to use to when converting to/from
///         strings. If you pass `null` or `"buffer"`, then methods which access data will return
///         buffers of octets. Defaults to `"utf8"`.

module.exports = function CircularBuffer(opts) {

	opts = opts || {};
	opts.encoding = opts.encoding || 'utf8';
	opts.size = opts.size || 512;

	if (opts.encoding === 'buffer') opts.encoding = null;

	validateEncoding(opts.encoding);

	var buffer;

	var head = 0;
	var tail = 0;
	var self = this;

	setBuffer(opts.size);


	// inBounds(n)
	// --------------------------------------------------
	// Checks that an index is a finite number, is greater than 0, and is less then the length.

	function inBounds(n) {
		return (Number.isFinite(n) && 0 <= n && n < self.length);
	}


	// setBuffer(newSize)
	// --------------------------------------------------
	//

	function setBuffer(newSize) {
		// Add 1 byte of padding to the buffer to make the overall implementation easier
		var newBuffer = new Buffer(newSize + 1);
		newBuffer.fill(0);
		if (buffer instanceof Buffer) self.copy(newBuffer);
		buffer = newBuffer;
		head = 0;
		tail = self.length || 0;
	}


	// validateEncoding(encoding)
	// --------------------------------------------------
	// Returns `true` if `encoding` is a known encoding or `null`. Otherwise throws a TypeError,
	// like when the Buffer class sees an unknown encoding.

	function validateEncoding(encoding) {
		if (encoding === null || encoding === 'buffer' || Buffer.isEncoding(encoding)) {
			return true;
		}
		throw new TypeError('Unknown encoding: ' + encoding);
	}


	/// CircularBuffer#length
	/// --------------------------------------------------
	/// The number of bytes stored in the buffer.

	Object.defineProperty(this, 'length', {
		get: function length() {
			if (tail < head) return buffer.length - head + tail;
			return tail - head;
		}
	});


	/// CircularBuffer#size
	/// --------------------------------------------------
	/// The number of bytes allocated for the buffer. Note that this is ***not*** the size of
	/// the data stored in the buffer; that is `CircularBuffer#length`.

	Object.defineProperty(this, 'size', {
		get: function length() {
			// Do not include the 1 byte of padding
			return buffer.length - 1;
		}
	});


	/// CircularBuffer#peek([n], [encoding])
	/// --------------------------------------------------
	/// Retrieve the first `n` bytes as a string or buffer.
	///
	/// ### Arguments
	/// - `n` *(Number)*: The maximum number of bytes to retreive. Defaults to `Infinity`.
	/// - `encoding` *(String | null)*: The encoding to use to decode the bytes into a string.
	///     If you pass `null` or `"buffer"`, the data will not be decoded and a buffer will be
	///     returned instead. The default is set by the constructor.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns the first `n` bytes as a string or a buffer if the encoding
	/// is null.

	this.peek = function peek(n, encoding) {
		if (typeof arguments[0] === 'string') {
			n = undefined;
			encoding = arguments[0];
		}
		if (encoding === undefined) encoding = opts.encoding;
		if (encoding === 'buffer') encoding = null;
		if (n === undefined || n === null) n = Infinity;
		if (n > this.length) n = this.length;

		validateEncoding(encoding);

		var data;
		var end = (head + n) % buffer.length;
		if (end < head) {
			data = Buffer.concat([buffer.slice(head, buffer.length), buffer.slice(0, end)], n);
		} else {
			// The buffer returned by `buffer.slice` shares memory with the original.
			// We concat with an empty buffer to create a new buffer elsewhere in memory.
			data = Buffer.concat([buffer.slice(head, end), new Buffer(0)], n);
		}
		if (encoding === null) return data;
		return data.toString(encoding);
	};


	/// CircularBuffer#read([n], [encoding])
	/// --------------------------------------------------
	/// Consumes the first `n` bytes of the buffer.
	///
	/// ### Arguments
	/// - `n` *(Number)*: The maximum number of bytes to retrieve. Defaults to `Infinity`.
	/// - `encoding` *(String | null)*: The encoding to use to decode the bytes into a string.
	///     If you pass `null`, the data will not be decoded and a buffer will be returned instead.
	///     The default is set by the constructor.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns the first `n` bytes as a string or a buffer if the encoding
	/// is null.

	this.read = function read(n, encoding) {
		var data = this.peek(n, encoding);
		head += data.length;
		head %= buffer.length;
		return data;
	};


	/// CircularBuffer#copy(targetBuffer, [targetStart], [sourceStart], [sourceEnd])
	/// --------------------------------------------------
	/// Copies data into a *regular* buffer. All arguments passed that are invalid or out of
	/// bounds are set to their defaults.
	///
	/// ### Arguments
	/// - `targetBuffer` *(Buffer)*: Buffer into which data will be copied.
	/// - `targetStart` *(Number)*: The index into the target which will hold the first byte.
	///     Defaults to `0`.
	/// - `sourceStart` *(Number)*: The starting index to copy (inclusize). Defaults to `0`.
	/// - `sourceEnd` *(Number)*: The end index to copy (exclusice). Defaults to `buffer.length`.
	///
	/// ### Returns
	/// *(Number)* Returns the number of bytes copied.

	this.copy = function copy(targetBuffer, targetStart, sourceStart, sourceEnd) {
		targetStart = inBounds(targetStart) ? targetStart : 0;
		sourceStart = inBounds(sourceStart) ? sourceStart : 0;
		sourceEnd = inBounds(sourceEnd) ? sourceEnd : this.length;

		if (sourceStart === sourceEnd) return 0;

		var start = (head + sourceStart) % buffer.length;
		var end = (head + sourceEnd) % buffer.length;
		if (tail < head) {
			var available = head - tail;
			buffer.copy(targetBuffer, targetStart, start, start + available);
			buffer.copy(targetBuffer, targetStart + available, 0, end);
		} else {
			buffer.copy(targetBuffer, targetStart, start, end);
		}

		return sourceEnd - sourceStart;
	};


	/// CircularBuffer#slice([start, [end]], [encoding])
	/// --------------------------------------------------
	/// Returns a portion of the buffer from `start` to `end`. All arguments passed that are
	/// invalid or out of bounds are set to their defaults.
	///
	/// ### Arguments
	/// - `start` *(Number)*: The starting index of the slice (inclusive). Defaults to `0`.
	/// - `end` *(Number)*: The end index of the slice (exclusive). Defaults to `buffer.length`.
	/// - `encoding` *(String | null)*: The encoding to use to decode the bytes into a string.
	///     If you pass `null`, the data will not be decoded and a buffer will be returned instead.
	///     The default is set by the constructor.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns the slice as a string or a buffer if the encoding is null.

	this.slice = function slice(start, end, encoding) {
		if (typeof arguments[0] === 'string') {
			encoding = arguments[0];
			start = undefined;
			end = undefined;
		} else if (typeof arguments[1] === 'string') {
			encoding = arguments[1];
			end = undefined;
		}
		if (!inBounds(start)) start = 0;
		if (!inBounds(end)) end = this.length;
		if (encoding === undefined) encoding = opts.encoding;
		if (encoding === 'buffer') encoding = null;

		validateEncoding(encoding);

		var newSize = end - start;
		var tmp = this.read(start, encoding);
		var data = this.peek(newSize, encoding);
		this.writeBack(tmp);
		return data;
	};


	/// CircularBuffer#expand()
	/// --------------------------------------------------
	/// Doubles the storage capacity of the buffer. This method is automatically called when the
	/// buffer is full. There are very few cases when you should call this manually.

	this.expand = function expand() {
		setBuffer(this.size * 2);
	};


	/// CircularBuffer#shrink()
	/// --------------------------------------------------
	/// Shrinks the storage capacity to the length of the data, rounded up to the nearest
	/// multiple of the initial capacity. There are very few cases when it is useful call this
	/// method.

	this.shrink = function shrink() {
		var newSize = opts.size;
		while (newSize < this.length) newSize += opts.size;
		setBuffer(newSize);
	};


	/// CircularBuffer#write(chunk, [encoding])
	/// --------------------------------------------------
	/// Writes to the end of the buffer.
	///
	/// ### Arguments
	/// - `chunk` *(String | Buffer)*: The data to be written.
	/// - `encoding` *(String)*: If `chunk` is a string, how it should be encoded on the buffer.
	///     If `chunk` is a buffer, this is ignored. If the encoding is `null`, utf8 is used.
	///     The default is set by the constructor.

	this.write = function write(chunk, encoding) {
		encoding = encoding || opts.encoding || 'utf8';

		if (typeof chunk === 'string') {
			// Cast `chunk` to a Buffer. The encoding is validated by the `Buffer` constructor.
			chunk = new Buffer(chunk, encoding);
		}

		if (this.length + chunk.length >= buffer.length) {
			this.expand();
			return this.write(chunk, encoding);
		}

		// Write to the buffer using `memcpy`
		var tmp = buffer.length - tail;
		chunk.copy(buffer, tail, 0, tmp);
		if (chunk.length > tmp) chunk.copy(buffer, 0, tmp, Infinity);
		tail += chunk.length;
		tail %= buffer.length;
	};


	/// CircularBuffer#writeBack(chunk, [encoding])
	/// --------------------------------------------------
	/// Writes to the beginning of the buffer.
	///
	/// ### Arguments
	/// - `chunk` *(String | Buffer)*: The data to be written.
	/// - `encoding` *(String)*: If `chunk` is a string, how it should be encoded on the buffer.
	///     If `chunk` is a buffer, this is ignored. If the encoding is `null`, utf8 is used.
	///     The default is set by the constructor.

	this.writeBack = function writeBack(chunk, encoding) {
		encoding = encoding || opts.encoding || 'utf8';

		if (typeof chunk === 'string') {
			// Cast `chunk` to a Buffer. The encoding is validated by the `Buffer` constructor.
			chunk = new Buffer(chunk, encoding);
		}

		if (this.length + chunk.length >= buffer.length) {
			this.expand();
			return this.writeBack(chunk, encoding);
		}

		// Write to the buffer using `memcpy`
		head -= chunk.length;
		head += buffer.length; // So that we can do a true mod
		head %= buffer.length;
		var tmp = buffer.length - head;
		chunk.copy(buffer, head, 0, tmp);
		if (chunk.length > tmp) chunk.copy(buffer, 0, tmp, Infinity);
	};


	/// CircularBuffer#toString([encoding])
	/// --------------------------------------------------
	/// Returns the contents of the buffer as a string.
	///
	/// ### Arguments
	/// - `encoding` *(String)*: How to decode the data.
	///
	/// ### Returns
	/// *(String)*: Always returns a string, unlike `CircularBuffer#peek`.

	this.toString = function toString(encoding) {
		// The extra `toString` ensures that a string is returned even if `encoding === 'buffer'`.
		return this.peek(Infinity, encoding).toString();
	};

};
