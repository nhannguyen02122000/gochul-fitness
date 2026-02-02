// src/components/modals/CreateContractModal.tsx
'use client'

import { Modal, Form, Select, InputNumber, DatePicker, message, Typography, Card, Space } from 'antd'
import { FileTextOutlined, UserOutlined, CrownOutlined, DollarOutlined, CalendarOutlined, ThunderboltOutlined, HeartOutlined } from '@ant-design/icons'
import { useCreateContract } from '@/hooks/useContracts'
import UserSearchSelect from '@/components/common/UserSearchSelect'
import type { ContractKind } from '@/app/type/api'
import { Dayjs } from 'dayjs'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const { Text, Title } = Typography

interface CreateContractModalProps {
  open: boolean
  onClose: () => void
}

interface FormValues {
  purchased_by: string
  kind: ContractKind
  money: number
  start_date: Dayjs
  end_date: Dayjs
  credits?: number
}

export default function CreateContractModal({ open, onClose }: CreateContractModalProps) {
  const [form] = Form.useForm<FormValues>()
  const createContract = useCreateContract()
  const [selectedKind, setSelectedKind] = useState<ContractKind>()
  const router = useRouter()
  const pathname = usePathname()

  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = {
        purchased_by: values.purchased_by,
        kind: values.kind,
        money: values.money,
        start_date: values.start_date.valueOf(),
        end_date: values.end_date.valueOf(),
        ...(values.kind !== 'PT_MONTHLY' && values.credits ? { credits: values.credits } : {})
      }

      await createContract.mutateAsync(payload)
      message.success('Contract created successfully')
      form.resetFields()
      setSelectedKind(undefined)
      onClose()

      // Navigate to /contracts if user is not already on that route
      if (pathname !== '/contracts') {
        router.push('/contracts')
      }
    } catch (error) {
      message.error((error as Error).message || 'Failed to create contract')
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSelectedKind(undefined)
    onClose()
  }

  const handleKindChange = (kind: ContractKind) => {
    setSelectedKind(kind)
    if (kind === 'PT_MONTHLY') {
      form.setFieldValue('credits', undefined)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-linear-to-br from-[#5A9CB5] to-[#6BADC5] rounded-xl flex items-center justify-center">
            <FileTextOutlined className="text-white text-lg" />
          </div>
          <div>
            <Title level={4} className="mb-0!">Create New Contract</Title>
            <Text type="secondary" className="text-sm">Set up a new training contract</Text>
          </div>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={createContract.isPending}
      width={700}
      destroyOnClose
      okText="Create Contract"
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
        {/* Customer Selection Card */}
        <Card className="mb-5 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <UserOutlined className="text-[#FA6868] text-lg" />
            <Text strong className="text-base">Customer Information</Text>
          </div>

          <Form.Item
            name="purchased_by"
            label={<Text className="text-sm font-medium">Select Customer</Text>}
            rules={[{ required: true, message: 'Please select a customer' }]}
            className="mb-0!"
          >
            <UserSearchSelect
              placeholder="Search customer by name or email"
              size="large"
            />
          </Form.Item>
        </Card>

        {/* Contract Type Card */}
        <Card className="mb-5 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <CrownOutlined className="text-purple-600 text-lg" />
            <Text strong className="text-base">Contract Type & Credits</Text>
          </div>

          <Form.Item
            name="kind"
            label={<Text className="text-sm font-medium">Contract Type</Text>}
            rules={[{ required: true, message: 'Please select contract type' }]}
          >
            <Select
              size="large"
              placeholder="Choose contract type"
              onChange={handleKindChange}
              options={[
                {
                  value: 'PT',
                  label: (
                    <div className="flex items-center gap-2">
                      <CrownOutlined className="text-purple-600" />
                      <span>Personal Training</span>
                      <span className="text-xs text-gray-500">(with credits)</span>
                    </div>
                  )
                },
                {
                  value: 'REHAB',
                  label: (
                    <div className="flex items-center gap-2">
                      <HeartOutlined className="text-blue-600" />
                      <span>Rehabilitation</span>
                      <span className="text-xs text-gray-500">(with credits)</span>
                    </div>
                  )
                },
                {
                  value: 'PT_MONTHLY',
                  label: (
                    <div className="flex items-center gap-2">
                      <ThunderboltOutlined className="text-orange-600" />
                      <span>PT Monthly</span>
                      <span className="text-xs text-gray-500">(unlimited sessions)</span>
                    </div>
                  )
                }
              ]}
            />
          </Form.Item>

          {selectedKind && selectedKind !== 'PT_MONTHLY' && (
            <Form.Item
              name="credits"
              label={<Text className="text-sm font-medium">Number of Credits</Text>}
              rules={[{ required: true, message: 'Please enter credits' }]}
            >
              <InputNumber
                size="large"
                min={1}
                placeholder="Enter number of sessions"
                className="w-full"
                prefix={<ThunderboltOutlined className="text-gray-400" />}
              />
            </Form.Item>
          )}
        </Card>

        {/* Pricing Card */}
        <Card className="mb-5 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarOutlined className="text-green-600 text-lg" />
            <Text strong className="text-base">Pricing</Text>
          </div>

          <Form.Item
            name="money"
            label={<Text className="text-sm font-medium">Contract Amount</Text>}
            rules={[{ required: true, message: 'Please enter amount' }]}
            className="mb-0!"
          >
            <InputNumber
              size="large"
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => {
                const parsed = value?.replace(/\$\s?|(,*)/g, '')
                return (parsed ? Number(parsed) : 0) as 0
              }}
              placeholder="Enter total amount"
              className="w-full"
              addonAfter="VND"
              prefix={<DollarOutlined className="text-gray-400" />}
            />
          </Form.Item>
        </Card>

        {/* Duration Card */}
        <Card className="mb-0 border-gray-200! shadow-sm" styles={{ body: { padding: '20px' } }}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarOutlined className="text-[#5A9CB5] text-lg" />
            <Text strong className="text-base">Contract Duration</Text>
          </div>

          <Space direction="vertical" className="w-full" size={16}>
            <Form.Item
              name="start_date"
              label={<Text className="text-sm font-medium">Start Date</Text>}
              rules={[{ required: true, message: 'Please select start date' }]}
              className="mb-0!"
            >
              <DatePicker
                size="large"
                className="w-full"
                format="DD/MM/YYYY"
                suffixIcon={<CalendarOutlined className="text-gray-400" />}
                placeholder="Choose start date"
              />
            </Form.Item>

            <Form.Item
              name="end_date"
              label={<Text className="text-sm font-medium">End Date</Text>}
              rules={[
                { required: true, message: 'Please select end date' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startDate = getFieldValue('start_date')
                    if (!value || !startDate || value.isAfter(startDate)) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('End date must be after start date'))
                  },
                }),
              ]}
              className="mb-0!"
            >
              <DatePicker
                size="large"
                className="w-full"
                format="DD/MM/YYYY"
                suffixIcon={<CalendarOutlined className="text-gray-400" />}
                placeholder="Choose end date"
              />
            </Form.Item>
          </Space>
        </Card>
      </Form>
    </Modal>
  )
}

