function extractFromCodeFence(text: string): string | null {
    const match = text.match(/```json\s*([\s\S]*?)```/i)
    if (!match?.[1]) return null
    return match[1].trim()
}

function extractByBraces(text: string): string | null {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')

    if (start === -1 || end === -1 || end <= start) {
        return null
    }

    return text.slice(start, end + 1)
}

export function parseJsonObjectFromModel<T = unknown>(text: string): T {
    const candidate = extractFromCodeFence(text) || extractByBraces(text) || text

    try {
        return JSON.parse(candidate) as T
    } catch {
        throw new Error('Failed to parse JSON from model output')
    }
}

export function createTextStreamFromSseResponse(response: Response): ReadableStream<Uint8Array> {
    if (!response.body) {
        throw new Error('AI stream response has no body')
    }

    const reader = response.body.getReader()
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            let buffer = ''

            try {
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? ''

                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed || !trimmed.startsWith('data:')) continue

                        const payload = trimmed.slice(5).trim()

                        if (payload === '[DONE]') {
                            controller.close()
                            return
                        }

                        try {
                            const parsed = JSON.parse(payload) as {
                                choices?: Array<{ delta?: { content?: string } }>
                            }

                            const content = parsed.choices?.[0]?.delta?.content
                            if (content) {
                                controller.enqueue(encoder.encode(content))
                            }
                        } catch {
                            // Ignore malformed chunk and continue streaming best-effort output.
                        }
                    }
                }

                if (buffer.trim()) {
                    const maybeLine = buffer.trim()
                    if (maybeLine.startsWith('data:')) {
                        const payload = maybeLine.slice(5).trim()
                        if (payload && payload !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(payload) as {
                                    choices?: Array<{ delta?: { content?: string } }>
                                }
                                const content = parsed.choices?.[0]?.delta?.content
                                if (content) {
                                    controller.enqueue(encoder.encode(content))
                                }
                            } catch {
                                // Ignore trailing malformed chunk.
                            }
                        }
                    }
                }

                controller.close()
            } catch (error) {
                controller.error(error)
            } finally {
                reader.releaseLock()
            }
        }
    })
}
