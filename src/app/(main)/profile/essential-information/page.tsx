'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { GetUserInformationResponse } from '@/app/type/api'
import { useUpdateEssentialInformation } from '@/hooks/useUser'
import {
    ESSENTIAL_INFORMATION_FORM,
    ESSENTIAL_RENDER_QUESTIONS,
    getMissingEssentialQuestions,
    type EssentialAnswers,
} from '@/lib/essentialInformation'

async function fetchUserInfo(): Promise<GetUserInformationResponse> {
    const response = await fetch('/api/user/getUserInformation')
    if (!response.ok) {
        throw new Error('Failed to fetch user information')
    }
    return response.json()
}

function parseAnswers(raw?: string): EssentialAnswers {
    if (!raw) {
        return {}
    }

    try {
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {}
        }
        return parsed as EssentialAnswers
    } catch {
        return {}
    }
}

export default function EssentialInformationPage() {
    const router = useRouter()
    const updateEssential = useUpdateEssentialInformation()
    const [answers, setAnswers] = useState<EssentialAnswers>({})

    const { data: userInfo, isLoading } = useQuery({
        queryKey: ['userInfo'],
        queryFn: fetchUserInfo,
    })

    const hydratedAnswers = useMemo(() => {
        if (!userInfo || 'error' in userInfo) {
            return {}
        }
        return parseAnswers(userInfo.essential_information)
    }, [userInfo])

    const sections = useMemo(() => {
        const grouped: Array<{
            id: string
            title: string
            questions: typeof ESSENTIAL_RENDER_QUESTIONS
        }> = []

        for (const question of ESSENTIAL_RENDER_QUESTIONS) {
            if (question.type === 'PAGE_BREAK') {
                grouped.push({
                    id: question.id,
                    title: question.title,
                    questions: [],
                })
                continue
            }

            if (grouped.length === 0) {
                grouped.push({
                    id: 'section_general',
                    title: 'General',
                    questions: [],
                })
            }

            grouped[grouped.length - 1].questions.push(question)
        }

        return grouped
    }, [])

    useEffect(() => {
        if (Object.keys(answers).length === 0 && Object.keys(hydratedAnswers).length > 0) {
            setAnswers(hydratedAnswers)
        }
    }, [answers, hydratedAnswers])

    const setTextAnswer = (questionId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }))
    }

    const setSingleChoice = (questionId: string, choice: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: choice }))
    }

    const toggleCheckboxChoice = (questionId: string, choice: string) => {
        setAnswers((prev) => {
            const current = prev[questionId]
            const currentList = Array.isArray(current)
                ? current.filter((item): item is string => typeof item === 'string')
                : []
            const exists = currentList.includes(choice)
            const next = exists
                ? currentList.filter((item) => item !== choice)
                : [...currentList, choice]
            return { ...prev, [questionId]: next }
        })
    }

    const handleSaveDraft = async () => {
        try {
            // Draft can be saved at any progress level (including incomplete answers).
            await updateEssential.mutateAsync({
                essential_information: JSON.stringify(answers),
                is_submit: false,
            })
            toast.success('Draft saved')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save draft'
            toast.error(message)
        }
    }

    const handleSubmit = async () => {
        const missing = getMissingEssentialQuestions(answers)
        if (missing.length > 0) {
            toast.error(`Please complete all required questions. Missing: ${missing[0].title}`)
            return
        }

        try {
            await updateEssential.mutateAsync({
                essential_information: JSON.stringify(answers),
                is_submit: true,
            })
            toast.success('Essential information submitted')
            router.push('/profile')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to submit information'
            toast.error(message)
        }
    }

    if (isLoading || !userInfo || 'error' in userInfo) {
        return (
            <div className="px-4 pt-6 pb-20">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Loading essential information form...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="px-4 pt-6 pb-24 space-y-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/profile')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{ESSENTIAL_INFORMATION_FORM.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {ESSENTIAL_INFORMATION_FORM.description}
                    </p>
                </CardContent>
            </Card>

            {sections.map((section) => (
                <Card key={section.id}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-5">
                        {section.questions.map((question, questionIndex) => (
                            <div
                                key={question.id}
                                className={questionIndex > 0 ? 'pt-4 border-t border-border/60' : undefined}
                            >
                                <p className="text-sm font-medium text-foreground mb-3">{question.title}</p>

                                {(question.type === 'TEXT' || question.type === 'DATE') && (
                                    <Input
                                        type={question.type === 'DATE' ? 'date' : 'text'}
                                        value={typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''}
                                        onChange={(event) => setTextAnswer(question.id, event.target.value)}
                                        className="h-10"
                                    />
                                )}

                                {question.type === 'PARAGRAPH_TEXT' && (
                                    <Textarea
                                        value={typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''}
                                        onChange={(event) => setTextAnswer(question.id, event.target.value)}
                                        className="min-h-24"
                                    />
                                )}

                                {question.type === 'MULTIPLE_CHOICE' && (
                                    <div className="flex flex-wrap gap-2">
                                        {question.choices?.map((choice) => {
                                            const selected = answers[question.id] === choice
                                            return (
                                                <button
                                                    key={choice}
                                                    type="button"
                                                    onClick={() => setSingleChoice(question.id, choice)}
                                                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${selected
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-foreground'
                                                        : 'border-border text-muted-foreground hover:bg-muted'
                                                        }`}
                                                >
                                                    {choice}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {question.type === 'CHECKBOX' && (
                                    <div className="flex flex-wrap gap-2">
                                        {question.choices?.map((choice) => {
                                            const selectedValues = Array.isArray(answers[question.id]) ? answers[question.id] : []
                                            const selected = selectedValues.includes(choice)
                                            return (
                                                <button
                                                    key={choice}
                                                    type="button"
                                                    onClick={() => toggleCheckboxChoice(question.id, choice)}
                                                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${selected
                                                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-foreground'
                                                        : 'border-border text-muted-foreground hover:bg-muted'
                                                        }`}
                                                >
                                                    {choice}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <div className="">
                <div className="bg-background/95 backdrop-blur-sm rounded-xl p-3 flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={updateEssential.isPending}
                        className="flex-1 h-11"
                    >
                        {updateEssential.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Draft'
                        )}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={updateEssential.isPending}
                        className="flex-1 h-11"
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    )
}


