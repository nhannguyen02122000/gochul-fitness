// src/components/modals/CreateContractModal.tsx
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  User,
  Crown,
  Heart,
  Zap,
  DollarSign,
  CalendarIcon,
  Loader2,
} from 'lucide-react'
import { useCreateContract } from '@/hooks/useContracts'
import UserSearchSelect from '@/components/common/UserSearchSelect'
import type { ContractKind } from '@/app/type/api'
import { useState, FormEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateContractModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateContractModal({ open, onClose }: CreateContractModalProps) {
  const createContract = useCreateContract()
  const router = useRouter()
  const pathname = usePathname()

  const [purchasedBy, setPurchasedBy] = useState('')
  const [kind, setKind] = useState<ContractKind | ''>('')
  const [money, setMoney] = useState('')
  const [credits, setCredits] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const resetForm = () => {
    setPurchasedBy('')
    setKind('')
    setMoney('')
    setCredits('')
    setStartDate(undefined)
    setEndDate(undefined)
    setErrors({})
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!purchasedBy) e.purchasedBy = 'Please select a customer'
    if (!kind) e.kind = 'Please select contract type'
    if (!money || Number(money) <= 0) e.money = 'Please enter a valid amount'
    if (kind && kind !== 'PT_MONTHLY' && (!credits || Number(credits) < 1)) e.credits = 'Please enter credits'
    if (!startDate) e.startDate = 'Please select start date'
    if (!endDate) e.endDate = 'Please select end date'
    if (startDate && endDate && endDate <= startDate) e.endDate = 'End date must be after start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const payload = {
        purchased_by: purchasedBy,
        kind: kind as ContractKind,
        money: Number(money),
        start_date: startDate!.getTime(),
        end_date: endDate!.getTime(),
        ...(kind !== 'PT_MONTHLY' && credits ? { credits: Number(credits) } : {})
      }

      await createContract.mutateAsync(payload)
      toast.success('Contract created successfully')
      resetForm()
      onClose()

      if (pathname !== '/contracts') {
        router.push('/contracts')
      }
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create contract')
    }
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  const formatMoney = (val: string) => {
    const num = val.replace(/[^\d]/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const formatDateDisplay = (date?: Date) => {
    if (!date) return ''
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-cta)] rounded-md flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>Create New Contract</DialogTitle>
              <DialogDescription>Set up a new training contract</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Customer</span>
            </div>
            <UserSearchSelect
              value={purchasedBy}
              onChange={(v) => { setPurchasedBy(v); setErrors(p => ({ ...p, purchasedBy: '' })) }}
              placeholder="Search customer by name or email"
            />
            {errors.purchasedBy && <p className="text-xs text-destructive">{errors.purchasedBy}</p>}
          </div>

          {/* Contract Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium">Contract Type</span>
            </div>
            <Select
              value={kind || undefined}
              onValueChange={(v) => {
                setKind(v as ContractKind)
                if (v === 'PT_MONTHLY') setCredits('')
                setErrors(p => ({ ...p, kind: '' }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose contract type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PT">
                  <span className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-violet-600" />
                    Personal Training
                    <span className="text-[10px] text-muted-foreground">(credits)</span>
                  </span>
                </SelectItem>
                <SelectItem value="REHAB">
                  <span className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-cyan-600" />
                    Rehabilitation
                    <span className="text-[10px] text-muted-foreground">(credits)</span>
                  </span>
                </SelectItem>
                <SelectItem value="PT_MONTHLY">
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-orange-600" />
                    PT Monthly
                    <span className="text-[10px] text-muted-foreground">(unlimited)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.kind && <p className="text-xs text-destructive">{errors.kind}</p>}

            {/* Credits (conditional) */}
            {kind && kind !== 'PT_MONTHLY' && (
              <div className="space-y-1.5 mt-3">
                <Label>Number of Credits</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Enter number of sessions"
                  value={credits}
                  onChange={(e) => { setCredits(e.target.value); setErrors(p => ({ ...p, credits: '' })) }}
                />
                {errors.credits && <p className="text-xs text-destructive">{errors.credits}</p>}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Contract Amount</span>
            </div>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter total amount"
                value={formatMoney(money)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  setMoney(raw)
                  setErrors(p => ({ ...p, money: '' }))
                }}
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">VND</span>
            </div>
            {errors.money && <p className="text-xs text-destructive">{errors.money}</p>}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Contract Duration</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger
                    render={<Button variant="outline" />}
                    className={cn(
                      'w-full justify-start text-left font-normal h-10 text-sm',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDateDisplay(startDate) : 'Pick date'}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); setStartDateOpen(false); setErrors(p => ({ ...p, startDate: '' })) }}
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger
                    render={<Button variant="outline" />}
                    className={cn(
                      'w-full justify-start text-left font-normal h-10 text-sm',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDateDisplay(endDate) : 'Pick date'}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => { setEndDate(d); setEndDateOpen(false); setErrors(p => ({ ...p, endDate: '' })) }}
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" onClick={handleCancel} className="flex-1 h-11 text-sm font-semibold">
            Cancel
          </Button>
          <Button
            onClick={(e) => handleSubmit(e as any)}
            disabled={createContract.isPending}
            className="flex-1 h-11 text-sm font-semibold bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
          >
            {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
