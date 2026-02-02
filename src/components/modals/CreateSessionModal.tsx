// src/components/modals/CreateSessionModal.tsx
'use client'

import { Modal, Form, Select, DatePicker, message, Typography, Card } from 'antd'
import { CalendarOutlined, FileTextOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useCreateHistory, useTrainerSchedule } from '@/hooks/useHistory'
import { useInfiniteContracts } from '@/hooks/useContracts'
import TimeSlotPicker from '@/components/common/TimeSlotPicker'
import dayjs, { Dayjs } from 'dayjs'
import { useMemo } from 'react'

const { Text, Title } = Typography

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
      title={
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-linear-to-br from-[#FA6868] to-[#FAAC68] rounded-xl flex items-center justify-center">
            <CalendarOutlined className="text-white text-lg" />
          </div>
          <div>
            <Title level={4} className="mb-0!">Create New Session</Title>
            <Text type="secondary" className="text-sm">Schedule a training session</Text>
          </div>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={createHistory.isPending}
      width={750}
      destroyOnClose
      okText="Create Session"
      okButtonProps={{
        size: 'large',
        className: 'h-11'
      }}
      cancelButtonProps={{
        size: 'large',
        className: 'h-11'
      }}
      styles={{
        header: { padding: '24px 24px 0' },
        body: { padding: '24px' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-2"
      >
        {/* Contract Selection Card */}
        <Card className="mb-5 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <FileTextOutlined className="text-[#FA6868] text-lg" />
            <Text strong className="text-base">Contract Information</Text>
          </div>

          <Form.Item
            name="contract_id"
            label={<Text className="text-sm font-medium">Select Active Contract</Text>}
            rules={[{ required: true, message: 'Please select a contract' }]}
            className="mb-0!"
          >
            <Select
              size="large"
              placeholder="Choose a contract"
              options={contractOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={() => {
                // Reset time selection when contract changes
                form.setFieldsValue({ from: undefined, to: undefined })
              }}
              suffixIcon={<FileTextOutlined className="text-gray-400" />}
            />
          </Form.Item>
        </Card>

        {/* Date & Time Selection Card */}
        <Card className="mb-5 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <ClockCircleOutlined className="text-[#5A9CB5] text-lg" />
            <Text strong className="text-base">Date & Time</Text>
          </div>

          <Form.Item
            name="date"
            label={<Text className="text-sm font-medium">Select Date</Text>}
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker
              size="large"
              className="w-full"
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              onChange={() => {
                // Reset time selection when date changes
                form.setFieldsValue({ from: undefined, to: undefined })
              }}
              suffixIcon={<CalendarOutlined className="text-gray-400" />}
              placeholder="Choose a date"
            />
          </Form.Item>

          <Form.Item
            label={
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium">Time Slot</Text>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
                  90 minutes
                </span>
              </div>
            }
            required
            help={!selectedTrainerId || !selectedDate ? (
              <div className="flex items-center gap-2 mt-2">
                <ThunderboltOutlined className="text-orange-500" />
                <Text type="secondary" className="text-sm">Please select contract and date first</Text>
              </div>
            ) : undefined}
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
              <div className="mt-3">
                <TimeSlotPicker
                  selectedFrom={fromValue}
                  selectedTo={toValue}
                  occupiedSlots={(scheduleData && 'occupied_slots' in scheduleData) ? scheduleData.occupied_slots : []}
                  date={selectedDate}
                  onSelect={handleSlotSelect}
                  loading={isLoadingSchedule}
                />
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl mt-3">
                <CalendarOutlined className="text-4xl text-gray-300 mb-3" />
                <Text className="text-gray-500 block text-sm font-medium">No date selected yet</Text>
                <Text type="secondary" className="text-xs">Select a contract and date to view available time slots</Text>
              </div>
            )}
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  )
}

