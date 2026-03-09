// src/components/modals/CreateSessionModal.tsx
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
import { Badge } from '@/components/ui/badge'
import {
  CalendarIcon,
  Clock,
  FileText,
  Loader2,
  Info,
} from 'lucide-react'
import { useCreateHistory, useTrainerSchedule } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import TimeSlotPicker from '@/components/common/TimeSlotPicker'
import { useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateSessionModalProps {
  open: boolean
  onClose: () => void
  preselectedContractId?: string
}

export default function CreateSessionModal({ open, onClose, preselectedContractId }: CreateSessionModalProps) {
  const createHistory = useCreateHistory()
  const { data: contractsData } = useInfiniteContracts(100)

  const [contractId, setContractId] = useState('')
  const [date, setDate] = useState<Date | undefined>()
  const [from, setFrom] = useState<number | undefined>()
  const [to, setTo] = useState<number | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dateOpen, setDateOpen] = useState(false)

  // Set preselected contract when modal opens
  useEffect(() => {
    if (open && preselectedContractId && !contractId) {
      setContractId(preselectedContractId)
    }
  }, [open, preselectedContractId, contractId])

  // Get active contracts
  const activeContracts = useMemo(() => {
    if (!contractsData) return []
    const allContracts = contractsData.pages.flatMap(page =>
      'contracts' in page ? page.contracts : []
    )
    return allContracts.filter(c => {
      if (c.status !== 'ACTIVE') return false
      const hasCreditsField = c.kind === 'PT' || c.kind === 'REHAB'
      if (hasCreditsField && c.credits) {
        const usedCredits = c.used_credits || 0
        return usedCredits < c.credits
      }
      return true
    })
  }, [contractsData])

  // Get trainer ID from selected contract
  const selectedTrainerId = useMemo(() => {
    if (!contractId) return undefined
    const contract = activeContracts.find(c => c.id === contractId)
    return contract?.sale_by
  }, [contractId, activeContracts])

  // Get selected date timestamp
  const selectedDate = useMemo(() => {
    if (!date) return undefined
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [date])

  // Fetch trainer schedule
  const { data: scheduleData, isLoading: isLoadingSchedule } = useTrainerSchedule(
    selectedTrainerId,
    selectedDate
  )

  const contractOptions = useMemo(() => {
    return activeContracts.map(contract => {
      const customerName = contract.purchased_by_user?.[0]?.email?.split('@')[0] || 'Unknown'
      const kindLabels: Record<string, string> = {
        'PT': 'PT',
        'REHAB': 'Rehab',
        'PT_MONTHLY': 'PT Monthly'
      }
      return {
        value: contract.id,
        label: `${kindLabels[contract.kind]} - ${customerName}`,
      }
    })
  }, [activeContracts])

  const resetForm = () => {
    setContractId('')
    setDate(undefined)
    setFrom(undefined)
    setTo(undefined)
    setErrors({})
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contractId) e.contractId = 'Please select a contract'
    if (!date) e.date = 'Please select a date'
    if (from === undefined || to === undefined) e.timeSlot = 'Please select a time slot'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const d = new Date(date!)
      d.setHours(0, 0, 0, 0)

      await createHistory.mutateAsync({
        contract_id: contractId,
        date: d.getTime(),
        from: from!,
        to: to!
      })
      toast.success('Session created successfully')
      resetForm()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create session')
    }
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  const handleSlotSelect = (f: number, t: number) => {
    setFrom(f)
    setTo(t)
    setErrors(p => ({ ...p, timeSlot: '' }))
  }

  const formatDateDisplay = (d?: Date) => {
    if (!d) return ''
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-cta)] rounded-md flex items-center justify-center shrink-0">
              <CalendarIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>Schedule a training session</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {/* Contract selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Active Contract</span>
            </div>
            <Select
              value={contractId || undefined}
              onValueChange={(v) => {
                setContractId(v ?? '')
                setFrom(undefined)
                setTo(undefined)
                setErrors(p => ({ ...p, contractId: '' }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a contract" />
              </SelectTrigger>
              <SelectContent>
                {contractOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contractId && <p className="text-xs text-destructive">{errors.contractId}</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Date & Time</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Select Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={<Button variant="outline" />}
                  className={cn(
                    'w-full justify-start text-left font-normal h-10 text-sm',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDateDisplay(date) : 'Choose a date'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d)
                      setDateOpen(false)
                      setFrom(undefined)
                      setTo(undefined)
                      setErrors(p => ({ ...p, date: '' }))
                    }}
                    disabled={(d) => d < today}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>

            {/* Time Slot */}
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Time Slot</Label>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-violet-50 text-violet-700 border-0">
                  90 min
                </Badge>
              </div>

              {selectedTrainerId && selectedDate ? (
                <div className="mt-2">
                  <TimeSlotPicker
                    selectedFrom={from}
                    selectedTo={to}
                    occupiedSlots={(scheduleData && 'occupied_slots' in scheduleData) ? scheduleData.occupied_slots : []}
                    date={selectedDate}
                    onSelect={handleSlotSelect}
                    loading={isLoadingSchedule}
                  />
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-muted/50 border border-dashed border-border rounded-md mt-2">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No date selected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Select a contract and date to view slots</p>
                </div>
              )}
              {errors.timeSlot && <p className="text-xs text-destructive">{errors.timeSlot}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" onClick={handleCancel} className="flex-1 h-11 text-sm font-semibold">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createHistory.isPending}
            className="flex-1 h-11 text-sm font-semibold bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]"
          >
            {createHistory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
