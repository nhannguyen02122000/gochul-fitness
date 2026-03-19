'use client'

import { FormEvent, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { PlannerResponse } from '@/lib/ai/chat/types'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
    role: ChatRole
    content: string
}

async function readTextStream(response: Response, onChunk: (text: string) => void): Promise<void> {
    if (!response.body) {
        throw new Error('No response body for stream')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            onChunk(decoder.decode(value, { stream: true }))
        }
    } finally {
        reader.releaseLock()
    }
}

export default function AIChatPage() {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [conversationLocale, setConversationLocale] = useState<'vi' | 'en' | null>(null)

    const [pendingPlan, setPendingPlan] = useState<PlannerResponse | null>(null)
    const [pendingOriginalMessage, setPendingOriginalMessage] = useState<string>('')

    const canSend = useMemo(() => !isLoading && input.trim().length > 0, [isLoading, input])

    const appendAssistantMessage = () => {
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
    }

    const appendAssistantChunk = (chunk: string) => {
        setMessages((prev) => {
            if (prev.length === 0) return prev
            const next = [...prev]
            const last = next[next.length - 1]
            if (!last || last.role !== 'assistant') return prev
            next[next.length - 1] = {
                ...last,
                content: `${last.content}${chunk}`
            }
            return next
        })
    }

    async function streamFinalAnswer({
        message,
        plan,
        confirmed
    }: {
        message: string
        plan: PlannerResponse
        confirmed: boolean
    }): Promise<void> {
        appendAssistantMessage()

        const conversationHistory = messages.slice(-12).map((item) => ({ role: item.role, content: item.content }))

        const streamResponse = await fetch('/api/ai-chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, plan, confirmed, conversationHistory })
        })

        if (!streamResponse.ok) {
            const payload = await streamResponse.json().catch(() => ({ error: 'Failed to stream response' }))
            throw new Error(payload.error || 'Failed to stream response')
        }

        await readTextStream(streamResponse, appendAssistantChunk)
    }

    async function requestPlan(message: string): Promise<PlannerResponse> {
        const conversationHistory = messages.slice(-12).map((item) => ({ role: item.role, content: item.content }))

        const planResponse = await fetch('/api/ai-chat/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                ...(conversationLocale ? { conversationLocale } : {}),
                conversationHistory
            })
        })

        const payload = await planResponse.json().catch(() => ({}))

        if (!planResponse.ok) {
            throw new Error(payload.error || 'Failed to generate AI plan')
        }

        if (!payload?.plan) {
            throw new Error('Plan endpoint returned invalid payload')
        }

        return payload.plan as PlannerResponse
    }

    const handleSend = async (event: FormEvent) => {
        event.preventDefault()

        const message = input.trim()
        if (!message || isLoading) return

        setError(null)
        setInput('')
        setMessages((prev) => [...prev, { role: 'user', content: message }])
        setIsLoading(true)

        try {
            const plan = await requestPlan(message)

            if (!conversationLocale) {
                setConversationLocale(plan.locale)
            }

            if (plan.requires_confirmation) {
                setPendingPlan(plan)
                setPendingOriginalMessage(message)

                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content:
                            plan.confirmation_message ||
                            'This action requires your confirmation. Click Confirm to continue.'
                    }
                ])

                return
            }

            await streamFinalAnswer({ message, plan, confirmed: false })
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to process AI chat request')
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirm = async () => {
        if (!pendingPlan || !pendingOriginalMessage || isLoading) return

        setError(null)
        setIsLoading(true)

        try {
            await streamFinalAnswer({
                message: pendingOriginalMessage,
                plan: pendingPlan,
                confirmed: true
            })
            setPendingPlan(null)
            setPendingOriginalMessage('')
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to confirm action')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        const locale = conversationLocale ?? pendingPlan?.locale
        setPendingPlan(null)
        setPendingOriginalMessage('')
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content:
                    locale === 'vi'
                        ? 'Yêu cầu đã bị hủy. Bạn có thể tiếp tục với câu hỏi khác.'
                        : 'Action cancelled. You can continue with other queries.'
            }
        ])
    }

    return (
        <div className="px-4 py-5 max-w-3xl mx-auto space-y-4">
            <div>
                <h1 className="text-xl font-bold">AI Chat</h1>
                <p className="text-sm text-muted-foreground">
                    Ask about contracts, sessions, or manage them with AI assistance.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {messages.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Try: &quot;Cho tôi xem các hợp đồng active&quot; or &quot;Show me today&apos;s sessions&quot;
                        </p>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={`${message.role}-${index}`}
                            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${message.role === 'user'
                                ? 'bg-[var(--color-cta)] text-white ml-10'
                                : 'bg-muted mr-10'
                                }`}
                        >
                            <div className="mb-1">
                                <Badge variant={message.role === 'user' ? 'default' : 'outline'}>
                                    {message.role === 'user' ? 'You' : 'Assistant'}
                                </Badge>
                            </div>
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                                <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Processing...
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </div>
                    )}

                    {pendingPlan?.requires_confirmation && (
                        <div className="border rounded-md p-3 bg-amber-50 border-amber-200 space-y-2">
                            <p className="text-sm text-amber-900">
                                {pendingPlan.confirmation_message || 'Confirm this action?'}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isLoading}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    Confirm
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <form onSubmit={handleSend} className="space-y-2">
                <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about contracts, sessions, or request an action..."
                    rows={4}
                    disabled={isLoading}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={!canSend}>
                        Send
                    </Button>
                </div>
            </form>
        </div>
    )
}
