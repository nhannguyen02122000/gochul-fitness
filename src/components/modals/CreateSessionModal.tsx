// src/components/modals/CreateSessionModal.tsx
'use client'

import { Modal, Form, Select, DatePicker, message } from 'antd'
import { useCreateHistory, useTrainerSchedule } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import TimeSlotPicker from '@/components/common/TimeSlotPicker'
import dayjs, { Dayjs } from 'dayjs'
import { useMemo } from 'react'

interface CreateSessionModalProps {
  open: boolean
  onClose: () => void
  preselectedContractId?: string
}

interface FormValues {
  contract_id: string
  date: Dayjs
  from: number
  to: number
}

export default function CreateSessionModal({ open, onClose, preselectedContractId }: CreateSessionModalProps) {
  const [form] = Form.useForm<FormValues>()
  const createHistory = useCreateHistory()
  const { data: contractsData } = useInfiniteContracts(100)

  // Watch form values for reactive updates
  const contractId = Form.useWatch('contract_id', form)
  const dateValue = Form.useWatch('date', form)
  const fromValue = Form.useWatch('from', form)
  const toValue = Form.useWatch('to', form)

  // Set preselected contract when modal opens
  if (open && preselectedContractId && !form.getFieldValue('contract_id')) {
    form.setFieldValue('contract_id', preselectedContractId)
  }

  // Get active contracts
  const activeContracts = useMemo(() => {
    if (!contractsData) return []

    const allContracts = contractsData.pages.flatMap(page =>
      'contracts' in page ? page.contracts : []
    )

    return allContracts.filter(c => c.status === 'ACTIVE')
  }, [contractsData])

  // Get trainer ID from selected contract
  const selectedTrainerId = useMemo(() => {
    if (!contractId) return undefined

    const contract = activeContracts.find(c => c.id === contractId)
    return contract?.sale_by
  }, [contractId, activeContracts])

  // Get selected date timestamp
  const selectedDate = useMemo(() => {
    return dateValue ? dateValue.startOf('day').valueOf() : undefined
  }, [dateValue])

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

  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = {
        contract_id: values.contract_id,
        date: values.date.startOf('day').valueOf(),
        from: values.from,
        to: values.to
      }

      await createHistory.mutateAsync(payload)
      message.success('Session created successfully')
      form.resetFields()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
      message.error(errorMessage)
    }
  }

  const handleSlotSelect = (from: number, to: number) => {
    form.setFieldsValue({ from, to })
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="Create New Session"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={createHistory.isPending}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Form.Item
          name="contract_id"
          label="Contract"
          rules={[{ required: true, message: 'Please select a contract' }]}
        >
          <Select
            placeholder="Select active contract"
            options={contractOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={() => {
              // Reset time selection when contract changes
              form.setFieldsValue({ from: undefined, to: undefined })
            }}
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Please select date' }]}
        >
          <DatePicker
            className="w-full"
            format="DD/MM/YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            onChange={() => {
              // Reset time selection when date changes
              form.setFieldsValue({ from: undefined, to: undefined })
            }}
          />
        </Form.Item>

        <Form.Item
          label="Time Slot (90 minutes)"
          required
          help={!selectedTrainerId || !selectedDate ? 'Please select contract and date first' : undefined}
        >
          <Form.Item
            name="from"
            noStyle
            rules={[{ required: true, message: 'Please select a time slot' }]}
          >
            <input type="hidden" />
          </Form.Item>
          <Form.Item
            name="to"
            noStyle
            rules={[{ required: true, message: 'Please select a time slot' }]}
          >
            <input type="hidden" />
          </Form.Item>

          {selectedTrainerId && selectedDate ? (
            <TimeSlotPicker
              selectedFrom={fromValue}
              selectedTo={toValue}
              occupiedSlots={(scheduleData && 'occupied_slots' in scheduleData) ? scheduleData.occupied_slots : []}
              date={selectedDate}
              onSelect={handleSlotSelect}
              loading={isLoadingSchedule}
            />
          ) : (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              Select a contract and date to view available time slots
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}

