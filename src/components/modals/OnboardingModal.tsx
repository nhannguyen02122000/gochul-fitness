// src/components/modals/OnboardingModal.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Smile, User, Loader2, Info } from 'lucide-react'
import { useCreateUserSetting } from '@/hooks/useUserOnboarding'
import { useState, FormEvent } from 'react'
import { toast } from 'sonner'

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
}

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const createUserSetting = useCreateUserSetting()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({})

  const validate = () => {
    const newErrors: { firstName?: string; lastName?: string } = {}
    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    else if (firstName.trim().length < 2) newErrors.firstName = 'At least 2 characters'
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    else if (lastName.trim().length < 2) newErrors.lastName = 'At least 2 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await createUserSetting.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      toast.success('Welcome! Your profile has been created.')
      setFirstName('')
      setLastName('')
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create profile')
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-cta)] rounded-lg flex items-center justify-center shrink-0">
              <Smile className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Welcome to ChulFitCoach!</DialogTitle>
              <DialogDescription>Let&apos;s set up your profile</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="first_name"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: undefined })) }}
                  disabled={createUserSetting.isPending}
                  className="pl-9"
                />
              </div>
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="last_name"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: undefined })) }}
                  disabled={createUserSetting.isPending}
                  className="pl-9"
                />
              </div>
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-[var(--color-info-bg)] p-3 text-sm text-[var(--color-warning)]">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>This information helps trainers identify you during sessions.</p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createUserSetting.isPending}
              className="w-full bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
            >
              {createUserSetting.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Get Started
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
