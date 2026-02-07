// src/components/modals/OnboardingModal.tsx
'use client'

import { Modal, Form, Input, message, Typography, Card } from 'antd'
import { UserOutlined, SmileOutlined } from '@ant-design/icons'
import { useCreateUserSetting } from '@/hooks/useUserOnboarding'

const { Text, Title } = Typography

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
}

interface FormValues {
  first_name: string
  last_name: string
}

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [form] = Form.useForm<FormValues>()
  const createUserSetting = useCreateUserSetting()

  const handleSubmit = async (values: FormValues) => {
    try {
      await createUserSetting.mutateAsync(values)
      message.success('Welcome! Your profile has been created successfully')
      form.resetFields()
      onComplete()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile'
      message.error(errorMessage)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-linear-to-br from-[#FA6868] to-[#FAAC68] rounded-xl flex items-center justify-center">
            <SmileOutlined className="text-white text-lg" />
          </div>
          <div>
            <Title level={4} className="mb-0!">Welcome to GoChul Fitness!</Title>
            <Text type="secondary" className="text-sm">Let's set up your profile</Text>
          </div>
        </div>
      }
      open={open}
      onOk={() => form.submit()}
      confirmLoading={createUserSetting.isPending}
      width={600}
      closable={false}
      maskClosable={false}
      keyboard={false}
      okText="Get Started"
      cancelButtonProps={{ style: { display: 'none' } }}
      okButtonProps={{
        size: 'large',
        className: 'h-11 min-w-[140px]'
      }}
      styles={{
        header: { padding: '20px 20px 0' },
        body: { padding: '20px' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-2"
      >
        <Card 
          className="mb-4 border-gray-200! shadow-sm" 
          styles={{ body: { padding: '20px' } }}
        >
          <div className="flex items-center gap-2 mb-4">
            <UserOutlined className="text-[#FA6868] text-lg" />
            <Text strong className="text-base">Personal Information</Text>
          </div>

          <Form.Item
            name="first_name"
            label={<Text className="text-sm font-medium">First Name</Text>}
            rules={[
              { required: true, message: 'Please enter your first name' },
              { min: 2, message: 'First name must be at least 2 characters' },
              { max: 50, message: 'First name must not exceed 50 characters' }
            ]}
          >
            <Input
              size="large"
              placeholder="Enter your first name"
              prefix={<UserOutlined className="text-gray-400" />}
              disabled={createUserSetting.isPending}
            />
          </Form.Item>

          <Form.Item
            name="last_name"
            label={<Text className="text-sm font-medium">Last Name</Text>}
            rules={[
              { required: true, message: 'Please enter your last name' },
              { min: 2, message: 'Last name must be at least 2 characters' },
              { max: 50, message: 'Last name must not exceed 50 characters' }
            ]}
            className="mb-0!"
          >
            <Input
              size="large"
              placeholder="Enter your last name"
              prefix={<UserOutlined className="text-gray-400" />}
              disabled={createUserSetting.isPending}
            />
          </Form.Item>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Text className="text-sm text-blue-800">
            <strong>Note:</strong> This information will be used to personalize your experience 
            and help trainers identify you during sessions.
          </Text>
        </div>
      </Form>
    </Modal>
  )
}

