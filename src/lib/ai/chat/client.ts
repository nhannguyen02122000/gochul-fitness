function getBaseUrl(): string {
    const baseUrl = process.env.AI_BASE_URL

    if (!baseUrl) {
        throw new Error('Missing AI_BASE_URL environment variable')
    }

    return baseUrl
}

function getModel(): string {
    const model = process.env.AI_MODEL

    if (!model) {
        throw new Error('Missing AI_MODEL environment variable')
    }

    return model
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface ChatCompletionRequest {
    messages: ChatMessage[]
    stream?: boolean
    temperature?: number
}

function getApiKey(): string {
    const apiKey = process.env.AI_API_KEY

    if (!apiKey) {
        throw new Error('Missing AI_API_KEY environment variable')
    }

    return apiKey
}

export async function createChatCompletion({
    messages,
    stream = false,
    temperature = 0
}: ChatCompletionRequest): Promise<Response> {
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`
        },
        body: JSON.stringify({
            model: getModel(),
            messages,
            stream,
            temperature
        })
    })

    if (!response.ok) {
        const message = await response.text().catch(() => 'Unknown AI error')
        throw new Error(`AI request failed (${response.status}): ${message}`)
    }

    return response
}

export async function createNonStreamChatCompletion(
    messages: ChatMessage[],
    temperature: number = 0
): Promise<string> {
    const response = await createChatCompletion({
        messages,
        stream: false,
        temperature
    })

    const json = await response.json() as {
        choices?: Array<{
            message?: {
                content?: string
            }
        }>
    }

    const content = json.choices?.[0]?.message?.content

    if (!content || typeof content !== 'string') {
        throw new Error('AI response did not include a valid message content')
    }

    return content
}

export type { ChatMessage }
