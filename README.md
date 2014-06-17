CircularBuffer
==================================================
A circular buffer for Node.js with a stream-like read/write interface. For a full stream
interface built on CircularBuffer, see [BufferedStream][].
[BufferedStream]: #TODO


API
--------------------------------------------------

### new CircularBuffer([options])

Constructs a circular buffer.

#### Arguments
- `options` *(Object)*:
	- `size` *(Number)*: The initial size of the buffer in bytes. Defaults to 1024.
	- `encoding` *(String)*: The default encoding to use when converting to/from strings. Defaults to `"utf8"`.

-----

### CircularBuffer#length

The number of bytes stored in the buffer.

-----

### CircularBuffer#size

The number of bytes allocated for the buffer. Note that this is ***not*** the size of the data stored in the buffer; that is `CircularBuffer#length`.

-----

### CircularBuffer#peek([n], [encoding])

Retrieve the first `n` bytes as a string or buffer.

#### Arguments
- `n` *(Number)*: The maximum number of bytes to retreive. Defaults to `Infinity`.
- `encoding` *(String)*: The encoding to use when decoding the bytes into a string. If you pass the string `"buffer"`, then the data is not decoded and a buffer is returned instead.

#### Returns
*(String | Buffer)* Returns a string representation of the first `n` bytes, or a buffer if `encoding` is `"buffer"`.


-----

### CircularBuffer#read([n], [encoding])

Consumes the first `n` bytes of the buffer.

#### Arguments
- `n` *(Number)*: The maximum number of bytes to retrieve. Defaults to `Infinity`.
- `encoding` *(String)*: The encoding to use when decoding the bytes into a string. If you pass the string `"buffer"`, then the data is not decoded and a buffer is returned instead.

#### Returns
*(String | Buffer)* Returns a string representation of the first `n` bytes, or a buffer if `encoding` is `"buffer"`.

-----

### CircularBuffer#copy(targetBuffer, [targetStart], [sourceStart], [sourceEnd])

Copies data into a *regular* buffer. All arguments passed that are invalid or out of bounds are set to their defaults.

#### Arguments
- `targetBuffer` *(Buffer)*: Buffer into which data will be copied.
- `targetStart` *(Number)*: The index into the target which will hold the first byte. Defaults to `0`.
- `sourceStart` *(Number)*: The index of the first character to copy. Defaults to `0`.
- `sourceEnd` *(Number)*: The index of the last character to copy. Defaults to `buffer.length`.

#### Returns
*(Number)* Returns the number of bytes copied.

-----

### CircularBuffer#expand()

Doubles the storage capacity of the buffer. This method is automatically called when the buffer is full. There are very few cases when you should call this manually.

-----

### CircularBuffer#shrink()

Shrinks the storage capacity to the length of the data, rounded up to the nearest multiple of the initial capacity. There are very few cases when it is useful call this method.

-----

### CircularBuffer#write(chunk, [encoding])

Writes to the end of the buffer.

#### Arguments
- `chunk` *(String | Buffer)*: The data to be written.
- `encoding` *(String)*: If `chunk` is a string, how it should be encoded on the buffer.

-----

### CircularBuffer#toString([encoding])

Returns the contents of the buffer as a string.
#### Arguments
- `encoding` *(String)*: How to decode the data.
#### Returns
*(String)*: Always returns a string, unlike `CircularBuffer#peek`.


License
--------------------------------------------------
(The ISC License)

Copyright (c) 2014, Chris Barrick <cbarrick1@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
