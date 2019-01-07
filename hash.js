(function ($) {

    'use strict';

    var Hash = {
        browser: {},
    };

    Hash.SparkMD5ArrayBufferFactory = function () {
        throw new Error('SparkMD5ArrayBufferFactory not set');
    };

    Hash.browser.opensubtitles = function (file, callback) {
        var chunkSize = 1024 * 64;
        var fileSize = 0;
        var checksum = [];

        var read = function (start, end, cb) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var arrayBuffer = e.target.result;
                cb(arrayBuffer);
            };
            reader.readAsArrayBuffer(file.slice(start, end));
        };

        var checksumReady = function (part) {
            checksum.push(part);
            if (checksum.length == 3) {
                var sum = sumHex64bits(checksum[0], checksum[1]);
                sum = sumHex64bits(sum, checksum[2]);
                sum = sum.substr(-16);
                callback(file, padLeft(sum, '0', 16));
            }
        };

        var checksumArrayBuffer = function (buffer, length) {
            var byteArray = new Uint8Array(buffer);
            var checksum = 0;
            var checksumHex = 0;
            for (var i = 0; i < (byteArray.length / length); i++) {
                checksumHex = read64LE(buffer, i);
                checksum = sumHex64bits(checksum.toString(), checksumHex).substr(-16);
            }
            return checksum;
        };

        var padLeft = function (str, c, length) {
            while (str.length < length) {
                str = c.toString() + str;
            }
            return str;
        };

        var sumHex64bits = function (n1, n2) {
            if (n1.length < 16) {
                n1 = padLeft(n1, '0', 16);
            }
            if (n2.length < 16) {
                n2 = padLeft(n2, '0', 16);
            }

            // 1st 32 bits
            var n1_0 = n1.substr(0, 8);
            var n2_0 = n2.substr(0, 8);
            var i_0 = parseInt(n1_0, 16) + parseInt(n2_0, 16);

            // 2nd 32 bits
            var n1_1 = n1.substr(8, 8);
            var n2_1 = n2.substr(8, 8);
            var i_1 = parseInt(n1_1, 16) + parseInt(n2_1, 16);

            // back to hex
            var h_1 = i_1.toString(16);
            var i_1_over = 0;
            if (h_1.length > 8) {
                i_1_over = parseInt(h_1.substr(0, h_1.length - 8), 16);
            } else {
                h_1 = padLeft(h_1, '0', 8);
            }

            var h_0 = (i_1_over + i_0).toString(16);

            return h_0 + h_1.substr(-8);
        };

        var arrayBufferToHex = function (buffer, start, end) {
            // create a byte array (Uint8Array) that we can use to read the array buffer
            var byteArray = new Uint8Array(buffer);

            start = start || 0;
            end = end || byteArray.length;

            // for each element, we want to get its two-digit hexadecimal representation
            var hexParts = [];
            for(var i = start; i < end; i++) {
                // convert value to hexadecimal
                var hex = byteArray[i].toString(16);

                // pad with zeros to length 2
                var paddedHex = ('00' + hex).slice(-2);

                // push to array
                hexParts.push(paddedHex);
            }

            // join all the hex values of the elements into a single string
            return hexParts.join('');
        };

        var read64LE = function (buffer, offset) {
            var ret64be = arrayBufferToHex(buffer, offset * 8, ((offset + 1) * 8));
            var t = [];
            for (var i = 0; i < 8; i++) {
                t.push(ret64be.substr(i * 2, 2));
            }
            t.reverse();
            return t.join('');
        };

        // init

        fileSize = file.size;
        checksumReady(fileSize.toString(16));

        read(0, chunkSize * 2, function (buffer) {
            checksumReady(checksumArrayBuffer(buffer, 16));
        });

        read(file.size - chunkSize, file.size, function (buffer) {
            var bufferView = new Uint8Array(buffer);

            var ab = new ArrayBuffer(chunkSize * 2);
            var abView = new Uint8Array(ab);

            for (var i = 0; i < bufferView.length; ++i) {
                abView[i] = bufferView[i];
            }

            checksumReady(checksumArrayBuffer(ab, 16));
        });
    };

    Hash.browser.napiprojekt = function (file, callback) {
        var size = 1024 * 1024 * 10; // 10MB
        var chunkSize = 1024 * 1024 * 2; // 2MB
        var chunks = Math.ceil(size / chunkSize);
        var currentChunk = 0;
        var spark = Hash.SparkMD5ArrayBufferFactory();
        var reader = new FileReader();

        reader.onload = function (e) {
            spark.append(e.target.result);
            currentChunk++;

            if (currentChunk < chunks) {
                loadNext();
            } else {
                var md5 = spark.end();
                callback(file, md5);
            }
        };

        var loadNext = function () {
            var start = currentChunk * chunkSize;
            var end = ((start + chunkSize) >= size) ? size : start + chunkSize;
            reader.readAsArrayBuffer(file.slice(start, end));
        };

        loadNext();
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = Hash;
    } else {
        $.Hash = Hash;
    }

})(this);
