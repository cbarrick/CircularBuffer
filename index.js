/* CircularBuffer - A circular buffer for Node.js
 * Copyright (c) 2014, Chris Barrick <cbarrick1@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for
 * any purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

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
///     - `encoding` *(String)*: The default encoding to use when converting to/from strings.
///         Defaults to `"utf8"`.

module.exports = function CircularBuffer(opts) {

	opts = opts || {};
	opts.encoding = opts.encoding || 'utf8';
	opts.size = opts.size || 512;

	var size = opts.size;
	var buffer = new Buffer(size);
	var head = 0;
	var tail = 0;
	var self = this;

	buffer.fill(0);


	// inBounds(n)
	// --------------------------------------------------
	// Checks that an index is a finite number, is greater than 0, and is less then the length.

	function inBounds(n) {
		return (Number.isFinite(n) && 0 <= n && n < self.length);
	}


	// realign([newSize])
	// --------------------------------------------------
	// Moves the data into a new buffer of size `newSize`, aligning the first byte of data
	// with the beginning of the new buffer. This method is used by `CircularBuffer#expand` and
	// `CircularBuffer#shrink`.

	function realign(newSize) {
		if (newSize === undefined || newSize === null) newSize = size;
		if (newSize < self.length) {
			throw new Error('Realign size too small');
		}

		var newTail = self.length;
		var newBuffer = new Buffer(newSize);
		newBuffer.fill(0);
		self.copy(newBuffer);
		size = newSize;
		buffer = newBuffer;
		head = 0;
		tail = newTail;
	}


	/// CircularBuffer#length
	/// --------------------------------------------------
	/// The number of bytes stored in the buffer.

	Object.defineProperty(this, 'length', {
		get: function length() {
			if (tail < head) return size - head + tail;
			return tail - head;
		}
	});


	/// CircularBuffer#size
	/// --------------------------------------------------
	/// The number of bytes allocated for the buffer. Note that this is ***not*** the size of
	/// the data stored in the buffer; that is `CircularBuffer#length`.

	Object.defineProperty(this, 'size', {
		get: function length() {
			return size;
		}
	});


	/// CircularBuffer#peek([n], [encoding])
	/// --------------------------------------------------
	/// Retrieve the first `n` bytes as a string or buffer.
	///
	/// ### Arguments
	/// - `n` *(Number)*: The maximum number of bytes to retreive. Defaults to `Infinity`.
	/// - `encoding` *(String)*: The encoding to use when decoding the bytes into a string.
	///     If you pass the string `"buffer"`, then the data is not decoded and a buffer is
	///     returned instead.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns a string representation of the first `n` bytes
	/// or a buffer if `encoding` is `"buffer"`.

	this.peek = function peek(n, encoding) {
		if (typeof arguments[0] === 'string') {
			n = undefined;
			encoding = arguments[0];
		}
		if (encoding === undefined || encoding === null) encoding = opts.encoding;
		if (n === undefined || n === null) n = Infinity;
		if (n > this.length) n = this.length;

		var data;
		var end = (head + n) % size;
		if (end < head) {
			data = Buffer.concat([buffer.slice(head, size), buffer.slice(0, end)], n);
		} else {
			// The buffer returned by `buffer.slice` shares memory with the original.
			// We concat with an empty buffer to create a new buffer elsewhere in memory.
			data = Buffer.concat([buffer.slice(head, end), new Buffer(0)], n);
		}
		if (encoding === 'buffer') return data;
		return data.toString(encoding);
	};


	/// CircularBuffer#read([n], [encoding])
	/// --------------------------------------------------
	/// Consumes the first `n` bytes of the buffer.
	///
	/// ### Arguments
	/// - `n` *(Number)*: The maximum number of bytes to retrieve. Defaults to `Infinity`.
	/// - `encoding` *(String)*: The encoding to use when decoding the bytes into a string.
	///     If you pass the string `"buffer"`, then the data is not decoded and a buffer is
	///     returned instead.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns a string representation of the first `n` bytes
	/// or a buffer if `encoding` is `"buffer"`.

	this.read = function read(n, encoding) {
		var data = this.peek(n, encoding);
		head += data.length;
		head %= size;
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

		var start = (head + sourceStart) % size;
		var end = (head + sourceEnd) % size;
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
	/// - `encoding` *(String)*: The encoding to use when decoding the bytes into a string.
	///     If you pass the string `"buffer"`, then the data is not decoded and a buffer is
	///     returned instead.
	///
	/// ### Returns
	/// *(String | Buffer)* Returns a string representation of the slice or a buffer if `encoding`
	/// is `"buffer"`.

	this.slice = function slice(start, end, encoding) {
		if (typeof arguments[0] === 'string') {
			encoding = arguments[0];
			start = undefined;
			end = undefined;
		} else if (typeof arguments[1] === 'string') {
			encoding = arguments[1];
			end = undefined;
		}
		start = inBounds(start) ? start : 0;
		end = inBounds(end) ? end : this.length;
		encoding = encoding || opts.encoding;

		var newSize = end - start;
		var newBuffer = new Buffer(newSize);
		this.copy(newBuffer, 0, start, end);
		if (encoding === 'buffer') return newBuffer;
		return newBuffer.toString(encoding);
	};


	/// CircularBuffer#expand()
	/// --------------------------------------------------
	/// Doubles the storage capacity of the buffer. This method is automatically called when the
	/// buffer is full. There are very few cases when you should call this manually.

	this.expand = function expand() {
		realign(size * 2);
	};


	/// CircularBuffer#shrink()
	/// --------------------------------------------------
	/// Shrinks the storage capacity to the length of the data, rounded up to the nearest
	/// multiple of the initial capacity. There are very few cases when it is useful call this
	/// method.

	this.shrink = function shrink() {
		var newSize = opts.size;
		while (newSize < this.length) newSize += opts.size;
		realign(newSize);
	};


	/// CircularBuffer#write(chunk, [encoding])
	/// --------------------------------------------------
	/// Writes to the end of the buffer.
	///
	/// ### Arguments
	/// - `chunk` *(String | Buffer)*: The data to be written.
	/// - `encoding` *(String)*: If `chunk` is a string, how it should be encoded on the buffer.

	this.write = function write(chunk, encoding) {
		encoding = encoding || opts.encoding;
		if (typeof chunk === 'string') chunk = new Buffer(chunk, encoding);

		if (this.length + chunk.length >= size) {
			this.expand();
			return this.write(chunk, encoding);
		}

		var i = 0;
		while (i < chunk.length) {
			buffer[tail] = chunk[i];
			i += 1;
			tail += 1;
			tail %= size;
		}
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
