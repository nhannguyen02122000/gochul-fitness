// src/components/modals/CreateContractModal.tsx
'use client'

import { Modal, Form, Select, InputNumber, DatePicker, message } from 'antd'
import { useCreateContract } from '@/hooks/useContracts'
import UserSearchSelect from '@/components/common/UserSearchSelect'
import type { ContractKind } from '@/app/type/api'
import dayjs, { Dayjs } from 'dayjs'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

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
      title="Create New Contract"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={createContract.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Form.Item
          name="purchased_by"
          label="Customer"
          rules={[{ required: true, message: 'Please select a customer' }]}
        >
          <UserSearchSelect placeholder="Search and select customer" />
        </Form.Item>

        <Form.Item
          name="kind"
          label="Contract Type"
          rules={[{ required: true, message: 'Please select contract type' }]}
        >
          <Select
            placeholder="Select contract type"
            onChange={handleKindChange}
            options={[
              { value: 'PT', label: 'Personal Training (with credits)' },
              { value: 'REHAB', label: 'Rehabilitation (with credits)' },
              { value: 'PT_MONTHLY', label: 'PT Monthly (no credits)' }
            ]}
          />
        </Form.Item>

        {selectedKind && selectedKind !== 'PT_MONTHLY' && (
          <Form.Item
            name="credits"
            label="Credits"
            rules={[{ required: true, message: 'Please enter credits' }]}
          >
            <InputNumber
              min={1}
              placeholder="Enter number of credits"
              className="w-full"
            />
          </Form.Item>
        )}

        <Form.Item
          name="money"
          label="Amount (VND)"
          rules={[{ required: true, message: 'Please enter amount' }]}
        >
          <InputNumber
            min={0}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
            placeholder="Enter amount"
            className="w-full"
            addonAfter="VND"
          />
        </Form.Item>

        <Form.Item
          name="start_date"
          label="Start Date"
          rules={[{ required: true, message: 'Please select start date' }]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="end_date"
          label="End Date"
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
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

