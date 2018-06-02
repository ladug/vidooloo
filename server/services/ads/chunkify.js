const request = require('request')
const uuid = require('uuid/v4')

const buffers = {}

const chunkSizeLimit = 1 << 20
const maxNumberOfChunks = 2

function removeBuffer (sessionId) {
    delete buffers[sessionId]
}

function getCurrentChunk (sessionId) {
    let buffer = buffers[sessionId]
    const chunk = buffer.chunks.shift()
    if (buffer.ended && buffer.chunks.length === 0) {
        removeBuffer(sessionId)
    }

    return chunk
}

exports.hasChunks = function (sessionId) {
    let buffer = buffers[sessionId]
    return buffer && buffer.chunks.length > 0
}

exports.getChunk = function (sessionId, cb) {
    let buffer = buffers[sessionId]
    if (buffer) {
        buffer.stream.resume()

        if (buffer.chunks.length > 0) {
            const currentChunk = getCurrentChunk(sessionId)
            return cb(null, currentChunk)
        }

        buffer.chunked(function () {
            const currentChunk = getCurrentChunk(sessionId)
            return cb(null, currentChunk)
        })
    }
}

exports.startChunk = function (url, sessionId) {
    sessionId = sessionId || uuid()

    let stream = request(url)
    let events = []
    buffers[sessionId] = {stream, chunks: [], chunked: cb => events.push(cb)}
    let size = 0
    let buffer = new Buffer(0)

    stream.on('data', function (smallChunk) {
        buffer = Buffer.concat([buffer, smallChunk])

        size += smallChunk.length
        if (size > chunkSizeLimit) {
            size = 0

            buffers[sessionId].chunks = buffers[sessionId].chunks.concat(buffer)
            events.forEach(e => e())
            events = []
            buffer = new Buffer(0)

            if (buffers[sessionId].chunks.length >= maxNumberOfChunks) {
                stream.pause()
            }
        }
    })

    stream.on('end', function () {
        buffers[sessionId].chunks = buffers[sessionId].chunks.concat(buffer)
        buffers[sessionId].ended = true
        events.forEach(e => e())
    })

    return sessionId
}

exports.removeBuffer = removeBuffer


// Demo how to use:
// =================
//
// const session = exports.startChunk('http://cdnp.tremormedia.com/video/acudeo/Carrot_400x300_500kb.flv')
// exports.getChunk(session, function (err, chunk) {
//
// })
//
// setTimeout(function () {
//     exports.getChunk(session, function (err, chunk) {
//
//     })
// }, 10000)